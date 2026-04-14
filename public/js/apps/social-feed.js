/**
 * BuzzBoard Social Feed Component
 * v1.4.0
 */
(function() {
  'use strict';

  var BuzzBoard = {
    feedContainer: null,
    profileContainer: null,
    currentUser: null,

    init: function() {
      this.feedContainer = document.getElementById('bb-feed');
      this.profileContainer = document.getElementById('bb-profile-card');
      this.bindEvents();
      this.loadFeed();
      this.handleDeepLinks();
    },

    bindEvents: function() {
      var self = this;
      var postBtn = document.getElementById('bb-post-btn');
      if (postBtn) {
        postBtn.addEventListener('click', function() {
          var input = document.getElementById('bb-post-input');
          if (input && input.value.trim()) {
            self.createPost(input.value);
            input.value = '';
          }
        });
      }

      var postInput = document.getElementById('bb-post-input');
      if (postInput) {
        postInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            postBtn && postBtn.click();
          }
        });
      }

      // Listen for share events from other components
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'bb:share') {
          self.createPost(e.data.content || '');
        }
      });
    },

    loadFeed: function() {
      if (!this.feedContainer) return;

      var posts = [
        { id: 1, author: 'Sarah Chen', handle: '@sarahc', avatar: 'SC', text: 'Just shipped the new dashboard! 🚀 Check out the improved analytics view.', time: '2h', likes: 14, replies: 3 },
        { id: 2, author: 'Mike Torres', handle: '@miket', avatar: 'MT', text: 'Great team standup today. Love the new sprint planning approach.', time: '4h', likes: 8, replies: 1 },
        { id: 3, author: 'Emma Wilson', handle: '@emmaw', avatar: 'EW', text: 'Wrote a blog post about our migration to microservices. Link in bio!', time: '6h', likes: 22, replies: 5 },
        { id: 4, author: 'Alex Kim', handle: '@alexk', avatar: 'AK', text: 'Anyone using the new API v3? Seeing some weird edge cases with pagination.', time: '8h', likes: 3, replies: 7 },
      ];

      var html = '';
      posts.forEach(function(post) {
        html += BuzzBoard.renderPost(post);
      });
      this.feedContainer.innerHTML = html;
    },

    renderPost: function(post) {
      return '<div class="bb-post" data-id="' + post.id + '">' +
        '<div class="bb-post-header">' +
          '<div class="bb-avatar">' + post.avatar + '</div>' +
          '<div class="bb-post-meta">' +
            '<span class="bb-author">' + this.sanitize(post.author) + '</span>' +
            '<span class="bb-handle">' + this.sanitize(post.handle) + '</span>' +
            '<span class="bb-time">' + post.time + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bb-post-body">' + this.sanitize(post.text) + '</div>' +
        '<div class="bb-post-actions">' +
          '<button onclick="BuzzBoard.likePost(' + post.id + ')">❤️ ' + post.likes + '</button>' +
          '<button onclick="BuzzBoard.replyPost(' + post.id + ')">💬 ' + post.replies + '</button>' +
          '<button onclick="BuzzBoard.sharePost(' + post.id + ')">🔗 Share</button>' +
        '</div>' +
      '</div>';
    },

    createPost: function(text) {
      if (!this.feedContainer) return;
      var post = {
        id: Date.now(),
        author: this.currentUser || 'You',
        handle: '@you',
        avatar: 'YO',
        text: text,
        time: 'now',
        likes: 0,
        replies: 0
      };
      this.feedContainer.insertAdjacentHTML('afterbegin', this.renderPost(post));
    },

    likePost: function(id) {
      var post = document.querySelector('.bb-post[data-id="' + id + '"]');
      if (post) {
        var btn = post.querySelector('.bb-post-actions button:first-child');
        if (btn) {
          var count = parseInt(btn.textContent.match(/\d+/)[0]) + 1;
          btn.textContent = '❤️ ' + count;
        }
      }
    },

    replyPost: function(id) {
      var input = document.getElementById('bb-post-input');
      if (input) {
        input.focus();
        input.placeholder = 'Replying to post #' + id + '...';
      }
    },

    sharePost: function(id) {
      var url = window.location.origin + window.location.pathname + '?shared=' + id;
      navigator.clipboard && navigator.clipboard.writeText(url);
    },

    handleDeepLinks: function() {
      var params = new URLSearchParams(window.location.search);

      // Handle shared post highlight
      var sharedId = params.get('shared');
      if (sharedId) {
        var post = document.querySelector('.bb-post[data-id="' + sharedId + '"]');
        if (post) {
          post.style.borderColor = '#3b82f6';
          post.scrollIntoView({ behavior: 'smooth' });
        }
      }

      // Handle profile card rendering from URL
      var profileParam = params.get('profile');
      if (profileParam && this.profileContainer) {
        this.renderProfileCard(profileParam);
      }

      // Handle bio display from hash
      var hash = window.location.hash.substring(1);
      if (hash) {
        var hashParts = {};
        hash.split('&').forEach(function(p) {
          var kv = p.split('=');
          hashParts[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        });

        if (hashParts.bio && this.profileContainer) {
          this.updateBio(hashParts.bio);
        }

        if (hashParts.announcement) {
          this.showAnnouncement(hashParts.announcement);
        }
      }
    },

    renderProfileCard: function(username) {
      if (!this.profileContainer) return;
      // Fetch profile data
      fetch('/api/user/profile/' + encodeURIComponent(username))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) {
            BuzzBoard.profileContainer.innerHTML = '<div class="bb-profile-error">User not found</div>';
            return;
          }
          BuzzBoard.profileContainer.innerHTML =
            '<div class="bb-profile">' +
              '<div class="bb-profile-avatar">' + (data.username || '?')[0].toUpperCase() + '</div>' +
              '<h3>' + BuzzBoard.sanitize(data.username) + '</h3>' +
              '<p class="bb-profile-email">' + BuzzBoard.sanitize(data.email) + '</p>' +
              '<div class="bb-profile-bio">' + (data.bio || '<em>No bio set</em>') + '</div>' +
              '<div class="bb-profile-role">' + data.role + '</div>' +
            '</div>';
        });
    },

    updateBio: function(bio) {
      var bioEl = this.profileContainer.querySelector('.bb-profile-bio');
      if (bioEl) {
        // VULNERABLE: insertAdjacentHTML with hash-controlled input
        bioEl.insertAdjacentHTML('beforeend', '<div class="bb-bio-update">' + bio + '</div>');
      } else {
        // If profile card hasn't loaded yet, create a temporary display
        var tempDiv = document.createElement('div');
        tempDiv.className = 'bb-bio-preview';
        // VULNERABLE: innerHTML with hash-controlled input
        tempDiv.innerHTML = '<div class="bb-bio-label">Bio Preview</div><div class="bb-bio-text">' + bio + '</div>';
        this.profileContainer.appendChild(tempDiv);
      }
    },

    showAnnouncement: function(msg) {
      var banner = document.createElement('div');
      banner.className = 'bb-announcement';
      banner.textContent = msg; // This one is safe - uses textContent
      if (this.feedContainer) {
        this.feedContainer.parentNode.insertBefore(banner, this.feedContainer);
      }
    },

    // Sanitizer - note it's used in SOME places but not all
    sanitize: function(str) {
      if (!str) return '';
      var map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
      return str.replace(/[&<>"']/g, function(c) { return map[c]; });
    }
  };

  window.BuzzBoard = BuzzBoard;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { BuzzBoard.init(); });
  } else {
    BuzzBoard.init();
  }
})();
