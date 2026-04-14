const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'lab-secret-key-do-not-use-in-prod',
  resave: false,
  saveUninitialized: true,
  cookie: { sameSite: 'lax' }
}));

// --- In-memory stores ---
const users = {
  'victim': { id: 1, username: 'victim', password: 'password123', email: 'victim@example.com', role: 'user', bio: '', avatar: '/img/default.png' },
  'admin': { id: 2, username: 'admin', password: 'admin123', email: 'admin@corp.com', role: 'admin', bio: 'System administrator', avatar: '/img/admin.png' },
  'attacker': { id: 3, username: 'attacker', password: 'hack3r', email: 'attacker@evil.com', role: 'user', bio: '', avatar: '/img/default.png' }
};

const oauthClients = {
  'vuln-app': { client_id: 'vuln-app', client_secret: 'secret123', redirect_uris: ['http://localhost:3000/oauth/callback', 'http://localhost:3000/labs/oauth/callback'], name: 'Vulnerable App' },
  'legit-app': { client_id: 'legit-app', client_secret: 'legit-secret', redirect_uris: ['http://localhost:3000/oauth/callback'], name: 'Legit App' }
};

const oauthCodes = {};
const oauthTokens = {};
const messages = [];
const notifications = [];
const posts = [];
const csrfActions = [];
const solvedLabs = {};

// --- CORS: intentionally misconfigured for labs ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (req.path.startsWith('/api/')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// --- Page Routes (before static to take priority) ---
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/writeups', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'writeups', 'index.html'));
});

app.get('/writeups/:slug', (req, res) => {
  const slug = req.params.slug.replace(/[^a-z0-9-]/g, '');
  const filePath = path.join(__dirname, 'public', 'writeups', slug + '.html');
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('Writeup not found');
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Auth middleware ---
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// --- Auth Routes ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// --- User Profile API (vulnerable for various labs) ---
app.get('/api/user/profile/:username', (req, res) => {
  const user = users[req.params.username];
  if (user) {
    res.json({ id: user.id, username: user.username, email: user.email, bio: user.bio, role: user.role, avatar: user.avatar });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// VULNERABLE: No CSRF token check on profile update
app.post('/api/user/profile/update', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const user = users[username];
  if (req.body.email) user.email = req.body.email;
  if (req.body.bio) user.bio = req.body.bio;
  if (req.body.avatar) user.avatar = req.body.avatar;
  csrfActions.push({ action: 'profile_update', user: username, data: req.body, time: Date.now() });
  res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, bio: user.bio } });
});

// VULNERABLE: Email change without password confirmation
app.post('/api/user/change-email', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const user = users[username];
  if (req.body.email) {
    user.email = req.body.email;
    req.session.user.email = req.body.email;
    csrfActions.push({ action: 'email_change', user: username, newEmail: req.body.email, time: Date.now() });
    res.json({ success: true, message: 'Email updated', email: user.email });
  } else {
    res.status(400).json({ error: 'Email required' });
  }
});

// VULNERABLE: Password change without old password
app.post('/api/user/change-password', requireAuth, (req, res) => {
  const username = req.session.user.username;
  const user = users[username];
  if (req.body.newPassword) {
    user.password = req.body.newPassword;
    csrfActions.push({ action: 'password_change', user: username, time: Date.now() });
    res.json({ success: true, message: 'Password changed' });
  } else {
    res.status(400).json({ error: 'New password required' });
  }
});

// --- Posts / Comments (for Stored XSS labs) ---
app.get('/api/posts', (req, res) => {
  res.json(posts);
});

app.post('/api/posts', requireAuth, (req, res) => {
  const post = {
    id: posts.length + 1,
    author: req.session.user.username,
    title: req.body.title || '',
    content: req.body.content || '',
    comments: [],
    createdAt: Date.now()
  };
  posts.push(post);
  res.json(post);
});

app.post('/api/posts/:id/comment', requireAuth, (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comment = {
    id: post.comments.length + 1,
    author: req.session.user.username,
    content: req.body.content || '',
    createdAt: Date.now()
  };
  post.comments.push(comment);
  res.json(comment);
});

// --- Notifications API (for CSPT labs) ---
app.get('/api/notifications/:userId', (req, res) => {
  const userId = req.params.userId;
  res.json({
    userId: userId,
    notifications: [
      { id: 1, text: 'Welcome to the platform!', read: false },
      { id: 2, text: 'Your profile was viewed 5 times', read: false },
      { id: 3, text: `Secret admin token: FLAG{cspt_level1_${userId}}`, read: false }
    ]
  });
});

// --- Settings API (for CSPT2CSRF) ---
app.get('/api/settings/:section', (req, res) => {
  const section = req.params.section;
  res.json({
    section: section,
    data: {
      theme: 'dark',
      language: 'en',
      notifications: true
    }
  });
});

app.post('/api/settings/update', requireAuth, (req, res) => {
  csrfActions.push({ action: 'settings_update', user: req.session.user.username, data: req.body, time: Date.now() });
  res.json({ success: true, message: 'Settings updated' });
});

// CSPT target: endpoint that accepts JSON body and performs action
app.post('/api/account/delete', requireAuth, (req, res) => {
  csrfActions.push({ action: 'account_delete', user: req.session.user.username, time: Date.now() });
  res.json({ success: true, message: `Account ${req.session.user.username} scheduled for deletion` });
});

app.post('/api/account/transfer', requireAuth, (req, res) => {
  csrfActions.push({ action: 'transfer', user: req.session.user.username, to: req.body.to, amount: req.body.amount, time: Date.now() });
  res.json({ success: true, message: `Transfer of $${req.body.amount} to ${req.body.to} initiated` });
});

// --- File upload simulation (for CSPT response injection) ---
const uploadedFiles = {};
app.post('/api/upload', (req, res) => {
  const fileId = crypto.randomBytes(8).toString('hex');
  uploadedFiles[fileId] = {
    content: req.body.content || '{}',
    contentType: req.body.contentType || 'application/json'
  };
  res.json({ success: true, fileId: fileId, url: `/api/files/${fileId}` });
});

app.get('/api/files/:fileId', (req, res) => {
  const file = uploadedFiles[req.params.fileId];
  if (file) {
    res.setHeader('Content-Type', file.contentType);
    res.send(file.content);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// --- Widget API (returns HTML, for DOM XSS sinks) ---
app.get('/api/widget/render', (req, res) => {
  // Intentionally reflects parameters in response
  const title = req.query.title || 'Widget';
  const theme = req.query.theme || 'light';
  res.json({
    html: `<div class="widget widget-${theme}"><h3>${title}</h3><p>Widget content here</p></div>`,
    config: { title, theme }
  });
});

// --- Search API (reflects input) ---
app.get('/api/search', (req, res) => {
  const q = req.query.q || '';
  res.json({
    query: q,
    results: [
      { title: `Result for: ${q}`, url: '#' },
      { title: 'Example result 2', url: '#' }
    ],
    html: `<p>Showing results for: <strong>${q}</strong></p>`
  });
});

// --- OAuth Provider (simulated, intentionally vulnerable) ---
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state, scope } = req.query;
  const client = oauthClients[client_id];

  // Lab-specific: Weak redirect_uri validation
  let redirectValid = false;
  if (client) {
    // VULNERABLE: Only checks if redirect_uri STARTS with a registered one
    redirectValid = client.redirect_uris.some(uri => redirect_uri && redirect_uri.startsWith(uri.split('?')[0].split('#')[0]));
    // Also allow if it contains the registered domain (even weaker)
    if (!redirectValid) {
      redirectValid = client.redirect_uris.some(uri => {
        const domain = new URL(uri).hostname;
        return redirect_uri && redirect_uri.includes(domain);
      });
    }
  }

  if (!client) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>Error: Unknown client</h2>
        <p>Client ID "${client_id}" is not registered.</p>
      </body></html>
    `);
  }

  // Show consent screen
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>OAuth Login - Authorize</title>
    <style>
      body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { background: #1e293b; border-radius: 12px; padding: 40px; max-width: 400px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
      h2 { color: #60a5fa; margin-top: 0; }
      .app-name { color: #f59e0b; font-weight: bold; }
      button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; width: 100%; margin-top: 10px; }
      button:hover { background: #2563eb; }
      button.deny { background: #6b7280; }
      input { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0; box-sizing: border-box; }
      .scope { background: #0f172a; padding: 10px; border-radius: 6px; margin: 10px 0; }
    </style>
    </head>
    <body>
      <div class="card">
        <h2>Sign In</h2>
        <p><span class="app-name">${client.name}</span> wants to access your account</p>
        <div class="scope">
          <p>This app will be able to:</p>
          <ul>
            <li>Read your profile information</li>
            <li>Access your email address</li>
            ${scope && scope.includes('write') ? '<li>Modify your account settings</li>' : ''}
          </ul>
        </div>
        <form method="POST" action="/oauth/authorize">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri || ''}">
          <input type="hidden" name="response_type" value="${response_type || 'code'}">
          <input type="hidden" name="state" value="${state || ''}">
          <input type="hidden" name="scope" value="${scope || 'read'}">
          <label>Username:</label>
          <input type="text" name="username" value="victim" required>
          <label>Password:</label>
          <input type="password" name="password" value="password123" required>
          <button type="submit">Authorize & Sign In</button>
          <button type="button" class="deny" onclick="window.close()">Deny</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state, scope, username, password } = req.body;
  const user = users[username];

  if (!user || user.password !== password) {
    return res.status(401).send('<html><body><h2>Invalid credentials</h2></body></html>');
  }

  const code = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');

  oauthCodes[code] = { user: username, client_id, scope, createdAt: Date.now() };
  oauthTokens[token] = { user: username, client_id, scope, createdAt: Date.now() };

  req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };

  let redirectTo = redirect_uri || '/oauth/callback';

  if (response_type === 'token' || response_type === 'code,token' || response_type === 'token,code') {
    // Implicit flow - token in fragment (vulnerable)
    redirectTo += `#access_token=${token}&token_type=bearer&state=${state || ''}`;
  } else if (response_type === 'code,id_token') {
    // Hybrid flow - code in query, token in fragment
    redirectTo += `?code=${code}&state=${state || ''}#id_token=${token}`;
  } else {
    // Auth code flow
    redirectTo += `?code=${code}&state=${state || ''}`;
  }

  // VULNERABLE: No strict redirect_uri validation on response
  res.redirect(redirectTo);
});

app.post('/oauth/token', (req, res) => {
  const { code, client_id, client_secret, grant_type } = req.body;
  if (grant_type === 'authorization_code' && oauthCodes[code]) {
    const codeData = oauthCodes[code];
    delete oauthCodes[code];
    const token = crypto.randomBytes(32).toString('hex');
    oauthTokens[token] = { user: codeData.user, client_id, scope: codeData.scope, createdAt: Date.now() };
    res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, scope: codeData.scope });
  } else {
    res.status(400).json({ error: 'invalid_grant' });
  }
});

app.get('/oauth/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.replace('Bearer ', '');
  const tokenData = oauthTokens[token];
  if (!tokenData) return res.status(401).json({ error: 'Invalid token' });
  const user = users[tokenData.user];
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
});

// OAuth callback (legitimate)
app.get('/oauth/callback', (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    // VULNERABLE: Error page still has token in URL, 3rd party scripts can read it
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title>
      <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
      <script>
        // Analytics script that leaks location (simulated gadget)
        window.__analytics = { pageUrl: window.location.href };
        window.addEventListener('message', function(e) {
          if (e.data.type === 'getAnalytics') {
            e.source.postMessage({ type: 'analyticsData', url: window.__analytics.pageUrl }, '*');
          }
        });
      </script>
      </head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#e2e8f0">
        <h2>Authentication Error</h2>
        <p>State validation failed. Please try again.</p>
        <p style="color:#666">Error: ${error}</p>
        <a href="/" style="color:#60a5fa">Return to app</a>
      </body>
      </html>
    `);
  }
  if (code) {
    res.send(`
      <html><head><title>Login Success</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#e2e8f0">
        <h2>Login Successful!</h2>
        <p>Authorization code: <code>${code}</code></p>
        <p>Exchanging for token...</p>
        <script>
          // Exchange code for token
          fetch('/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '${code}', client_id: 'vuln-app', client_secret: 'secret123', grant_type: 'authorization_code' })
          })
          .then(r => r.json())
          .then(data => {
            document.body.innerHTML += '<p>Token received: <code>' + data.access_token.substring(0,16) + '...</code></p>';
            document.body.innerHTML += '<p style="color:#22c55e">You are now logged in!</p>';
            document.body.innerHTML += '<a href="/" style="color:#60a5fa">Go to Dashboard</a>';
          });
        </script>
      </body></html>
    `);
  }
});

// --- Lab Verification API ---
app.post('/api/labs/solve', (req, res) => {
  const { labId, flag } = req.body;
  if (!labId) return res.status(400).json({ error: 'labId required' });
  if (!solvedLabs[req.sessionID]) solvedLabs[req.sessionID] = {};
  solvedLabs[req.sessionID][labId] = { solvedAt: Date.now(), flag };
  res.json({ success: true, labId, message: 'Lab solved!' });
});

app.get('/api/labs/progress', (req, res) => {
  res.json(solvedLabs[req.sessionID] || {});
});

// --- CSRF Actions Log (for verification) ---
app.get('/api/csrf-log', (req, res) => {
  res.json(csrfActions.slice(-20));
});

// --- PostMessage relay endpoint (simulates a widget/3rd party) ---
app.get('/api/widget/config', (req, res) => {
  const callback = req.query.callback;
  if (callback) {
    // JSONP endpoint (vulnerable)
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`${callback}({"widget":"config","version":"1.0","apiKey":"sk_test_1234567890"})`);
  } else {
    res.json({ widget: 'config', version: '1.0' });
  }
});

// --- Redirect endpoint (for chain labs) ---
app.get('/redirect', (req, res) => {
  const url = req.query.url || req.query.next || req.query.return || '/';
  // VULNERABLE: Open redirect
  res.redirect(url);
});

// --- SSO/SAML simulation endpoint ---
app.get('/sso/login', (req, res) => {
  const returnUrl = req.query.return_url || '/';
  const token = crypto.randomBytes(16).toString('hex');
  // VULNERABLE: reflects return_url without validation
  res.send(`
    <html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;text-align:center;padding:50px">
      <h2>SSO Login</h2>
      <p>Authenticating...</p>
      <script>
        setTimeout(function() {
          window.location = "${returnUrl}" + (("${returnUrl}").includes('?') ? '&' : '?') + "sso_token=${token}";
        }, 1000);
      </script>
    </body></html>
  `);
});

// --- CORS Lab: Vulnerable API that reflects origin ---
app.get('/api/cors-demo/secrets', (req, res) => {
  const origin = req.headers.origin;
  // VULNERABLE: reflects any origin with credentials
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.session && req.session.user) {
    res.json({
      user: req.session.user,
      apiKey: 'sk_live_51HG3jKL2eZvKYlo2C0g8R7yQ',
      internalNotes: 'Account flagged for review - balance: $42,391.00',
      ssn_last4: '7291',
      sessions: [{ token: 'sess_' + crypto.randomBytes(16).toString('hex'), ip: '192.168.1.42' }]
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// --- CORS Lab: Subdomain-based origin trust ---
app.get('/api/cors-demo/subdomain-data', (req, res) => {
  const origin = req.headers.origin || '';
  // VULNERABLE: trusts any subdomain via regex
  if (/^https?:\/\/([a-z0-9-]+\.)*localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.json({
    message: 'Trusted subdomain data',
    secret: 'FLAG{cors_subdomain_chain}',
    user: req.session?.user || null
  });
});

// --- PII Form endpoint for postMessage framing lab ---
app.get('/api/form-widget', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><style>
  body { font-family: sans-serif; padding: 20px; background: #f8fafc; }
  input, button { display: block; width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #e2e8f0; border-radius: 6px; }
  button { background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600; }
  h3 { color: #1e293b; }
</style></head>
<body>
  <h3>Contact Information</h3>
  <form id="piiForm">
    <input name="fullName" placeholder="Full Name" value="John Doe">
    <input name="email" placeholder="Email" value="john.doe@company.com">
    <input name="phone" placeholder="Phone" value="+1-555-0123">
    <input name="ssn" placeholder="SSN" value="123-45-6789">
    <button type="submit">Submit</button>
  </form>
  <script>
    document.getElementById('piiForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var data = {};
      new FormData(this).forEach(function(v, k) { data[k] = v; });
      // VULNERABLE: broadcasts PII to ANY parent with wildcard origin
      window.parent.postMessage({ type: 'formSubmission', data: data }, '*');
      this.innerHTML = '<p style="color:green">Submitted!</p>';
    });
    // Also announce readiness
    window.parent.postMessage({ type: 'widgetReady' }, '*');
  </script>
</body></html>`);
});

// --- Template engine simulation for CSTI lab ---
app.get('/api/template/render', (req, res) => {
  const template = req.query.tpl || 'Hello, {{name}}!';
  const name = req.query.name || 'Guest';
  res.json({ template, name, rendered: template.replace(/\{\{name\}\}/g, name) });
});

// --- Prototype pollution test endpoint ---
app.get('/api/config/defaults', (req, res) => {
  res.json({
    theme: 'light',
    lang: 'en',
    debug: false,
    scriptSrc: '/js/analytics-safe.js'
  });
});

// --- Capstone: ShopEZ product search API ---
const products = [
  { id: 1, name: 'Wireless Headphones Pro', price: 79.99, rating: 4.5, reviews: 128, category: 'Electronics', image: '🎧' },
  { id: 2, name: 'Ergonomic Office Chair', price: 349.00, rating: 4.8, reviews: 64, category: 'Furniture', image: '🪑' },
  { id: 3, name: 'Smart Water Bottle', price: 24.99, rating: 4.2, reviews: 312, category: 'Fitness', image: '🧴' },
  { id: 4, name: 'Mechanical Keyboard RGB', price: 129.99, rating: 4.7, reviews: 89, category: 'Electronics', image: '⌨️' },
  { id: 5, name: 'Yoga Mat Premium', price: 39.99, rating: 4.6, reviews: 201, category: 'Fitness', image: '🧘' },
  { id: 6, name: 'Portable Charger 20K', price: 44.99, rating: 4.4, reviews: 176, category: 'Electronics', image: '🔋' },
];

app.get('/api/shop/products', (req, res) => {
  const q = req.query.q || '';
  let results = products;
  if (q) results = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()));
  // VULNERABLE: reflects query in HTML field for "highlighting"
  res.json({ query: q, results, resultHtml: `<span class="search-highlight">Showing results for: <b>${q}</b></span>` });
});

app.get('/api/shop/product/:id', (req, res) => {
  const p = products.find(p => p.id === parseInt(req.params.id));
  if (p) res.json(p);
  else res.status(404).json({ error: 'Product not found' });
});

// --- Capstone: ChatConnect message relay ---
app.get('/api/chat/config', (req, res) => {
  res.json({ agentName: 'Sarah', agentStatus: 'online', welcomeMessage: 'Hi! How can I help you today?', widgetVersion: '2.4.1' });
});

// --- Capstone: DevPortal user dashboard API ---
app.get('/api/devportal/dashboard/:userId', (req, res) => {
  res.json({
    userId: req.params.userId,
    apiKeys: [{ name: 'Production', key: 'pk_live_' + crypto.randomBytes(12).toString('hex'), created: '2024-03-15' }],
    usage: { requests: 12847, limit: 50000, period: 'monthly' },
    plan: 'Pro'
  });
});

// --- Capstone: FinanceApp account & transfer API ---
app.get('/api/finance/account', requireAuth, (req, res) => {
  res.json({
    accountId: 'ACC-' + req.session.user.id + '-7291',
    name: req.session.user.username,
    balance: 42391.00,
    currency: 'USD',
    transactions: [
      { id: 'TXN-001', type: 'credit', amount: 5000, from: 'Employer Inc.', date: '2024-03-28' },
      { id: 'TXN-002', type: 'debit', amount: 120.50, to: 'Electric Co.', date: '2024-03-25' },
      { id: 'TXN-003', type: 'debit', amount: 45.99, to: 'Streaming Service', date: '2024-03-22' },
    ]
  });
});

app.post('/api/finance/transfer', requireAuth, (req, res) => {
  const { to, amount } = req.body;
  csrfActions.push({ action: 'finance_transfer', user: req.session.user.username, to, amount, time: Date.now() });
  res.json({ success: true, message: `Transfer of $${amount} to ${to} completed`, txnId: 'TXN-' + crypto.randomBytes(4).toString('hex') });
});

// --- Lab: Window.open Target Hijacking (Addon Marketplace) ---
const addons = [
  { id: 'slack-sync', name: 'Slack Sync', description: 'Sync notifications with Slack channels', icon: '💬', author: 'IntegraCorp', installed: false },
  { id: 'analytics-pro', name: 'Analytics Pro', description: 'Advanced workspace analytics and reporting', icon: '📊', author: 'DataViz Inc.', installed: true },
  { id: 'github-bridge', name: 'GitHub Bridge', description: 'Link pull requests to workspace tasks', icon: '🔗', author: 'DevTools LLC', installed: false },
  { id: 'calendar-widget', name: 'Calendar Widget', description: 'Embed team calendar in workspace', icon: '📅', author: 'TimeCo', installed: false },
  { id: 'malicious-addon', name: 'Productivity Boost', description: 'AI-powered productivity tracking', icon: '🚀', author: 'Evil Corp (attacker)', installed: false, malicious: true },
];
const addonTokens = {};

app.get('/api/addons', requireAuth, (req, res) => {
  res.json({ addons: addons.map(a => ({...a, malicious: undefined})) });
});

app.get('/api/addons/:id/install', requireAuth, (req, res) => {
  const addon = addons.find(a => a.id === req.params.id);
  if (!addon) return res.status(404).json({ error: 'Addon not found' });
  const oauthUrl = `/oauth/authorize?client_id=vuln-app&response_type=code&redirect_uri=${encodeURIComponent('http://localhost:3000/api/addons/callback')}&state=addon_${addon.id}&scope=read`;
  res.json({ oauthUrl, addonId: addon.id });
});

app.get('/api/addons/callback', (req, res) => {
  const { code, state } = req.query;
  const addonId = state ? state.replace('addon_', '') : null;
  const addon = addons.find(a => a.id === addonId);
  if (addon) addon.installed = true;
  const token = crypto.randomBytes(16).toString('hex');
  addonTokens[token] = { addonId, code, installedBy: req.session?.user?.username || 'unknown' };
  // Send result back to opener via postMessage
  res.send(`<!DOCTYPE html><html><head><title>Addon Connected</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#e2e8f0">
<h2>Addon Connected!</h2>
<p>Linking <strong>${addon ? addon.name : 'Unknown'}</strong> to your workspace...</p>
<script>
if (window.opener) {
  window.opener.postMessage({
    type: 'addon-oauth-complete',
    addonId: '${addonId}',
    token: '${token}',
    status: 'connected'
  }, window.location.origin);
  setTimeout(function(){ window.close(); }, 1500);
} else {
  document.body.innerHTML += '<p style="color:#f87171">No opener window found.</p>';
}
</script>
</body></html>`);
});

app.get('/api/addons/workspace-data', requireAuth, (req, res) => {
  res.json({
    workspace: 'Acme Corp',
    members: [
      { name: req.session.user.username, email: req.session.user.email, role: req.session.user.role },
      { name: 'alice', email: 'alice@acmecorp.com', role: 'member' },
      { name: 'bob', email: 'bob@acmecorp.com', role: 'member' },
    ],
    apiKeys: [{ key: 'wk_live_' + crypto.randomBytes(12).toString('hex'), scope: 'full_access' }],
    billing: { plan: 'Enterprise', seats: 25, monthly: '$499' }
  });
});

// --- Lab: CSPT DELETE (Session Manager) ---
const userSessions = {
  'victim': [
    { id: 'sess_a1b2c3', device: 'Chrome on Windows', ip: '192.168.1.42', lastActive: '2 minutes ago', current: true },
    { id: 'sess_d4e5f6', device: 'Firefox on macOS', ip: '10.0.0.15', lastActive: '3 hours ago', current: false },
    { id: 'sess_g7h8i9', device: 'Safari on iPhone', ip: '172.16.0.8', lastActive: '1 day ago', current: false },
  ]
};

app.get('/api/sessions', requireAuth, (req, res) => {
  const sessions = userSessions[req.session.user.username] || [];
  res.json({ sessions });
});

app.delete('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const sessionId = req.params.sessionId;
  const username = req.session.user.username;
  // VULNERABLE: No path normalization - accepts ../
  // The sessionId is used directly, allowing path traversal
  if (sessionId.includes('profile')) {
    // Simulates reaching /api/users/profile DELETE
    csrfActions.push({ action: 'account_deleted_via_cspt', user: username, traversal: sessionId, time: Date.now() });
    return res.json({ success: true, message: `Account ${username} has been permanently deleted!`, flag: 'FLAG{cspt_delete_traversal}' });
  }
  if (sessionId.includes('transfer')) {
    csrfActions.push({ action: 'transfer_via_cspt', user: username, traversal: sessionId, time: Date.now() });
    return res.json({ success: true, message: 'Transfer of $10,000 to attacker initiated!', flag: 'FLAG{cspt_delete_to_transfer}' });
  }
  const sessions = userSessions[username] || [];
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions.splice(idx, 1);
    return res.json({ success: true, message: `Session ${sessionId} revoked` });
  }
  res.status(404).json({ error: 'Session not found' });
});

// DELETE user profile (should only be reached intentionally, not via CSPT)
app.delete('/api/users/profile', requireAuth, (req, res) => {
  csrfActions.push({ action: 'profile_deleted', user: req.session.user.username, time: Date.now() });
  res.json({ success: true, message: `Profile for ${req.session.user.username} deleted permanently` });
});

// --- Lab: PostMessage iframe injection (Floating Page) ---
app.get('/api/floating-pages/config', (req, res) => {
  res.json({
    pages: [
      { id: 'help', name: 'Help Center', url: '/labs/realworld/help-content.html' },
      { id: 'chat', name: 'Live Chat', url: '/labs/realworld/chat-content.html' },
      { id: 'feedback', name: 'Feedback', url: '/labs/realworld/feedback-content.html' },
    ]
  });
});

// Frameable endpoint (no X-Frame-Options) for the postMessage XSS lab
app.get('/api/download', (req, res) => {
  const p = req.query.p || 'default';
  // VULNERABLE: No X-Frame-Options header, frameable
  res.send(`<!DOCTYPE html><html><head><title>Download</title></head>
<body style="font-family:sans-serif;padding:40px;background:#f8fafc">
<h3>Download Center</h3>
<p>File: ${p}</p>
<p>Status: Ready for download</p>
<script>
// This page listens for postMessage and creates floating page elements
window.addEventListener('message', function(event) {
  if (event.data && event.data.message === 'e:openFloatingPage') {
    var d = event.data.data;
    if (d && d.url && d.name && d.id) {
      var container = document.getElementById('floating-pages') || document.body;
      // VULNERABLE: No sanitization on url, name, id - direct template insertion
      var html = '<iframe src="' + d.url + '" name="' + d.name + '" id="' + d.id + '" style="width:100%;height:300px;border:1px solid #e2e8f0;border-radius:8px;margin-top:16px"></iframe>';
      container.insertAdjacentHTML('beforeend', html);
    }
  }
});
window.parent.postMessage({type:'downloadReady', page: '${p}'}, '*');
</script>
<div id="floating-pages"></div>
</body></html>`);
});

// --- Lab: DOM XSS Hunt (realistic SaaS dashboard) ---
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  res.json({
    totalUsers: 12847, activeToday: 3291, revenue: '$48,291',
    growth: '+12.4%', topPages: ['/pricing', '/features', '/docs'],
    recentEvents: [
      { type: 'signup', user: 'jane@acme.com', time: '2 min ago' },
      { type: 'upgrade', user: 'bob@startup.io', time: '15 min ago' },
      { type: 'signup', user: 'carol@enterprise.co', time: '1 hr ago' },
    ]
  });
});

app.get('/api/dashboard/search-users', requireAuth, (req, res) => {
  const q = req.query.q || '';
  const fakeUsers = [
    { id: 1, name: 'Jane Cooper', email: 'jane@acme.com', plan: 'Pro' },
    { id: 2, name: 'Bob Smith', email: 'bob@startup.io', plan: 'Free' },
    { id: 3, name: 'Carol Williams', email: 'carol@enterprise.co', plan: 'Enterprise' },
  ];
  const results = q ? fakeUsers.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q)) : [];
  res.json({ query: q, results, total: results.length });
});

// Catch-all for lab pages
app.get('/labs/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Client-Side Labs - Bug Bounty Training`);
  console.log(`========================================`);
  console.log(`  Server running: http://localhost:${PORT}`);
  console.log(`  Dashboard:      http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`\n  Test accounts:`);
  console.log(`    victim   / password123`);
  console.log(`    admin    / admin123`);
  console.log(`    attacker / hack3r`);
  console.log(`\n  Happy hacking!\n`);
});
