/* ============================================================
   LINA COMMUNITY — script.js
   ============================================================ */

// ──────────────────────────────────────────────────────────────
// 0. GLOBALS
// Dynamic API Base Detection: Auto-switches between local development and production
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? "http://localhost:5000"
    : "";

// 1. UTILITIES
// ──────────────────────────────────────────────────────────────

/** Show a toast notification */
function showToast(message, type = 'default', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-circle-check',
    danger:  'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    default: 'fa-bell',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.default}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/** Get/set localStorage */
function store(key, value) {
  if (value === undefined) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/** Format relative time */
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

/** Validate email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Get first letter of a name (first letter of first word) */
function getInitials(name) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Build a DOM element that shows either an <img> (if avatarSrc is a
 * real uploaded data-URL / http URL) or an initials circle.
 * @param {string} avatarSrc  - stored avatar value (may be empty / dicebear URL we want to replace)
 * @param {string} fullname   - user's full name for the letter
 * @param {string} sizeClass  - 'size-sm' | 'size-md' | 'size-lg' | 'size-xl'
 * @returns HTMLElement
 */
function buildAvatarElement(avatarSrc, fullname, sizeClass = 'size-md') {
  const isRealPhoto = avatarSrc && avatarSrc.startsWith('data:');
  if (isRealPhoto) {
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.alt = fullname || 'avatar';
    img.className = 'avatar';
    img.style.width = sizeClass === 'size-xl' ? '90px' : sizeClass === 'size-lg' ? '56px' : sizeClass === 'size-sm' ? '32px' : '38px';
    img.style.height = img.style.width;
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    img.style.border = '2px solid var(--primary-light)';
    return img;
  }
  const div = document.createElement('div');
  div.className = `initials-avatar ${sizeClass} avatar-dropdown-trigger`;
  div.textContent = getInitials(fullname);
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', 'Profile menu');
  return div;
}

/** Highlight active sidebar link */
function highlightSidebarLink() {
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 2. SIDEBAR TOGGLE (mobile)
// ──────────────────────────────────────────────────────────────

function initSidebar() {
  const hamburger = document.querySelector('.hamburger');
  const sidebar   = document.querySelector('.sidebar');
  const overlay   = document.querySelector('.overlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay && overlay.classList.toggle('show');
  });

  overlay && overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// ──────────────────────────────────────────────────────────────
// 3. NAVBAR USER DROPDOWN
// ──────────────────────────────────────────────────────────────

function buildDropdownMenu(user) {
  const menu = document.querySelector('.avatar-dropdown-menu');
  if (!menu) return;

  // Rebuild the menu with user header + all required items
  menu.innerHTML = `
    ${ user ? `
    <div class="dropdown-user-header">
      <div class="du-name">${escapeHtml(user.fullname)}</div>
      <div class="du-email">${escapeHtml(user.email)}</div>
    </div>` : '' }
    <a href="profile.html"><i class="fa-solid fa-user"></i> My Profile</a>
    <a href="profile.html#settings"><i class="fa-solid fa-gear"></i> Settings</a>
    <a href="saved.html"><i class="fa-solid fa-bookmark"></i> Saved</a>
    <a href="activity.html"><i class="fa-solid fa-chart-line"></i> Your Activity</a>
    <a href="my-questions.html"><i class="fa-solid fa-list-ul"></i> Your Questions</a>
    <div class="dropdown-divider"></div>
    <button id="logout-btn" class="logout-item"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
  `;

  // Re-attach logout handler
  const logoutBtn = menu.querySelector('#logout-btn');
  logoutBtn && logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
}

function initNavbarDropdown() {
  const menu = document.querySelector('.avatar-dropdown-menu');
  if (!menu) return;

  // Event delegation on document — any .avatar-dropdown-trigger opens this menu
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.avatar-dropdown-trigger');
    if (trigger) {
      e.stopPropagation();
      menu.classList.toggle('hidden');
      return;
    }
    // Click outside
    if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 4. FILTER TABS
// ──────────────────────────────────────────────────────────────

function initFilterTabs() {
  document.querySelectorAll('.filter-tabs').forEach(tabsEl => {
    tabsEl.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const filter = tab.dataset.filter || tab.textContent.toLowerCase().trim();
        if (document.getElementById('questions-list')) initQuestionsPage(filter);
        if (document.getElementById('dashboard-questions')) initDashboard(filter);
        if (document.getElementById('users-grid')) initUsersPage(filter);
      });
    });
  });
}

// ──────────────────────────────────────────────────────────────
// 5. PASSWORD VISIBILITY TOGGLE
// ──────────────────────────────────────────────────────────────

function initPasswordToggle() {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.classList.toggle('fa-eye', isText);
      btn.classList.toggle('fa-eye-slash', !isText);
    });
  });
}

// ──────────────────────────────────────────────────────────────
// 6. FORM VALIDATION HELPERS
// ──────────────────────────────────────────────────────────────

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + '-error');
  if (input)  input.classList.add('error');
  if (error)  { error.textContent = message; error.classList.add('show'); }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + '-error');
  if (input)  input.classList.remove('error');
  if (error)  error.classList.remove('show');
}

function markValid(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) { input.classList.remove('error'); input.classList.add('success'); }
}

function clearAllErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.form-control').forEach(el => {
    el.classList.remove('error', 'success');
  });
  form.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
}

// ──────────────────────────────────────────────────────────────
// 7. SIGNUP FORM
// ──────────────────────────────────────────────────────────────

function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Avatar preview
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');
  avatarInput && avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && avatarPreview) {
      const reader = new FileReader();
      reader.onload = (ev) => { avatarPreview.src = ev.target.result; };
      reader.readAsDataURL(file);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('signup-form');
    let valid = true;

    const fullname = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const bio      = document.getElementById('bio').value.trim();

    if (!fullname) { showFieldError('fullname', 'Full name is required.'); valid = false; }
    else markValid('fullname');

    if (!username || username.length < 3) { showFieldError('username', 'Username must be at least 3 characters.'); valid = false; }
    else if (/\s/.test(username)) { showFieldError('username', 'Username cannot contain spaces.'); valid = false; }
    else markValid('username');

    if (!email) { showFieldError('email', 'Email is required.'); valid = false; }
    else if (!isValidEmail(email)) { showFieldError('email', 'Please enter a valid email address.'); valid = false; }
    else markValid('email');

    if (!password) { showFieldError('password', 'Password is required.'); valid = false; }
    else if (password.length < 6) { showFieldError('password', 'Password must be at least 6 characters.'); valid = false; }
    else markValid('password');

    if (!confirmPassword) { showFieldError('confirm-password', 'Please confirm your password.'); valid = false; }
    else if (password !== confirmPassword) { showFieldError('confirm-password', 'Passwords do not match.'); valid = false; }
    else markValid('confirm-password');

    if (!valid) { showToast('Please fix the errors above.', 'danger'); return; }

    try {
      showToast('Creating account...', 'default', 1000);
      const res = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname, username, email, password, bio,
          avatar: avatarPreview ? avatarPreview.src : 'https://api.dicebear.com/7.x/initials/svg?seed=' + username
        })
      });
      const data = await res.json();
      
      if (data.success) {
        // Successful register
        store('token', data.token); // Store backend JWT token
        store('user', data.user); // Store basic cache
        showToast('Account created! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      } else {
        // Backend validation or existing user error
        if (data.error.toLowerCase().includes('email')) showFieldError('email', data.error);
        if (data.error.toLowerCase().includes('username')) showFieldError('username', data.error);
        showToast(data.error, 'danger');
      }
    } catch (err) {
      console.error('❌ [SIGNUP ERROR]:', err);
      if (err.message.includes('fetch') || err.name === 'TypeError') {
        showToast('Backend is offline. Registration currently unavailable.', 'danger');
      } else {
        showToast('Server error during registration. Check backend logs.', 'danger');
      }
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 8. LOGIN FORM
// ──────────────────────────────────────────────────────────────

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('login-form');
    let valid = true;

    const identifier = document.getElementById('identifier').value.trim();
    const password   = document.getElementById('password').value;

    if (!identifier) { showFieldError('identifier', 'Email or username is required.'); valid = false; }
    else markValid('identifier');

    if (!password) { showFieldError('password', 'Password is required.'); valid = false; }
    else markValid('password');

    if (!valid) return;

    try {
      showToast('Logging in...', 'default', 1000);
      const res = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      // Try to parse JSON body
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (res.ok && data && data.success) {
        // Handle Remember Me
        const rememberMe = document.getElementById('remember-me')?.checked;
        store('lc_remember', rememberMe);
        
        store('token', data.token); // Store JWT
        store('user', data.user);
        
        showToast('Welcome back, ' + data.user.fullname + '!', 'success');
        setTimeout(() => { 
          window.location.assign('index.html'); 
        }, 1000);
      } else {
        // Handle failure (4xx or 5xx)
        const errorMessage = data?.error || (res.status === 500 ? 'Internal Server Error. Please contact support.' : 'Login failed.');
        
        if (res.status === 401) {
          showFieldError('identifier', errorMessage);
          showFieldError('password', errorMessage);
        } else if (res.status === 500) {
          console.error('💥 [SERVER ERROR]:', errorMessage);
        }
        
        showToast(errorMessage, 'danger');
      }
    } catch (err) {
      console.error('❌ [CONNECTION ERROR]:', err);
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        showToast('Network error or CORS block. Verify server status and URL.', 'danger');
      } else {
        showToast('An unexpected error occurred. Please try again.', 'danger');
      }
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 8.1 FORGOT & RESET PASSWORD FORMS
// ──────────────────────────────────────────────────────────────

function initForgotPasswordForm() {
  const form = document.getElementById('forgot-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput.value.trim();
    const btn = form.querySelector('button[type="submit"]');

    if (!email) { showToast('Please enter your email.', 'danger'); return; }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      const res = await fetch(API_BASE + '/api/auth/forgotpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      // Try to parse JSON body
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      if (res.ok && data && data.success) {
        showToast('Password reset link sent to your email!', 'success', 5000);
        emailInput.value = '';
      } else {
        const errorMsg = data?.error || (res.status === 500 ? 'Internal Server Error. Please contact support.' : 'Request failed.');
        showToast(errorMsg, 'danger');
        console.error('📦 [FORGOT ERROR RESPONSE]:', errorMsg);
      }
    } catch (err) {
      console.error('❌ [CONNECTION ERROR]:', err);
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        showToast('Network error or CORS block. Is the server running?', 'danger');
      } else {
        showToast('An unexpected error occurred. Please try again.', 'danger');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Reset Link';
    }
  });
}

function initResetPasswordForm() {
  const form = document.getElementById('reset-password-form');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    showToast('Invalid or missing reset token. Redirecting...', 'danger');
    setTimeout(() => { window.location.href = 'login.html'; }, 3000);
    return;
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-confirm').value;
    const btn = form.querySelector('button[type="submit"]');
    const ogHtml = btn.innerHTML;
    
    if (!password || !confirm) return showToast('Please fill out all fields.', 'warning');
    if (password.length < 6) return showToast('Password must be at least 6 characters.', 'warning');
    if (password !== confirm) return showToast('Passwords do not match.', 'warning');
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    
    try {
      console.log('🔄 [FRONTEND] Sending reset request for token:', token.substring(0, 5) + '...');
      const res = await fetch(`${API_BASE}/api/auth/resetpassword/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      console.log('📦 [FRONTEND] Response received:', data);

      if (data.success) {
        store('token', data.token);
        store('user', data.user);
        showToast('Password reset successful! Logging you in...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      } else {
        showToast(data.error || 'Reset failed. Token may be expired.', 'danger');
        btn.innerHTML = ogHtml;
        btn.disabled = false;
      }
    } catch (err) {
      console.error('❌ [FRONTEND ERROR]:', err);
      showToast('Network error while resetting password. Is the server running?', 'danger');
      btn.innerHTML = ogHtml;
      btn.disabled = false;
    }
  });
}


// ──────────────────────────────────────────────────────────────
// 9. PROFILE PAGE
// ──────────────────────────────────────────────────────────────

async function initProfilePage() {
  const page = document.getElementById('profile-page');
  if (!page) return;

  const token = store('token');
  if (!token) { window.location.href = 'login.html'; return; }

  let user;
  try {
    const res = await fetch(API_BASE + '/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      user = data.data;
      store('user', user);
    } else {
      showToast('Session expired. Please log in again.', 'warning');
      store('token', null);
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }
  } catch (err) {
    store('token', null);
    window.location.href = 'login.html';
    return;
  }

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // ── Render the profile header avatar (real photo OR initials) ──
  function renderProfileHeaderAvatar() {
    const headerWrap = document.getElementById('profile-avatar-header-wrap');
    if (!headerWrap) return;
    headerWrap.innerHTML = '';
    const el = buildAvatarElement(user.avatar, user.fullname, 'size-xl');
    el.style.border = '4px solid rgba(255,255,255,.4)';
    headerWrap.appendChild(el);
  }

  // ── Render edit-form preview avatar ──
  function renderEditPreviewAvatar() {
    const editPreviewWrap = document.getElementById('edit-avatar-preview-wrap');
    if (!editPreviewWrap) return;
    editPreviewWrap.innerHTML = '';
    const el = buildAvatarElement(user.avatar, user.fullname, 'size-lg');
    el.id = 'edit-avatar-preview';
    el.className = (el.className || '') + ' avatar-preview';
    el.style.cursor = 'default';
    editPreviewWrap.appendChild(el);
  }

  renderProfileHeaderAvatar();
  renderEditPreviewAvatar();

  setEl('profile-fullname', user.fullname);
  setEl('profile-handle', '@' + user.username);
  setEl('profile-bio-preview', user.bio || 'No bio added yet.');
  setEl('profile-email-display', user.email);
  setEl('profile-join-date', new Date(user.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long' }));
  setEl('stat-questions',  user.questions  || 0);
  setEl('stat-answers',    user.answers    || 0);
  setEl('stat-reputation', user.reputation || 0);

  // Pre-fill edit form
  const fillInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  fillInput('edit-fullname', user.fullname);
  fillInput('edit-username', user.username);
  fillInput('edit-email', user.email);
  fillInput('edit-bio', user.bio);

  // Edit toggle
  const editBtn  = document.getElementById('edit-profile-btn');
  const editForm = document.getElementById('edit-profile-form');
  const cancelBtn = document.getElementById('cancel-edit-btn');

  editBtn && editBtn.addEventListener('click', () => {
    editForm && editForm.classList.add('show');
    editBtn.classList.add('hidden');
  });
  cancelBtn && cancelBtn.addEventListener('click', () => {
    editForm && editForm.classList.remove('show');
    editBtn && editBtn.classList.remove('hidden');
  });

  // ── Avatar upload (FileReader → data URL) ──
  const editAvatarInput = document.getElementById('edit-avatar-input');
  editAvatarInput && editAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large — max 2MB', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const editPreviewWrap = document.getElementById('edit-avatar-preview-wrap');
      if (editPreviewWrap) {
        editPreviewWrap.innerHTML = '';
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'avatar-preview';
        img.style.width = '80px'; img.style.height = '80px';
        img.style.borderRadius = '50%'; img.style.objectFit = 'cover';
        img.style.border = '3px solid var(--primary-light)';
        img.id = 'edit-avatar-preview';
        editPreviewWrap.appendChild(img);
      }
      user.avatar = ev.target.result;
      renderProfileHeaderAvatar();
    };
    reader.readAsDataURL(file);
  });

  // ── Remove Avatar ──
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  removeAvatarBtn && removeAvatarBtn.addEventListener('click', () => {
    user.avatar = ''; // Setting to empty string instructs backend to clear photo
    const editPreviewWrap = document.getElementById('edit-avatar-preview-wrap');
    if (editPreviewWrap) {
      editPreviewWrap.innerHTML = '';
      const el = buildAvatarElement('', user.fullname, 'size-lg');
      el.id = 'edit-avatar-preview';
      el.className = (el.className || '') + ' avatar-preview';
      el.style.cursor = 'default';
      editPreviewWrap.appendChild(el);
    }
    
    // Also clear the file input so they don't accidentally re-upload it
    if (editAvatarInput) editAvatarInput.value = '';
  });

  // ── Save profile ──
  const saveForm = document.getElementById('save-profile-form');
  saveForm && saveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('edit-fullname').value.trim();
    const username = document.getElementById('edit-username').value.trim();
    const email    = document.getElementById('edit-email').value.trim();
    const bio      = document.getElementById('edit-bio').value.trim();
    const btn = saveForm.querySelector('button[type="submit"]');

    if (!fullname || !username || !email) { showToast('Please fill all required fields.', 'danger'); return; }

    const previewImg = document.getElementById('edit-avatar-preview');
    if (previewImg && previewImg.tagName === 'IMG' && previewImg.src.startsWith('data:')) {
      user.avatar = previewImg.src;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      const res = await fetch(API_BASE + '/api/users/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullname, username, email, bio, avatar: user.avatar })
      });
      const data = await res.json();
      
      if (data.success) {
        user = data.data;
        store('user', user);

        setEl('profile-fullname', user.fullname);
        setEl('profile-handle', '@' + user.username);
        setEl('profile-bio-preview', user.bio || 'No bio added yet.');
        renderProfileHeaderAvatar();
        renderEditPreviewAvatar();

        editForm && editForm.classList.remove('show');
        editBtn && editBtn.classList.remove('hidden');
        showToast('Profile saved successfully! ✓', 'success');
      } else {
        showToast(data.error, 'danger');
      }
    } catch (err) {
      showToast('Error saving profile.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Changes';
    }
  });

  loadUserQuestions(user);
}

async function loadUserQuestions(user) {
  const container = document.getElementById('user-questions-list');
  if (!container) return;

  try {
    const token = store('token');
    const res = await fetch(API_BASE + '/api/questions/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) throw new Error();
    
    const questions = data.data;
    if (!questions.length) {
      container.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
        <i class="fa-solid fa-comment-slash" style="font-size:3rem;margin-bottom:16px;opacity:.3;"></i>
        <h3 style="margin-bottom:8px;color:var(--text-main);">No questions yet</h3>
        <p style="margin-bottom:20px;">You have not posted any questions yet.</p>
        <a href="ask-question.html" class="btn btn-primary btn-sm">Ask your first question</a>
      </div>`;
      return;
    }
    
    const cardsHtml = await Promise.all(questions.map(q => buildQuestionCard(q)));
    container.innerHTML = cardsHtml.join('');
    
    // We also need answers logic inside buildQuestionCard to be asynchronous, 
    // but building the card string will happen after loading global questions/answers.
    // For now, this invokes global sync state.
  } catch (err) {
    console.error(err);
  }
}

// ──────────────────────────────────────────────────────────────
// 10. ASK QUESTION FORM
// ──────────────────────────────────────────────────────────────

function initAskQuestion() {
  const form = document.getElementById('ask-question-form');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const pageTitleEl = document.querySelector('.page-title');
  const submitBtn = form.querySelector('button[type="submit"]');

  const tagsWrap  = document.getElementById('tags-input-wrap');
  const tagsInput = document.getElementById('tags-text-input');
  const tagsHidden = document.getElementById('tags-hidden');
  let tags = [];

  function renderTags() {
    tagsWrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
    tags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${tag}<button type="button" data-idx="${i}" aria-label="remove">×</button>`;
      chip.querySelector('button').addEventListener('click', () => { tags.splice(i, 1); renderTags(); });
      tagsWrap.insertBefore(chip, tagsInput);
    });
    tagsHidden.value = tags.join(',');
  }

  // Edit Mode Pre-fill
  if (editId) {
    if (pageTitleEl) pageTitleEl.textContent = 'Edit Question';
    if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
    
    fetch(`${API_BASE}/api/questions/${editId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const q = data.data;
          document.getElementById('q-title').value = q.title;
          document.getElementById('q-description').value = q.description;
          tags = q.tags || [];
          renderTags();
        }
      });
  }

  tagsWrap && tagsWrap.addEventListener('click', () => tagsInput.focus());

  tagsInput && tagsInput.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagsInput.value.trim()) {
      e.preventDefault();
      const tag = tagsInput.value.trim().toLowerCase().replace(/,/g,'');
      if (tag && !tags.includes(tag) && tags.length < 5) { tags.push(tag); renderTags(); }
      tagsInput.value = '';
    }
    if (e.key === 'Backspace' && !tagsInput.value && tags.length) { tags.pop(); renderTags(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('ask-question-form');
    let valid = true;

    const title = document.getElementById('q-title').value.trim();
    const desc  = document.getElementById('q-description').value.trim();

    if (!title || title.length < 10) { showFieldError('q-title', 'Title must be at least 10 characters.'); valid = false; }
    else markValid('q-title');

    if (!desc || desc.length < 20) { showFieldError('q-description', 'Description must be at least 20 characters.'); valid = false; }
    else markValid('q-description');

    if (!valid) { showToast('Please fill in all required fields.', 'danger'); return; }

    const token = store('token');
    if (!token) { showToast('Please log in.', 'warning'); return; }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = editId ? 'Saving...' : 'Posting...';
      
      const res = await fetch(editId ? `${API_BASE}/api/questions/${editId}` : API_BASE + '/api/questions', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, description: desc, tags })
      });
      const data = await res.json();
      
      if (data.success) {
        showToast(editId ? 'Question updated successfully!' : 'Question posted successfully!', 'success');
        setTimeout(() => { window.location.href = 'questions.html'; }, 1400);
      } else {
        showToast(data.error, 'danger');
      }
    } catch (err) {
      showToast('Error processing question.', 'danger');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ──────────────────────────────────────────────────────────────
// 11. QUESTIONS PAGE & OWNERSHIP LOGIC
// ──────────────────────────────────────────────────────────────

async function buildQuestionCard(q) {
  const currentUser = store('user');
  const authorAvatarObj = buildAvatarElement(q.authorAvatar, q.authorName, 'size-sm');
  const avatarHtml = authorAvatarObj.outerHTML;

  const tags = (q.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const isOwner = currentUser && (currentUser._id === q.authorId || currentUser.id === q.authorId);
  const qIdStr = q._id || q.id;

  // Check if saved — compare as strings to handle ObjectId vs string mismatch
  const isSaved = currentUser && currentUser.savedQuestions &&
    currentUser.savedQuestions.some(id => id.toString() === qIdStr.toString());

  return `
  <div class="question-card" data-id="${qIdStr}">
    <div class="q-votes">
      <div class="vote-box" style="cursor:pointer;" onclick="handleVote('question', '${qIdStr}', event)" title="Toggle Vote">
        <span class="v-count" id="vote-count-question-${qIdStr}">${q.votes || 0}</span>
        <span class="v-label">votes</span>
      </div>
      <div class="vote-box ${q.answers > 0 ? 'answered' : ''}" style="cursor:pointer;" onclick="toggleAnswers('${qIdStr}', event)">
        <span class="v-count">${q.answers || 0}</span>
        <span class="v-label">ans</span>
      </div>
    </div>
    <div class="q-body">
      <div class="q-title" style="cursor:pointer;" onclick="toggleAnswers('${qIdStr}', event)">${escapeHtml(q.title)}</div>
      <div class="q-excerpt" style="cursor:pointer;" onclick="toggleAnswers('${qIdStr}', event)">${escapeHtml(q.description)}</div>
      <div class="q-meta">
        <div class="q-tags">${tags}</div>
        <div class="q-stats">
          <span class="q-stat"><i class="fa-solid fa-eye"></i> ${q.views || 0}</span>
          <span class="q-author" title="@${escapeHtml(q.authorHandle)}">
            ${avatarHtml}
            <span>${escapeHtml(q.authorName)}</span>
          </span>
          <span class="q-time">· ${timeAgo(q.createdAt)}</span>
        </div>
      </div>
      
      <div class="q-actions">
        <button class="action-btn save-btn ${isSaved ? 'active' : ''}" onclick="handleSaveQuestion('${qIdStr}', event)">
          <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i> ${isSaved ? 'Saved' : 'Save'}
        </button>
        ${isOwner ? `
          <button class="action-btn edit-btn" onclick="window.location.href='ask-question.html?edit=${qIdStr}'"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="action-btn delete-btn" onclick="handleDeleteQuestion('${qIdStr}', event)"><i class="fa-solid fa-trash"></i> Delete</button>
        ` : ''}
      </div>

      <!-- Answers Section (Hidden by default) -->
      <div class="answers-section" id="answers-section-${qIdStr}">
        <div class="answers-header">Answers (${q.answers || 0})</div>
        <div id="answers-list-${qIdStr}" class="answers-list">
          <div class="loading-sm" style="padding:10px;text-align:center;color:var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading answers...
          </div>
        </div>
        <form class="answer-form" onsubmit="submitAnswer(event, '${qIdStr}')">
          <textarea id="answer-input-${qIdStr}" placeholder="Write your answer..." required></textarea>
          <div style="display:flex;justify-content:flex-end;">
            <button type="submit" class="btn btn-primary btn-sm">Post Answer</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
}

async function toggleAnswers(qId, e) {
  if (e) e.stopPropagation();
  const section = document.getElementById(`answers-section-${qId}`);
  if (!section) return;
  
  section.classList.toggle('active');

  if (section.classList.contains('active')) {
    const list = document.getElementById(`answers-list-${qId}`);
    const currentUser = store('user');

    try {
      const res = await fetch(`${API_BASE}/api/answers/${qId}`);
      const data = await res.json();
      if (data.success) {
        if (data.data.length === 0) {
          list.innerHTML = '<p style="padding:10px;color:var(--text-muted);">No answers yet.</p>';
        } else {
          list.innerHTML = data.data.map(a => {
            const aAvatarObj = buildAvatarElement(a.authorAvatar, a.authorName, 'size-sm');
            const aIsOwner = currentUser && (currentUser._id === a.authorId || currentUser.id === a.authorId);
            return `
              <div class="answer-card">
                <div class="a-vote-col">
                  <button class="action-btn vote-answer-btn" onclick="handleVote('answer', '${a._id}', event)"><i class="fa-solid fa-caret-up"></i></button>
                  <span class="vote-count" id="vote-count-answer-${a._id}">${a.votes || 0}</span>
                </div>
                <div class="a-content">
                  <div class="answer-text">${escapeHtml(a.text).replace(/\n/g, '<br>')}</div>
                  <div class="answer-meta">
                    <div class="item-actions">
                      ${aIsOwner ? `<button class="action-btn delete-btn" onclick="handleDeleteAnswer('${a._id}', event)"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                    <div class="answer-author" title="@${escapeHtml(a.authorHandle)}">
                      ${aAvatarObj.outerHTML}
                      <span style="font-weight:600;">${escapeHtml(a.authorName)}</span>
                      <span style="font-size:.7rem;">· ${timeAgo(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>`;
          }).join('');
        }
      }
    } catch (err) {
      list.innerHTML = 'Error loading answers.';
    }
  }
}

async function handleVote(type, itemId, e) {
  if (e) e.stopPropagation();
  const token = store('token');
  if (!token) { showToast('Please log in to vote.', 'warning'); return; }
  
  try {
    const res = await fetch(API_BASE + '/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type, itemId })
    });
    const data = await res.json();
    if(data.success) {
      // Optimistically update the UI
      const countEl = document.getElementById(`vote-count-${type}-${itemId}`);
      if(countEl) {
        countEl.textContent = parseInt(countEl.textContent || '0') + data.voteChange;
      }
    } else {
      showToast(data.error, 'danger');
    }
  } catch(err) {
    showToast('Failed to toggle vote.', 'danger');
  }
}

async function submitAnswer(e, qId) {
  e.preventDefault();
  const token = store('token');
  if (!token) { showToast('Please log in to post an answer.', 'warning'); return; }

  const textarea = document.getElementById(`answer-input-${qId}`);
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) return;

  try {
    const res = await fetch(API_BASE + '/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text, questionId: qId })
    });
    const data = await res.json();
    
    if (data.success) {
      showToast('Answer posted!', 'success');
      textarea.value = '';
      // Refresh answers list
      const section = document.getElementById(`answers-section-${qId}`);
      if (section) {
        section.classList.add('active');
        // Re-toggle to refresh
        toggleAnswers(qId); 
      }
    } else {
      showToast(data.error, 'danger');
    }
  } catch(err) {
    showToast('Failed to post answer.', 'danger');
  }
}

async function handleDeleteQuestion(qId, event) {
  if (event) event.stopPropagation();
  const token = store('token');
  if (!token) { showToast('Please log in.', 'danger'); return; }

  if (confirm('Are you sure you want to delete this question? This also deletes its answers.')) {
    try {
      const res = await fetch(`${API_BASE}/api/questions/${qId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Question deleted.', 'success');
        if (document.getElementById('questions-list')) initQuestionsPage();
        if (typeof initDashboard === 'function') initDashboard();
        if (typeof initProfilePage === 'function') initProfilePage();
      } else {
        showToast(data.error, 'danger');
      }
    } catch (err) {
      showToast('Error deleting question.', 'danger');
    }
  }
}

async function handleDeleteAnswer(aId, event) {
  if (event) event.stopPropagation();
  const token = store('token');
  if (!token) { showToast('Please log in.', 'danger'); return; }

  if (confirm('Are you sure you want to delete this answer?')) {
    try {
      const res = await fetch(`${API_BASE}/api/answers/${aId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Answer deleted.', 'success');
        if (document.getElementById('questions-list')) initQuestionsPage();
        if (typeof initDashboard === 'function') initDashboard();
        if (typeof initProfilePage === 'function') initProfilePage();
      } else {
        showToast(data.error, 'danger');
      }
    } catch (err) {
      showToast('Error deleting answer.', 'danger');
    }
  }
}

function setupGlobalDelegation() {
  document.addEventListener('click', async (e) => {
    const token = store('token');
    
    const editQ = e.target.closest('.edit-question-btn');
    if (editQ) {
       const id = editQ.dataset.id;
       window.location.href = `ask-question.html?edit=${id}`;
       return;
    }

    const editA = e.target.closest('.edit-answer-btn');
    if (editA) {
       const aId = editA.dataset.id;
       const newText = prompt('Enter new Answer text:');
       if (newText !== null && newText.trim().length > 0) {
         try {
           const res = await fetch(`${API_BASE}/api/answers/${aId}`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify({ text: newText.trim() })
           });
           const data = await res.json();
           if(data.success) {
             showToast('Answer updated.', 'success');
             if(document.getElementById('questions-list')) initQuestionsPage();
             if(typeof initDashboard === 'function') initDashboard();
           } else showToast(data.error, 'danger');
         } catch(err) { showToast('Error updating answer', 'danger'); }
       }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function initQuestionsPage(filter = 'all') {
  const container = document.getElementById('questions-list');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/questions?filter=${filter}`);
    const data = await res.json();
    if(data.success) {
      let questions = data.data;
      await renderQuestions(questions, container);

      const searchInput = document.getElementById('q-search');
      if (searchInput && !searchInput.dataset.listenerAdded) {
        searchInput.dataset.listenerAdded = 'true';
        searchInput.addEventListener('input', async () => {
          const q = searchInput.value.trim().toLowerCase();
          const filtered = questions.filter(qn => 
            qn.title.toLowerCase().includes(q) || 
            qn.description.toLowerCase().includes(q) ||
            (qn.tags || []).some(t => t.toLowerCase().includes(q))
          );
          await renderQuestions(filtered, container);
        });
      }
    }
  } catch(e) {
    container.innerHTML = 'Error loading questions.';
  }
}

async function renderQuestions(questions, container) {
  if (!questions.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-magnifying-glass"></i>
      <h3>No questions found</h3>
      <p>Try a different search or ask the first question!</p>
      <a href="ask-question.html" class="btn btn-primary btn-sm">Ask a Question</a>
    </div>`;
    return;
  }
  const cardsHtml = await Promise.all(questions.map(q => buildQuestionCard(q)));
  container.innerHTML = cardsHtml.join('');
}

// ──────────────────────────────────────────────────────────────
// 12. DASHBOARD
// ──────────────────────────────────────────────────────────────

async function initDashboard(filter = 'trending') {
  const container = document.getElementById('dashboard-questions');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/questions?filter=${filter}`);
    const data = await res.json();
    if(data.success) {
      await renderQuestions(data.data.slice(0, 5), container);
    }
  } catch(e) {}

  // Fetch real database counts for stats
  try {
    const resStats = await fetch(API_BASE + '/api/stats');
    const dataStats = await resStats.json();
    if (dataStats.success) {
      const stats = dataStats.data;
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      
      setEl('stat-questions-count', stats.totalQuestions);
      setEl('stat-answers-count', stats.totalAnswers);
      setEl('stat-members-count', stats.totalUsers + '+');
    }
  } catch(e) {
    console.error("Error fetching stats:", e);
  }
}

// ──────────────────────────────────────────────────────────────
// 13. NAVBAR USER INFO
// ──────────────────────────────────────────────────────────────

async function initNavbarUser() {
  const token = store('token');
  let user = store('user');

  // If token exists but no user data cached, fetch it
  if (token && !user) {
    try {
      const res = await fetch(API_BASE + '/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        user = data.data;
        store('user', user);
      } else {
        // Token invalid
        store('token', null);
      }
    } catch (err) {
      console.error("Auth verify error:", err);
    }
  }

  // Build dropdown contents
  buildDropdownMenu(user);

  const avatarPlaceholder = document.getElementById('navbar-avatar');
  if (avatarPlaceholder && user) {
    const avatarEl = buildAvatarElement(user.avatar, user.fullname, 'size-md');
    avatarEl.id = 'navbar-avatar';
    avatarEl.classList.add('avatar-dropdown-trigger');
    avatarPlaceholder.replaceWith(avatarEl);
  } else if (avatarPlaceholder) {
    const guestEl = document.createElement('div');
    guestEl.className = 'initials-avatar size-md avatar-dropdown-trigger';
    guestEl.textContent = '?';
    guestEl.id = 'navbar-avatar';
    avatarPlaceholder.replaceWith(guestEl);
  }

  const nameEl = document.getElementById('navbar-username');
  if (nameEl && user) nameEl.textContent = user.fullname || user.username;

  if (!user) {
    const loginLinkEl = document.getElementById('nav-login-link');
    if (loginLinkEl) loginLinkEl.style.display = 'flex';
    const avatarWrap = document.getElementById('nav-avatar-wrap');
    if (avatarWrap) avatarWrap.style.display = 'none';
  } else {
    const loginLinkEl = document.getElementById('nav-login-link');
    if (loginLinkEl) loginLinkEl.style.display = 'none';
    const avatarWrap = document.getElementById('nav-avatar-wrap');
    if (avatarWrap) avatarWrap.style.display = 'flex';
  }
}

/** Centralized Logout: Clears all possible auth keys and redirects */
function handleLogout() {
  // Explicitly remove requested token and user keys
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  
  // Additional safety to comprehensively clear any remaining auth artifacts
  localStorage.clear();
  
  // Also clear any session indicators
  sessionStorage.clear(); 
  
  showToast('Logged out successfully.', 'success');
  console.log('✅ [LOGOUT] Session cleared. Redirecting to home...');
  
  setTimeout(() => { 
    window.location.href = 'index.html'; 
  }, 800);
}

function initLogout() {
  // Intercept ALL possible logout triggers:
  // - #logout-btn (navbar dropdown button)
  // - .logout-item (any element with this class)
  // - .sidebar-logout (sidebar logout link/button)
  // - Any <a> or <button> whose text content includes "logout"
  // NOTE: e.target may be a child element (e.g. the <i> icon inside the link),
  //       so we always use closest() to walk up to the clickable element.
  document.addEventListener('click', (e) => {
    const clickedEl = e.target;

    // Check if the clicked element OR any ancestor matches logout selectors
    const logoutTarget =
      clickedEl.closest('#logout-btn') ||
      clickedEl.closest('.logout-item') ||
      clickedEl.closest('.sidebar-logout') ||
      (() => {
        const el = clickedEl.closest('a, button');
        return el && el.textContent.trim().toLowerCase().includes('logout') ? el : null;
      })();

    if (logoutTarget) {
      e.preventDefault();
      handleLogout();
    }
  });
}

// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// 14. SAVED QUESTIONS & ACTIVITY
// ──────────────────────────────────────────────────────────────

async function handleSaveQuestion(qId, event) {
  if (event) event.stopPropagation();
  const token = store('token');
  if (!token) { showToast('Please log in to save questions.', 'warning'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/questions/${qId}/save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const isSaved = data.isSaved;

      // ── Sync savedQuestions in localStorage ──
      const currentUser = store('user');
      if (currentUser) {
        if (!currentUser.savedQuestions) currentUser.savedQuestions = [];
        // Compare as strings to handle ObjectId vs plain string mismatch
        const idx = currentUser.savedQuestions.findIndex(id => id.toString() === qId.toString());
        if (isSaved && idx === -1) currentUser.savedQuestions.push(qId);
        if (!isSaved && idx !== -1) currentUser.savedQuestions.splice(idx, 1);
        store('user', currentUser);
      }

      // ── Immediately update ALL save buttons for this question ──
      document.querySelectorAll(`.save-btn[data-qid="${qId}"], .save-btn[onclick*="${qId}"]`).forEach(btn => {
        if (isSaved) {
          btn.classList.add('active');
          btn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
        } else {
          btn.classList.remove('active');
          btn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Save`;
        }
      });

      // Also try to find buttons in question cards via data-id on the card
      const card = document.querySelector(`.question-card[data-id="${qId}"]`);
      if (card) {
        const saveBtn = card.querySelector('.save-btn');
        if (saveBtn) {
          if (isSaved) {
            saveBtn.classList.add('active');
            saveBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Saved`;
          } else {
            saveBtn.classList.remove('active');
            saveBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Save`;
          }
        }
      }

      showToast(isSaved ? 'Question saved! ✓' : 'Removed from saved.', 'success');
      
      // Reload saved page if we're on it
      if (document.getElementById('user-saved-list')) loadSavedQuestions();
    } else {
      showToast(data.error || 'Error saving question.', 'danger');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('Error saving question.', 'danger');
  }
}

async function loadSavedQuestions() {
  const container = document.getElementById('user-saved-list');
  if (!container) return;

  const token = store('token');
  if (!token) { container.innerHTML = '<p>Please log in to view saved questions.</p>'; return; }

  try {
    const res = await fetch(API_BASE + '/api/questions/saved', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.data) {
      const questions = data.data;
      if (questions.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-regular fa-bookmark"></i>
            <h3>No saved questions</h3>
            <p>You have not saved any questions yet. Browse questions to find something interesting!</p>
            <a href="questions.html" class="btn btn-primary btn-sm">Browse Questions</a>
          </div>`;
      } else {
        const cardsHtml = await Promise.all(questions.map(q => buildQuestionCard(q)));
        container.innerHTML = `<div class="user-saved-list">${cardsHtml.join('')}</div>`;
      }
    }
  } catch (err) {
    container.innerHTML = 'Error loading saved questions.';
  }
}

async function initActivityPage() {
  const container = document.getElementById('user-activity-list');
  if (!container) return;

  const token = store('token');
  if (!token) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-lock"></i><h3>Login required</h3><p>Please <a href="login.html">log in</a> to view your activity.</p></div>`;
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/activity/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const activities = data.data;
      if (activities.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-chart-line"></i>
            <h3>No activity yet</h3>
            <p>Your timeline is empty. Start by asking or answering a question!</p>
          </div>`;
      } else {
        const icons = { question: 'fa-circle-question', answer: 'fa-comment-dots', vote: 'fa-arrow-up' };
        const labels = { question: 'Question Posted', answer: 'Answer Given', vote: 'Vote Cast' };

        container.innerHTML = `
        <div class="activity-list">
          ${activities.map((a, idx) => `
            <div class="activity-item activity-clickable" data-idx="${idx}" style="cursor:pointer;" title="Click to view details">
              <div class="activity-icon ${a.type}">
                <i class="fa-solid ${icons[a.type] || 'fa-circle'}"></i>
              </div>
              <div class="activity-content" style="flex:1;">
                <div class="activity-text">${escapeHtml(a.text)}</div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
                  <span class="activity-badge activity-badge-${a.type}">${labels[a.type] || a.type}</span>
                  <div class="activity-time">${timeAgo(a.createdAt)} &middot; ${new Date(a.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                </div>
              </div>
              <div class="activity-arrow" style="color:var(--text-muted);font-size:.85rem;"><i class="fa-solid fa-chevron-right"></i></div>
            </div>
          `).join('')}
        </div>`;

        // Store activities for detail lookup
        window._lcActivities = activities;

        // Attach click handlers
        container.querySelectorAll('.activity-clickable').forEach(el => {
          el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.idx);
            showActivityDetail(window._lcActivities[idx]);
          });
        });
      }
    }
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>Error</h3><p>Could not load activity feed.</p></div>';
  }
}

function showActivityDetail(activity) {
  // Remove existing panel if any
  const existing = document.getElementById('activity-detail-panel');
  if (existing) existing.remove();

  const icons = { question: 'fa-circle-question', answer: 'fa-comment-dots', vote: 'fa-arrow-up' };
  const labels = { question: 'Question', answer: 'Answer', vote: 'Vote' };

  const answerSection = activity.answerText ? `
    <div style="margin-top:16px;padding:12px 14px;background:var(--bg-card);border-radius:8px;border-left:3px solid var(--primary);">
      <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:6px;">Your Answer</div>
      <div style="font-size:.875rem;color:var(--text-main);line-height:1.6;">${escapeHtml(activity.answerText).replace(/\n/g,'<br>')}</div>
    </div>` : '';

  const questionLink = activity.questionId ? `
    <a href="questions.html" onclick="sessionStorage.setItem('lc_open_question','${activity.questionId}');return true;"
       class="btn btn-primary btn-sm" style="margin-top:16px;display:inline-flex;align-items:center;gap:6px;">
      <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Question
    </a>` : '';

  const panel = document.createElement('div');
  panel.id = 'activity-detail-panel';
  panel.innerHTML = `
    <div class="activity-detail-overlay" onclick="document.getElementById('activity-detail-panel').remove()"></div>
    <div class="activity-detail-modal">
      <div class="activity-detail-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="activity-icon ${activity.type}" style="margin:0;width:36px;height:36px;flex-shrink:0;">
            <i class="fa-solid ${icons[activity.type] || 'fa-circle'}"></i>
          </div>
          <div>
            <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--primary-light);">${labels[activity.type] || activity.type} Activity</div>
            <div style="font-size:.8rem;color:var(--text-muted);">${new Date(activity.createdAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})}</div>
          </div>
        </div>
        <button onclick="document.getElementById('activity-detail-panel').remove()" 
          style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;padding:4px;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="activity-detail-body">
        <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:6px;">Question</div>
        <div style="font-size:1rem;font-weight:600;color:var(--text-main);line-height:1.45;">${escapeHtml(activity.questionTitle || 'Unknown Question')}</div>
        ${answerSection}
        ${questionLink}
      </div>
    </div>`;

  document.body.appendChild(panel);
  // Animate in
  requestAnimationFrame(() => panel.querySelector('.activity-detail-modal').classList.add('show'));
}



async function initMyQuestions() {
  const container = document.getElementById('my-questions-list');
  if (!container) return;

  const token = store('token');
  if (!token) { container.innerHTML = '<p>Please log in.</p>'; return; }

  try {
    const res = await fetch(API_BASE + '/api/questions/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const questions = data.data;
      if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state">You haven\'t posted any questions yet.</div>';
      } else {
        const cardsHtml = await Promise.all(questions.map(q => buildQuestionCard(q)));
        container.innerHTML = cardsHtml.join('');
      }
    }
  } catch (err) {
    container.innerHTML = 'Error loading your questions.';
  }
}

// ──────────────────────────────────────────────────────────────
// 15. NOTIFICATIONS
// ──────────────────────────────────────────────────────────────

async function initNotifications() {
  const trigger = document.getElementById('notifications-dropdown-trigger');
  if (!trigger) return;

  const token = store('token');
  if (!token) {
    trigger.style.display = 'none';
    return;
  }

  // Handle dropdown toggle
  const menu = document.getElementById('notifications-menu');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
    // Close other dropdowns
    document.querySelector('.avatar-dropdown-menu')?.classList.add('hidden');
  });

  try {
    const res = await fetch(API_BASE + '/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const notifications = data.data;
      const unreadCount = notifications.filter(n => !n.isRead).length;
      
      const badge = document.getElementById('notifications-badge');
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }

      const list = document.getElementById('notifications-list');
      if (notifications.length === 0) {
        list.innerHTML = `<div class="notifications-empty"><i class="fa-regular fa-bell"></i><p>No new notifications</p></div>`;
      } else {
        list.innerHTML = notifications.map(n => `
          <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}" onclick="handleNotificationClick('${n._id}', '${n.itemId}', '${n.type}', event)">
            <div class="ni-icon ${n.type}">
              <i class="fa-solid ${n.type === 'vote' ? 'fa-arrow-up' : 'fa-comment'}"></i>
            </div>
            <div class="ni-content">
              <div class="ni-msg">${escapeHtml(n.message)}</div>
              <div class="ni-time">${timeAgo(n.createdAt)}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Error fetching notifications:", err);
  }

  document.getElementById('mark-notifications-read')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    menu.classList.add('hidden');
    // Actual server call
    await fetch(API_BASE + '/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Refresh UI to mark all read
    document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
    const badge = document.getElementById('notifications-badge');
    if (badge) badge.style.display = 'none';
  });
}

function handleNotificationClick(id, itemId, type, event) {
  const token = store('token');
  fetch(`${API_BASE}/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  window.location.href = `questions.html?id=${itemId}#answers-section-${itemId}`;
}

// ──────────────────────────────────────────────────────────────
// 16. USERS & LEADERBOARD
// ──────────────────────────────────────────────────────────────

async function initTagsPage() {
  const container = document.getElementById('tags-grid');
  if (!container) return;

  try {
    const res = await fetch(API_BASE + '/api/tags');
    const data = await res.json();
    if (data.success) {
      const tags = data.data;
      if (tags.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-tags"></i>
            <h3>No tags found</h3>
            <p>Looks like there are no tags yet. Be the first to create one by asking a question!</p>
            <a href="ask-question.html" class="btn btn-primary btn-sm">Ask a Question</a>
          </div>`;
      } else {
        container.innerHTML = tags.map(t => {
          const hotBadge = t.isHot ? '<span class="tag-trend-badge hot"><i class="fa-solid fa-fire"></i> Hot</span>' : '';
          const trendBadge = t.isTrending ? '<span class="tag-trend-badge"><i class="fa-solid fa-arrow-trend-up"></i> Trending</span>' : '';
          const progress = Math.min((t.count / 10) * 100, 100); // Progress bar based on count (max 10)

          return `
          <div class="tag-card premium">
            <div class="tag-card-body">
              <div style="display:flex;align-items:center;margin-bottom:12px;">
                <div class="tag-name">#${escapeHtml(t.name)}</div>
                ${hotBadge}
                ${trendBadge}
              </div>
              <p class="tag-description">${escapeHtml(t.description || 'Discuss and explore questions related to ' + t.name + '.')}</p>
              <div class="tag-progress-bar">
                <div class="tag-progress-fill" style="width: ${progress}%"></div>
              </div>
            </div>
            <div class="tag-card-footer">
              <span class="tag-count"><i class="fa-solid fa-circle-question"></i> ${t.count} questions</span>
              <a href="questions.html?tag=${encodeURIComponent(t.name)}" class="btn-view-tag">View Topics</a>
            </div>
          </div>
        `; }).join('');
      }

      // Search functionality
      const searchInput = document.getElementById('tags-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.toLowerCase().trim();
          const cards = container.querySelectorAll('.tag-card');
          cards.forEach(card => {
            const name = card.querySelector('.tag-name').textContent.toLowerCase();
            card.style.display = name.includes(q) ? 'flex' : 'none';
          });
        });
      }
    }
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Error loading tags.</div>';
  }
}

async function initUsersPage(sort = 'all') {
  const container = document.getElementById('users-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/users?sort=${sort}`);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch');
    let users = data.data || [];
    renderUsersList(users, container);

    const searchInput = document.getElementById('users-search');
    searchInput && searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      renderUsersList(users.filter(u => (u.fullname||'').toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q)), container);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Error loading users</div>`;
  }
}

function renderUsersList(users, container) {
  if (!users.length) { container.innerHTML = `<div class="empty-state">No users found</div>`; return; }
  container.innerHTML = users.map(u => {
    const avatarEl = buildAvatarElement(u.avatar, u.fullname, 'size-xl');
    return `
    <div class="user-card">
      ${avatarEl.outerHTML}
      <div class="user-name">${escapeHtml(u.fullname)}</div>
      <div class="user-handle">@${escapeHtml(u.username)}</div>
      <div class="user-bio">${escapeHtml(u.bio || 'Community member')}</div>
      <div class="user-card-stats">
        <div class="ucs-item"><span class="ucs-value">${u.questions||0}</span><span class="ucs-label">Qs</span></div>
        <div class="ucs-item"><span class="ucs-value">${u.answers||0}</span><span class="ucs-label">Ans</span></div>
        <div class="ucs-item"><span class="ucs-value">${u.reputation||0}</span><span class="ucs-label">Rep</span></div>
      </div>
    </div>`;
  }).join('');
}

async function initLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(API_BASE + '/api/users/leaderboard');
    const data = await res.json();
    if (data.success) {
      const users = data.data;
      
      // Update Podium (Top 3)
      const podiumData = users.slice(0, 3);
      podiumData.forEach((u, i) => {
        const rank = i + 1;
        const nameEl = document.getElementById(`podium-name-${rank}`);
        const scoreEl = document.getElementById(`podium-score-${rank}`);
        const podiumItem = document.querySelector(`.podium-${rank}`);
        if (nameEl) nameEl.textContent = u.fullname;
        if (scoreEl) scoreEl.textContent = (u.reputation || 0).toLocaleString() + ' pts';
        
        // Fix podium image
        if (podiumItem) {
          const img = podiumItem.querySelector('img');
          if (img) img.src = u.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + u.username;
        }
      });

      const rankClasses = ['gold', 'silver', 'bronze'];
      tbody.innerHTML = users.map((u, i) => {
        const avatarEl = buildAvatarElement(u.avatar, u.fullname, 'size-md');
        return `
        <tr>
          <td><span class="lb-rank-num ${rankClasses[i] || ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</span></td>
          <td>
            <div class="lb-user">
              ${avatarEl.outerHTML}
              <div>
                <div class="lb-name">${escapeHtml(u.fullname)}</div>
                <div class="lb-handle">@${escapeHtml(u.username)}</div>
              </div>
            </div>
          </td>
          <td>${(u.reputation||0).toLocaleString()}</td>
          <td>${u.answers || 0}</td>
          <td>${u.questions || 0}</td>
          <td><span class="badge badge-${i < 3 ? 'warning' : 'primary'}">${i === 0 ? 'Legend' : i < 3 ? 'Expert' : 'Member'}</span></td>
        </tr>`;
      }).join('');
    }
  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

async function initContributors() {
  const container = document.getElementById('top-contributors');
  if (!container) return;

  try {
    const res = await fetch(API_BASE + '/api/users/leaderboard');
    const data = await res.json();
    if (data.success) {
      const users = data.data.slice(0, 5);
      const rankClass = ['gold', 'silver', 'bronze'];
      container.innerHTML = users.map((u, i) => {
        const avatarEl = buildAvatarElement(u.avatar, u.fullname, 'size-sm');
        return `
        <div class="contributor-item">
          <div class="contributor-rank ${rankClass[i] || ''}">${i + 1}</div>
          ${avatarEl.outerHTML}
          <div class="contributor-info">
            <div class="contributor-name">${escapeHtml(u.fullname)}</div>
            <div class="contributor-rep">${(u.reputation||0).toLocaleString()} pts</div>
          </div>
          <div class="contributor-score">${u.answers||0}</div>
        </div>`;
      }).join('');
    }
  } catch (err) {}
}


// ──────────────────────────────────────────────────────────────
// 18. FINAL INIT
// ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNavbarUser();
  initNotifications();
  initFilterTabs();
  highlightSidebarLink();
  setupGlobalDelegation();
  initLogout(); // Fixed: Added logout initialization
  
  if (document.getElementById('dashboard-questions')) initDashboard();
  if (document.getElementById('questions-list')) initQuestionsPage();
  if (document.getElementById('profile-page')) initProfilePage();
  if (document.getElementById('ask-question-form')) initAskQuestion();
  if (document.getElementById('user-activity-list')) initActivityPage();
  if (document.getElementById('user-saved-list')) loadSavedQuestions();
  if (document.getElementById('my-questions-list')) initMyQuestions();
  if (document.getElementById('users-grid')) initUsersPage();
  if (document.getElementById('leaderboard-tbody')) initLeaderboard();
  if (document.getElementById('top-contributors')) initContributors();
  if (document.getElementById('tags-grid')) initTagsPage();

  // Initialize Auth Forms if present
  if (document.getElementById('login-form')) initLoginForm();
  if (document.getElementById('signup-form')) initSignupForm();
  if (document.getElementById('forgot-password-form')) initForgotPasswordForm();
  if (document.getElementById('reset-password-form')) initResetPasswordForm();

  // Initialize Global Navbar Dropdowns
  initNavbarDropdown();
});
