/**
 * TicketFlow - Support Ticket Management
 * v3.2.1 - Build 2026.04.10
 * (c) TicketFlow Inc. All rights reserved.
 */

(function() {
  'use strict';

  var TicketFlow = window.TicketFlow || {};

  // Configuration
  TicketFlow.config = {
    apiBase: '/api/search',
    maxResults: 20,
    debounceMs: 300,
    highlightClass: 'tf-highlight'
  };

  // Utility: safe text escaping for display
  TicketFlow.escapeText = function(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  // Utility: parse URL query parameters
  TicketFlow.getQueryParam = function(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  };

  // Utility: parse hash parameters
  TicketFlow.getHashParam = function(name) {
    var hash = window.location.hash.substring(1);
    var pairs = hash.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var kv = pairs[i].split('=');
      if (decodeURIComponent(kv[0]) === name) {
        return decodeURIComponent(kv[1] || '');
      }
    }
    return null;
  };

  // Template engine for rendering tickets
  TicketFlow.renderTemplate = function(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, function(match, key) {
      return data[key] !== undefined ? data[key] : match;
    });
  };

  // Status badge renderer
  TicketFlow.renderStatus = function(status) {
    var colors = {
      'open': '#22c55e',
      'pending': '#f59e0b',
      'closed': '#64748b',
      'escalated': '#ef4444'
    };
    var color = colors[status] || '#94a3b8';
    return '<span class="tf-status" style="background:' + color + '20;color:' + color + ';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">' + status + '</span>';
  };

  // Priority renderer
  TicketFlow.renderPriority = function(priority) {
    var icons = { 'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢' };
    return (icons[priority] || '⚪') + ' ' + priority;
  };

  // --- SEARCH MODULE ---
  TicketFlow.Search = {
    init: function() {
      var searchInput = document.getElementById('tf-search');
      var self = this;

      if (searchInput) {
        var debounceTimer;
        searchInput.addEventListener('input', function() {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function() {
            self.execute(searchInput.value);
          }, TicketFlow.config.debounceMs);
        });

        searchInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            self.execute(searchInput.value);
          }
        });
      }

      // Check for search query in URL (for shared search links)
      var urlQuery = TicketFlow.getQueryParam('q') || TicketFlow.getHashParam('q');
      if (urlQuery) {
        if (searchInput) searchInput.value = urlQuery;
        this.execute(urlQuery);
      }

      // Check for filter presets in URL
      var filter = TicketFlow.getQueryParam('filter');
      if (filter) {
        this.applyFilter(filter);
      }
    },

    execute: function(query) {
      if (!query || query.trim() === '') {
        this.clearResults();
        return;
      }

      var resultsContainer = document.getElementById('tf-results');
      if (!resultsContainer) return;

      // Show searching state
      resultsContainer.innerHTML = '<div class="tf-loading">Searching tickets...</div>';

      var self = this;
      fetch(TicketFlow.config.apiBase + '?q=' + encodeURIComponent(query))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          self.renderResults(data, query);
        })
        .catch(function(err) {
          resultsContainer.innerHTML = '<div class="tf-error">Search failed: ' + err.message + '</div>';
        });
    },

    renderResults: function(data, query) {
      var container = document.getElementById('tf-results');
      if (!container) return;

      if (!data.results || data.results.length === 0) {
        // VULNERABLE SINK: jQuery .html() with user-controlled query
        // The query flows from URL ?q= param through to here
        $(container).html(
          '<div class="tf-empty">' +
            '<div style="font-size:32px;margin-bottom:12px">🔍</div>' +
            '<h3>No tickets found</h3>' +
            '<p>No results matching "<strong>' + query + '</strong>"</p>' +
            '<p class="tf-muted">Try a different search term or <a href="#" onclick="TicketFlow.Search.clearResults()">clear the search</a></p>' +
          '</div>'
        );
        return;
      }

      var html = '<div class="tf-results-header">' +
        '<span>' + data.results.length + ' results for "<strong>' + TicketFlow.escapeText(query) + '</strong>"</span>' +
        '</div>';

      html += '<div class="tf-ticket-list">';
      data.results.forEach(function(ticket) {
        html += TicketFlow.renderTemplate(
          '<div class="tf-ticket">' +
            '<div class="tf-ticket-title">{{title}}</div>' +
            '<div class="tf-ticket-meta">{{url}}</div>' +
          '</div>',
          { title: TicketFlow.escapeText(ticket.title), url: ticket.url }
        );
      });
      html += '</div>';

      container.innerHTML = html;
    },

    clearResults: function() {
      var container = document.getElementById('tf-results');
      if (container) {
        container.innerHTML = '';
      }
      var searchInput = document.getElementById('tf-search');
      if (searchInput) searchInput.value = '';
    },

    applyFilter: function(filter) {
      var filterBtns = document.querySelectorAll('.tf-filter-btn');
      filterBtns.forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) btn.classList.add('active');
      });
    }
  };

  // --- NOTIFICATION MODULE ---
  TicketFlow.Notify = {
    show: function(message, type) {
      var toast = document.createElement('div');
      toast.className = 'tf-toast tf-toast-' + (type || 'info');
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 4000);
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      TicketFlow.Search.init();
    });
  } else {
    TicketFlow.Search.init();
  }

  window.TicketFlow = TicketFlow;
})();
