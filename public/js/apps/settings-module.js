/**
 * AppSettings Module - Handles user preferences and workspace config
 * Loaded as a separate chunk by the settings page
 */
(function() {
  'use strict';

  var AppSettings = {
    container: null,
    currentSection: 'general',
    unsavedChanges: false,

    init: function(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.renderNav();
      this.handleRouting();
      this.bindGlobalEvents();
    },

    sections: {
      general: { label: 'General', icon: '⚙️' },
      profile: { label: 'Profile', icon: '👤' },
      security: { label: 'Security', icon: '🔒' },
      notifications: { label: 'Notifications', icon: '🔔' },
      integrations: { label: 'Integrations', icon: '🔗' },
      appearance: { label: 'Appearance', icon: '🎨' },
      advanced: { label: 'Advanced', icon: '🔧' }
    },

    renderNav: function() {
      var nav = document.getElementById('settings-nav');
      if (!nav) return;

      var html = '';
      for (var key in this.sections) {
        var s = this.sections[key];
        html += '<a href="#settings/' + key + '" class="settings-nav-item' +
          (key === this.currentSection ? ' active' : '') + '" data-section="' + key + '">' +
          '<span class="nav-icon">' + s.icon + '</span>' + s.label + '</a>';
      }
      nav.innerHTML = html;
    },

    handleRouting: function() {
      var self = this;
      var hash = window.location.hash.substring(1);

      // Parse section from hash
      if (hash.indexOf('settings/') === 0) {
        var section = hash.split('/')[1];
        if (section) {
          var parts = section.split('?');
          this.currentSection = parts[0];

          // Parse inline params
          if (parts[1]) {
            var params = {};
            parts[1].split('&').forEach(function(p) {
              var kv = p.split('=');
              params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
            });
            this.applyParams(params);
          }
        }
      }

      // Check URL query params too
      var urlParams = new URLSearchParams(window.location.search);
      var sectionParam = urlParams.get('section');
      if (sectionParam) this.currentSection = sectionParam;

      this.renderSection(this.currentSection);

      window.addEventListener('hashchange', function() {
        self.handleRouting();
      });
    },

    applyParams: function(params) {
      // Apply theme preview
      if (params.theme) {
        document.body.setAttribute('data-theme', params.theme);
      }
      // Apply custom CSS preview
      if (params.css) {
        var style = document.createElement('style');
        style.id = 'settings-preview-css';
        style.textContent = params.css;
        document.head.appendChild(style);
      }
      // Show import confirmation
      if (params.import) {
        this.showImportConfirmation(params.import);
      }
    },

    showImportConfirmation: function(data) {
      var decoded;
      try {
        decoded = JSON.parse(atob(data));
      } catch(e) {
        try {
          decoded = JSON.parse(data);
        } catch(e2) {
          return;
        }
      }

      if (decoded && decoded.settings) {
        var confirmDiv = document.createElement('div');
        confirmDiv.className = 'settings-import-confirm';
        confirmDiv.innerHTML =
          '<div class="import-header">Import Settings</div>' +
          '<div class="import-body">' +
            '<p>Import ' + Object.keys(decoded.settings).length + ' settings from shared configuration?</p>' +
            '<div class="import-preview">' +
              '<pre>' + JSON.stringify(decoded.settings, null, 2) + '</pre>' +
            '</div>' +
            (decoded.message ? '<div class="import-message">' + decoded.message + '</div>' : '') +
          '</div>' +
          '<div class="import-actions">' +
            '<button onclick="this.closest(\'.settings-import-confirm\').remove()" class="btn-cancel">Cancel</button>' +
            '<button onclick="AppSettings.executeImport(' + "'" + btoa(JSON.stringify(decoded.settings)) + "'" + ')" class="btn-import">Import</button>' +
          '</div>';
        this.container.insertBefore(confirmDiv, this.container.firstChild);
      }
    },

    executeImport: function(encodedSettings) {
      try {
        var settings = JSON.parse(atob(encodedSettings));
        // Apply settings...
        var confirm = document.querySelector('.settings-import-confirm');
        if (confirm) confirm.remove();
        this.showToast('Settings imported successfully', 'success');
      } catch(e) {
        this.showToast('Import failed: ' + e.message, 'error');
      }
    },

    renderSection: function(section) {
      if (!this.container) return;
      var contentArea = document.getElementById('settings-content');
      if (!contentArea) return;

      // Update nav
      var navItems = document.querySelectorAll('.settings-nav-item');
      navItems.forEach(function(item) {
        item.classList.toggle('active', item.dataset.section === section);
      });

      switch(section) {
        case 'general':
          contentArea.innerHTML = this.renderGeneralSection();
          break;
        case 'profile':
          contentArea.innerHTML = this.renderProfileSection();
          break;
        case 'security':
          contentArea.innerHTML = this.renderSecuritySection();
          break;
        case 'appearance':
          contentArea.innerHTML = this.renderAppearanceSection();
          break;
        default:
          contentArea.innerHTML = '<div class="settings-placeholder"><h3>' +
            (this.sections[section] ? this.sections[section].icon + ' ' + this.sections[section].label : section) +
            '</h3><p>Settings for this section will appear here.</p></div>';
      }
    },

    renderGeneralSection: function() {
      return '<h2>General Settings</h2>' +
        '<div class="settings-group">' +
          '<label>Workspace Name</label>' +
          '<input type="text" value="My Workspace" class="settings-input">' +
        '</div>' +
        '<div class="settings-group">' +
          '<label>Language</label>' +
          '<select class="settings-select"><option>English</option><option>Spanish</option><option>French</option></select>' +
        '</div>' +
        '<div class="settings-group">' +
          '<label>Timezone</label>' +
          '<select class="settings-select"><option>UTC</option><option>EST</option><option>PST</option></select>' +
        '</div>' +
        '<button class="btn-save" onclick="AppSettings.showToast(\'Settings saved\', \'success\')">Save Changes</button>';
    },

    renderProfileSection: function() {
      return '<h2>Profile Settings</h2>' +
        '<div class="settings-group">' +
          '<label>Display Name</label>' +
          '<input type="text" value="John Doe" class="settings-input">' +
        '</div>' +
        '<div class="settings-group">' +
          '<label>Email</label>' +
          '<input type="email" value="john@example.com" class="settings-input">' +
        '</div>' +
        '<div class="settings-group">' +
          '<label>Bio</label>' +
          '<textarea class="settings-textarea" rows="3">Software developer</textarea>' +
        '</div>' +
        '<button class="btn-save">Save Changes</button>';
    },

    renderSecuritySection: function() {
      return '<h2>Security Settings</h2>' +
        '<div class="settings-group">' +
          '<label>Two-Factor Authentication</label>' +
          '<div class="settings-toggle"><input type="checkbox"><span>Enable 2FA</span></div>' +
        '</div>' +
        '<div class="settings-group">' +
          '<label>Session Timeout</label>' +
          '<select class="settings-select"><option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>Never</option></select>' +
        '</div>' +
        '<button class="btn-save">Save Changes</button>';
    },

    renderAppearanceSection: function() {
      return '<h2>Appearance</h2>' +
        '<div class="settings-group">' +
          '<label>Theme</label>' +
          '<div class="theme-options">' +
            '<button class="theme-btn" onclick="document.body.setAttribute(\'data-theme\',\'light\')">☀️ Light</button>' +
            '<button class="theme-btn" onclick="document.body.setAttribute(\'data-theme\',\'dark\')">🌙 Dark</button>' +
            '<button class="theme-btn" onclick="document.body.setAttribute(\'data-theme\',\'auto\')">🔄 Auto</button>' +
          '</div>' +
        '</div>' +
        '<button class="btn-save">Save Changes</button>';
    },

    bindGlobalEvents: function() {
      // Listen for cross-tab settings sync
      window.addEventListener('storage', function(e) {
        if (e.key === 'settings-sync' && e.newValue) {
          try {
            var update = JSON.parse(e.newValue);
            if (update.section) {
              AppSettings.renderSection(update.section);
            }
          } catch(e) {}
        }
      });
    },

    showToast: function(msg, type) {
      var toast = document.createElement('div');
      toast.className = 'settings-toast settings-toast-' + (type || 'info');
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 3000);
    }
  };

  window.AppSettings = AppSettings;
})();
