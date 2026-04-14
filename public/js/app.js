// === Client-Side Labs - Dashboard Logic ===

const LABS = [
  // --- DOM XSS ---
  { id: 'dom-xss-1', category: 'dom-xss', title: 'The innerHTML Trap', description: 'A search page reflects your query using innerHTML. Inject HTML via the URL hash to pop an alert.', difficulty: 'easy', tags: ['innerHTML', 'hash'], url: '/labs/dom-xss/level1.html' },
  { id: 'dom-xss-2', category: 'dom-xss', title: 'document.write Injection', description: 'A legacy page uses document.write with URL parameters. Escape the context and execute JavaScript.', difficulty: 'easy', tags: ['document.write', 'query param'], url: '/labs/dom-xss/level2.html' },
  { id: 'dom-xss-3', category: 'dom-xss', title: 'jQuery Sink Exploitation', description: 'A jQuery-powered page uses .html() to render user data. The input is "filtered" but the filter is bypassable.', difficulty: 'medium', tags: ['jQuery', '.html()', 'filter bypass'], url: '/labs/dom-xss/level3.html' },
  { id: 'dom-xss-4', category: 'dom-xss', title: 'Template Literal Breakout', description: 'User input flows into a JavaScript template literal that builds HTML. Break out of the template to inject code.', difficulty: 'medium', tags: ['template literal', 'backtick'], url: '/labs/dom-xss/level4.html' },
  { id: 'dom-xss-5', category: 'dom-xss', title: 'DOM Clobbering to XSS', description: 'The page uses a global config object to set a safe URL. Clobber the DOM to override the config and achieve XSS.', difficulty: 'hard', tags: ['DOM clobbering', 'named access'], url: '/labs/dom-xss/level5.html' },

  // --- PostMessage XSS ---
  { id: 'postmsg-1', category: 'postmessage', title: 'No Origin Check', description: 'A widget listens for postMessage events but never checks the origin. Send a malicious message from your attacker page to trigger XSS.', difficulty: 'easy', tags: ['postMessage', 'no validation'], url: '/labs/postmessage/level1.html' },
  { id: 'postmsg-2', category: 'postmessage', title: 'indexOf Origin Bypass', description: 'The page checks origin with indexOf("localhost"). Bypass this weak check from a crafted origin to inject content.', difficulty: 'medium', tags: ['postMessage', 'indexOf', 'origin bypass'], url: '/labs/postmessage/level2.html' },
  { id: 'postmsg-3', category: 'postmessage', title: 'eval() Message Handler', description: 'An internal admin tool receives commands via postMessage and passes them to eval(). Exploit the handler to steal cookies.', difficulty: 'medium', tags: ['postMessage', 'eval', 'RCE'], url: '/labs/postmessage/level3.html' },
  { id: 'postmsg-4', category: 'postmessage', title: 'PostMessage + iframe Sandbox Escape', description: 'A sandboxed iframe communicates with its parent via postMessage. The parent trusts messages from the iframe origin and renders them unsafely. Chain this for XSS on the parent.', difficulty: 'hard', tags: ['postMessage', 'iframe', 'sandbox'], url: '/labs/postmessage/level4.html' },

  // --- Client-Side Path Traversal ---
  { id: 'cspt-1', category: 'cspt', title: 'Basic Path Injection', description: 'A profile page fetches /api/notifications/{userId}. The userId comes from a URL parameter. Traverse the path to access other API endpoints.', difficulty: 'easy', tags: ['CSPT', 'fetch', 'path traversal'], url: '/labs/cspt/level1.html' },
  { id: 'cspt-2', category: 'cspt', title: 'Filter Bypass with Backslash', description: 'The app strips forward slashes from the path parameter but forgets about backslashes. Use backslash traversal to reach sensitive endpoints.', difficulty: 'medium', tags: ['CSPT', 'backslash', 'filter bypass'], url: '/labs/cspt/level2.html' },
  { id: 'cspt-3', category: 'cspt', title: 'Response Injection via Upload', description: 'Chain CSPT with a file upload endpoint. Upload a malicious JSON response, then traverse to it. The app renders the JSON response fields as HTML.', difficulty: 'hard', tags: ['CSPT', 'upload', 'response injection'], url: '/labs/cspt/level3.html' },
  { id: 'cspt-4', category: 'cspt', title: 'CSPT to CSRF (CSPT2CSRF)', description: 'The settings page loads its config via fetch, then auto-submits form data based on the response. Traverse the fetch path to your uploaded JSON, making the victim auto-submit a malicious form that changes their email.', difficulty: 'hard', tags: ['CSPT', 'CSRF', 'chain'], url: '/labs/cspt/level4.html' },

  // --- OAuth Dirty Dancing ---
  { id: 'oauth-1', category: 'oauth', title: 'OAuth Open Redirect Token Leak', description: 'The OAuth flow has a loose redirect_uri validation. Abuse it to redirect the authorization response (with the code) to an attacker-controlled endpoint.', difficulty: 'medium', tags: ['OAuth', 'open redirect', 'token theft'], url: '/labs/oauth/level1.html' },
  { id: 'oauth-2', category: 'oauth', title: 'State Manipulation + PostMessage Gadget', description: 'Break the OAuth flow by sending an invalid state parameter. The error page has a postMessage listener (analytics gadget) that leaks the URL. Use your attacker page to steal the token from the URL fragment.', difficulty: 'hard', tags: ['OAuth', 'dirty dancing', 'postMessage'], url: '/labs/oauth/level2.html' },
  { id: 'oauth-3', category: 'oauth', title: 'Full Dirty Dancing - Response Type Juggling', description: 'Combine response_type switching (code → token), redirect_uri manipulation, and a postMessage gadget to perform a full dirty dancing attack that steals the victim\'s access token.', difficulty: 'expert', tags: ['OAuth', 'dirty dancing', 'response_type', 'chain'], url: '/labs/oauth/level3.html' },

  // --- Advanced Sinks & Gadgets ---
  { id: 'adv-1', category: 'advanced', title: 'Prototype Pollution to XSS', description: 'The page uses a vulnerable URL parameter parser (deparam). Pollute Object.prototype to inject a script gadget that loads attacker JavaScript. Based on a real HubSpot finding.', difficulty: 'hard', tags: ['prototype pollution', 'gadget', 'supply chain'], url: '/labs/advanced/level1.html' },
  { id: 'adv-2', category: 'advanced', title: 'createContextualFragment XSS', description: 'A sanitizer strips script tags and event handlers, then uses createContextualFragment() to insert HTML. This sink re-parses HTML and executes event handlers the sanitizer missed.', difficulty: 'medium', tags: ['createContextualFragment', 'sanitizer bypass'], url: '/labs/advanced/level2.html' },
  { id: 'adv-3', category: 'advanced', title: 'setTimeout String Execution', description: 'Legacy code uses setTimeout with a string argument instead of a function. User input flows into the string, giving you direct code execution through this overlooked sink.', difficulty: 'easy', tags: ['setTimeout', 'string sink', 'legacy'], url: '/labs/advanced/level3.html' },
  { id: 'adv-4', category: 'advanced', title: 'Client-Side Template Injection', description: 'A page uses a client-side template engine that evaluates expressions in {{ }} delimiters. Inject template expressions to break out of the sandbox and execute arbitrary JavaScript.', difficulty: 'hard', tags: ['CSTI', 'template engine', 'sandbox escape'], url: '/labs/advanced/level4.html' },

  // --- CORS & Token Theft ---
  { id: 'cors-1', category: 'cors', title: 'CORS Wildcard with Credentials', description: 'The API reflects any Origin header with Access-Control-Allow-Credentials: true. Exploit this from an attacker page to steal authenticated API data cross-origin.', difficulty: 'medium', tags: ['CORS', 'credentials', 'data theft'], url: '/labs/cors/level1.html' },
  { id: 'cors-2', category: 'cors', title: 'Subdomain Takeover + CORS Chain', description: 'The API trusts *.vuln-app.localhost origins. A subdomain has a dangling CNAME. Claim the subdomain, host your exploit there, and use the trusted origin to steal API data with credentials.', difficulty: 'expert', tags: ['subdomain takeover', 'CORS', 'chain'], url: '/labs/cors/level2.html' },
  { id: 'cors-3', category: 'cors', title: 'postMessage PII Leak via Framing', description: 'A form widget broadcasts submission data via postMessage with targetOrigin="*" and has no X-Frame-Options. Frame the page and intercept the PII data when a user submits the form.', difficulty: 'medium', tags: ['postMessage', 'framing', 'PII leak'], url: '/labs/cors/level3.html' },

  // --- Bug Chains ---
  { id: 'chain-1', category: 'chains', title: 'Self-XSS + CSRF = Stored XSS', description: 'The bio field has XSS but it\'s "self-only" — you can only edit your own profile. However, the profile update has no CSRF protection. Chain: craft a CSRF page that updates the victim\'s bio with your XSS payload.', difficulty: 'hard', tags: ['Self-XSS', 'CSRF', 'chain', 'stored XSS'], url: '/labs/chains/level1.html' },
  { id: 'chain-2', category: 'chains', title: 'DOM XSS + CSRF = Account Takeover', description: 'The search page has DOM XSS, and the email change endpoint has no CSRF token. Chain: exploit the DOM XSS to make a fetch() call that changes the victim\'s email to yours, achieving ATO.', difficulty: 'hard', tags: ['DOM XSS', 'CSRF', 'ATO', 'chain'], url: '/labs/chains/level2.html' },
  { id: 'chain-3', category: 'chains', title: 'PostMessage + OAuth Token Theft = ATO', description: 'Combine the OAuth dirty dancing technique with a postMessage listener that leaks the URL. Steal the access token, then use it to change the victim\'s email and password. Full ATO chain.', difficulty: 'expert', tags: ['postMessage', 'OAuth', 'ATO', 'full chain'], url: '/labs/chains/level3.html' },
  { id: 'chain-4', category: 'chains', title: 'The Grand Chain: CSPT + PostMessage + OAuth = ATO', description: 'The ultimate challenge. A CSPT vulnerability lets you inject a response that triggers a postMessage to the parent. The parent uses this to initiate an OAuth flow with a manipulated redirect. Chain all three to steal the token and take over the account.', difficulty: 'expert', tags: ['CSPT', 'postMessage', 'OAuth', 'ATO', 'mega chain'], url: '/labs/chains/level4.html' },
  { id: 'chain-5', category: 'chains', title: 'Prototype Pollution + DOM XSS', description: 'Pollute Object.prototype via URL params to override a config property. The polluted property flows into an innerHTML sink via a gadget function. Chain PP into DOM XSS for code execution.', difficulty: 'expert', tags: ['prototype pollution', 'DOM XSS', 'gadget chain'], url: '/labs/chains/level5.html' },
  { id: 'chain-6', category: 'chains', title: 'CORS + XSS = Session Hijack', description: 'Find XSS on a subdomain, then use it to make a credentialed CORS request to the main API (which trusts *.app origins). Steal the victim\'s session token and private data in one chain.', difficulty: 'hard', tags: ['CORS', 'XSS', 'session hijack', 'chain'], url: '/labs/chains/level6.html' },
  { id: 'chain-7', category: 'chains', title: 'Open Redirect + OAuth + CSRF = ATO', description: 'Chain an open redirect to steal an OAuth authorization code. Use the code to get a session, then CSRF the email change endpoint. Three bugs, one devastating account takeover.', difficulty: 'expert', tags: ['open redirect', 'OAuth', 'CSRF', 'ATO', 'triple chain'], url: '/labs/chains/level7.html' },

  // --- Capstone Challenges (no hints, realistic apps) ---
  { id: 'cap-1', category: 'capstone', title: 'ShopEZ', description: 'A realistic e-commerce storefront. Something is off with the product search. Find it, exploit it.', difficulty: 'medium', tags: ['capstone', 'real app'], url: '/labs/capstone/capstone1.html' },
  { id: 'cap-2', category: 'capstone', title: 'ChatConnect', description: 'A customer support page with a live chat widget. The widget talks to the parent page. Can you make it say something it shouldn\'t?', difficulty: 'medium', tags: ['capstone', 'real app'], url: '/labs/capstone/capstone2.html' },
  { id: 'cap-3', category: 'capstone', title: 'DevPortal', description: 'A developer API dashboard that loads your settings dynamically. Where does the data come from? Can you control it?', difficulty: 'hard', tags: ['capstone', 'real app'], url: '/labs/capstone/capstone3.html' },
  { id: 'cap-4', category: 'capstone', title: 'SecureAuth', description: 'An app that uses OAuth for login. The auth flow looks standard. Look closer at the redirect.', difficulty: 'hard', tags: ['capstone', 'real app'], url: '/labs/capstone/capstone4.html' },
  { id: 'cap-5', category: 'capstone', title: 'SocialHub', description: 'A social network with profiles, search, and settings. Multiple bugs hide in plain sight. Chain them for account takeover.', difficulty: 'expert', tags: ['capstone', 'chain', 'ATO'], url: '/labs/capstone/capstone5.html' },
  { id: 'cap-6', category: 'capstone', title: 'FinanceApp', description: 'A banking dashboard with account info and transfers. The most realistic challenge. Find the bugs, chain them, steal funds.', difficulty: 'expert', tags: ['capstone', 'chain', 'ATO'], url: '/labs/capstone/capstone6.html' },

  // --- Real-World Labs (inspired by published writeups, no hand-holding) ---
  { id: 'rw-window-hijack', category: 'realworld', title: 'WorkHub: window.open Target Hijacking', description: 'A SaaS addon marketplace uses a predictable window.open target name for OAuth popups. Hijack the browsing context to force-link a malicious addon to the victim\'s workspace.', difficulty: 'hard', tags: ['window.open', 'OAuth', 'popup hijack', 'CTBB'], url: '/labs/realworld/window-open-hijack.html' },
  { id: 'rw-cspt-delete', category: 'realworld', title: 'SecureVault: CSPT in DELETE Requests', description: 'A session management page builds DELETE fetch URLs from user input. Traverse the path to hit destructive endpoints — delete accounts, initiate transfers. Read the JS, find the source, exploit the sink.', difficulty: 'hard', tags: ['CSPT', 'DELETE', 'path traversal', 'Deepstrike'], url: '/labs/realworld/cspt-delete.html' },
  { id: 'rw-postmsg-iframe', category: 'realworld', title: 'CloudDocs: PostMessage Iframe Injection', description: 'A document platform creates floating widget panels from postMessage data. The handler builds iframes via string concatenation with no origin check and no sanitization. Break out of the attribute to achieve XSS.', difficulty: 'hard', tags: ['postMessage', 'iframe injection', 'attribute breakout'], url: '/labs/realworld/postmessage-iframe-xss.html' },
  { id: 'rw-dom-xss-hunt', category: 'realworld', title: 'Metrica: DOM XSS Source-to-Sink Hunt', description: 'A realistic analytics dashboard with deep-link support, widget configuration, and search. Multiple sources and sinks hide in the JavaScript. Read the code, trace the data flow, find the DOM XSS. No hints.', difficulty: 'expert', tags: ['DOM XSS', 'source analysis', 'hash params', 'real JS audit'], url: '/labs/realworld/dom-xss-hunt.html' },

  // --- XSS Hunt: Source-to-Sink Training (separate JS files, minified code, diverse sinks) ---
  { id: 'xss-hunt-1', category: 'xss-hunt', title: 'TicketFlow: jQuery .html() Sink', description: 'A support ticket app loads its search logic from an external JS file. The search query from the URL flows into a jQuery .html() call. Read ticket-app.js, find the source, trace to the sink.', difficulty: 'medium', tags: ['jQuery', '.html()', 'external JS', 'URL param'], url: '/labs/xss-hunt/hunt1-jquery-sink.html' },
  { id: 'xss-hunt-2', category: 'xss-hunt', title: 'CoreDash: Minified JS - 4 Sinks', description: 'An enterprise dashboard loads a MINIFIED JS framework. Beautify it, then find all 4 XSS sinks: Notification.showRich (innerHTML), Widget.renderFromURL (innerHTML), Banner.show (innerHTML), and a postMessage eval() handler. Multiple URL param sources.', difficulty: 'hard', tags: ['minified', 'innerHTML', 'eval', 'postMessage', '4 sinks'], url: '/labs/xss-hunt/hunt2-minified-sinks.html' },
  { id: 'xss-hunt-3', category: 'xss-hunt', title: 'BuzzBoard: insertAdjacentHTML Sink', description: 'A social feed app has a sanitize() function used in most places — but not all. Find where unsanitized hash fragment data reaches insertAdjacentHTML in the bio update flow. The safe patterns are a red herring.', difficulty: 'medium', tags: ['insertAdjacentHTML', 'hash fragment', 'partial sanitization', 'social feed'], url: '/labs/xss-hunt/hunt3-insertadjacenthtml.html' },
  { id: 'xss-hunt-4', category: 'xss-hunt', title: 'HelpDesk: Minified SDK - 5 Vectors', description: 'A help center loads EmbedKit — a minified third-party SDK (embed-sdk.min.js). Beautify and audit it. 5 different XSS vectors: banner innerHTML, tooltip html:true, createContextualFragment via postMessage, eval via postMessage, and location.href navigation.', difficulty: 'expert', tags: ['minified SDK', 'createContextualFragment', 'eval', 'tooltip', '5 vectors'], url: '/labs/xss-hunt/hunt4-minified-sdk.html' },
  { id: 'xss-hunt-5', category: 'xss-hunt', title: 'WorkOS: Settings Import innerHTML', description: 'A workspace settings page supports importing config from shared URLs via base64-encoded JSON. The import confirmation dialog renders a "message" field from the decoded JSON via innerHTML. Craft a malicious import URL.', difficulty: 'hard', tags: ['base64', 'JSON decode', 'innerHTML', 'settings import', 'hash params'], url: '/labs/xss-hunt/hunt5-settings-import.html' },
  { id: 'xss-hunt-6', category: 'xss-hunt', title: 'NexaApp: Multi-Module - 3+ Sinks', description: 'FINAL BOSS. Three JS modules on one page, each with different sinks. Module 1: jQuery .html() in search. Module 2: insertAdjacentHTML in profile bio via hash. Module 3: innerHTML + new Function() via postMessage and URL widgets. Find at least 3 distinct XSS vectors.', difficulty: 'expert', tags: ['multi-module', 'jQuery', 'insertAdjacentHTML', 'postMessage', 'new Function', 'final boss'], url: '/labs/xss-hunt/hunt6-multi-module.html' }
];

const CATEGORIES = {
  'dom-xss': { name: 'DOM XSS', icon: '&#9889;', description: 'Master DOM-based Cross-Site Scripting — innerHTML, document.write, eval, jQuery sinks, and DOM clobbering' },
  'postmessage': { name: 'PostMessage XSS', icon: '&#9993;', description: 'Exploit insecure postMessage handlers — missing origin checks, eval sinks, and iframe communication' },
  'cspt': { name: 'Client-Side Path Traversal', icon: '&#128194;', description: 'Manipulate client-side fetch paths — CSPT basics, filter bypasses, response injection, and CSPT2CSRF' },
  'oauth': { name: 'OAuth Dirty Dancing', icon: '&#128274;', description: 'Abuse OAuth flows — redirect manipulation, state attacks, response_type juggling, and token theft' },
  'advanced': { name: 'Advanced Sinks & Gadgets', icon: '&#128161;', description: 'Prototype pollution, createContextualFragment, setTimeout strings, and client-side template injection' },
  'cors': { name: 'CORS & Token Theft', icon: '&#127760;', description: 'Exploit CORS misconfigurations, subdomain takeover chains, and postMessage PII leaks via framing' },
  'chains': { name: 'Bug Chains', icon: '&#128279;', description: 'Chain multiple vulnerabilities into high-impact attacks — from Self-XSS+CSRF to full account takeover mega chains' },
  'capstone': { name: 'Capstone Challenges', icon: '&#127942;', description: 'Realistic apps with no hand-holding. Find the source, find the sink, prove the impact. Just like a real bug bounty target.' },
  'realworld': { name: 'Real-World Writeup Labs', icon: '&#128240;', description: 'Realistic apps inspired by published bug bounty writeups. No sidebars, no hints visible — you read the JS, find the bug, prove the impact. Just like hunting on a real target.' },
  'xss-hunt': { name: 'XSS Hunt: Source → Sink', icon: '&#128270;', description: 'Read real JavaScript files. Find the source. Trace the data flow. Reach the sink. External JS files, minified bundles, jQuery, insertAdjacentHTML, createContextualFragment, eval, postMessage — every sink you\'ll see in the wild.' }
};

// --- Progress Management ---
function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('labProgress') || '{}');
  } catch { return {}; }
}

function markSolved(labId) {
  const progress = getProgress();
  progress[labId] = { solvedAt: Date.now() };
  localStorage.setItem('labProgress', JSON.stringify(progress));
  // Also notify server
  fetch('/api/labs/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labId })
  }).catch(() => {});
}

function isSolved(labId) {
  return !!getProgress()[labId];
}

function getSolvedCount() {
  return Object.keys(getProgress()).length;
}

function resetProgress() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    localStorage.removeItem('labProgress');
    renderDashboard();
  }
}

// --- Render Dashboard ---
function renderDashboard() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const activeTab = document.querySelector('.tab.active')?.dataset?.category || 'all';
  const solvedCount = getSolvedCount();
  const totalCount = LABS.length;

  // Update stats
  const solvedEl = document.getElementById('stat-solved');
  const totalEl = document.getElementById('stat-total');
  const pctEl = document.getElementById('stat-pct');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if (solvedEl) solvedEl.textContent = solvedCount;
  if (totalEl) totalEl.textContent = totalCount;
  if (pctEl) pctEl.textContent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) + '%' : '0%';
  if (progressFill) progressFill.style.width = (totalCount > 0 ? (solvedCount / totalCount) * 100 : 0) + '%';
  if (progressText) progressText.textContent = `${solvedCount} / ${totalCount} labs completed`;

  let html = '';

  const categoriesToShow = activeTab === 'all' ? Object.keys(CATEGORIES) : [activeTab];

  for (const catId of categoriesToShow) {
    const cat = CATEGORIES[catId];
    const catLabs = LABS.filter(l => l.category === catId);
    const catSolved = catLabs.filter(l => isSolved(l.id)).length;

    html += `
      <div class="category">
        <div class="category-header">
          <div class="category-title">${cat.icon} ${cat.name}</div>
          <div class="category-progress">${catSolved} / ${catLabs.length} solved</div>
        </div>
        <p class="category-desc">${cat.description}</p>
        <div class="lab-grid">
          ${catLabs.map((lab, i) => renderLabCard(lab, i + 1)).join('')}
        </div>
      </div>
    `;
  }

  main.innerHTML = html;
}

function renderLabCard(lab, num) {
  const solved = isSolved(lab.id);
  const isCapstone = lab.category === 'capstone';
  return `
    <div class="lab-card ${solved ? 'solved' : ''} ${isCapstone ? 'capstone-card' : ''}" onclick="window.location.href='${lab.url}'">
      <div class="lab-header">
        <div class="lab-number">#${String(num).padStart(2, '0')}</div>
        <span class="difficulty ${lab.difficulty}">${lab.difficulty}</span>
      </div>
      <div class="lab-title">${lab.title}</div>
      <div class="lab-description">${lab.description}</div>
      <div class="lab-footer">
        <div class="lab-tags">
          ${lab.tags.map(t => `<span class="tag ${t.includes('chain') || t.includes('ATO') ? 'chain' : ''} ${t.includes('OAuth') ? 'oauth' : ''}">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- Tab switching ---
function setActiveTab(category) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-category="${category}"]`)?.classList.add('active');
  renderDashboard();
}

// --- Lab page helpers ---
function setupLabVerification(labId, triggerType) {
  // Hook alert() to detect XSS
  if (triggerType === 'xss') {
    const originalAlert = window.alert;
    window.alert = function(msg) {
      originalAlert.call(window, msg);
      if (msg && (msg.toString().includes('XSS') || msg.toString().includes('1') || msg.toString().includes('document.domain') || msg.toString().includes('cookie'))) {
        solveLab(labId);
      }
    };
  }
}

function solveLab(labId) {
  markSolved(labId);
  const banner = document.getElementById('solve-banner');
  if (banner) {
    banner.classList.add('show');
    banner.innerHTML = `<h3>Lab Solved!</h3><p>Great work! You've exploited this vulnerability successfully.</p><a href="/dashboard" class="btn btn-success" style="margin-top:8px;display:inline-block">Back to Dashboard</a>`;
  }
  // Notify server
  fetch('/api/labs/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labId })
  }).catch(() => {});
}

// Hint toggling
function toggleHint(el) {
  const content = el.nextElementSibling;
  if (content.classList.contains('show')) {
    content.classList.remove('show');
    el.classList.remove('revealed');
  } else {
    content.classList.add('show');
    el.classList.add('revealed');
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('main-content')) {
    renderDashboard();
  }
});
