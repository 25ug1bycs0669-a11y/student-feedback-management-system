const API_BASE = (window.CLASSVOICE_API_BASE || '/api').replace(/\/+$/, '');
const appRoot = document.getElementById('app');
const topbar = document.querySelector('.topbar');
const topbarActions = document.getElementById('topbar-actions');
const toast = document.getElementById('toast');
let selectedRating = 0;
let feedbackCache = [];
let toastTimer;

const session = {
  get token() { return localStorage.getItem('classvoice_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('classvoice_user') || 'null'); } catch { return null; }
  },
  save(data) {
    localStorage.setItem('classvoice_token', data.token);
    localStorage.setItem('classvoice_user', JSON.stringify(data.user));
  },
  clear() {
    localStorage.removeItem('classvoice_token');
    localStorage.removeItem('classvoice_user');
  },
};

function notify(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast visible${type === 'error' ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3400);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the feedback server at ${API_BASE}. Make sure the backend is running and the API URL is configured correctly.`);
    }
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && session.token) {
      session.clear();
      updateHeader();
    }
    throw new Error(payload.message || 'Something went wrong. Please try again.');
  }
  return payload;
}

function updateHeader() {
  const user = session.user;
  if (!user) {
    topbarActions.innerHTML = '<button class="button button-quiet" data-page="admin-login">Admin</button><button class="button button-primary" data-page="login">Student login <span aria-hidden="true">↗</span></button>';
  } else {
    topbarActions.innerHTML = `<span class="signed-in">Hi, ${escapeHtml(user.name.split(' ')[0])}</span><button class="button button-soft" data-page="${user.role === 'admin' ? 'admin-dashboard' : 'dashboard'}">Dashboard</button><button class="button button-quiet" data-action="logout">Log out</button>`;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function stars(rating) {
  return `<span class="rating" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function homePage() {
  return `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow"><span class="eyebrow-dot"></span> A better way to be heard</span>
        <h1>Your voice can<br>shape a <em>better</em><br>classroom.</h1>
        <p class="hero-description">A thoughtful space for students to share honest feedback and for educators to turn it into meaningful change.</p>
        <div class="hero-actions"><button class="button button-primary" data-page="register">Share your feedback <span aria-hidden="true">↗</span></button><button class="button button-outline" data-page="login">Student sign in</button></div>
        <div class="avatar-proof"><div class="avatar-stack"><span class="avatar">AR</span><span class="avatar">JM</span><span class="avatar">SK</span><span class="avatar">+</span></div><span><strong>Every perspective matters.</strong><br>Designed for real student voices</span></div>
      </div>
      <div class="hero-visual" aria-label="Preview of the feedback analytics dashboard">
        <div class="hero-orbit"></div>
        <div class="dashboard-preview">
          <div class="preview-head"><div><div class="preview-title">Learning pulse</div><div class="preview-sub">Your campus, listening</div></div><span class="preview-badge">THIS SEMESTER</span></div>
          <div class="preview-chart"><span class="chart-bar" style="height:42%"></span><span class="chart-bar" style="height:62%"></span><span class="chart-bar" style="height:54%"></span><span class="chart-bar" style="height:78%"></span><span class="chart-bar" style="height:64%"></span><span class="chart-bar" style="height:91%"></span><span class="chart-bar" style="height:74%"></span></div>
          <div class="preview-chart-labels"><span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span></div>
          <div class="preview-bottom"><div class="preview-stat"><strong>4.8 <span style="color:#e4a247;font-size:12px">★</span></strong><span>AVERAGE RATING</span></div><div class="preview-stat"><strong>1,284</strong><span>STUDENT VOICES</span></div></div>
        </div>
        <div class="floating-note note-rating"><span class="stars">★★★★★</span><strong>Clear, supportive & inspiring</strong></div>
        <div class="floating-note note-submitted"><span class="note-check">✓</span><span>Feedback shared<strong>Thanks for speaking up!</strong></span></div>
      </div>
    </section>
    <section class="section" id="how-it-works">
      <div class="section-heading"><span class="eyebrow"><span class="eyebrow-dot"></span> Simple by design</span><h2>Small reflections.<br>Big improvements.</h2><p>Sharing feedback should feel easy, safe, and worth your time. Here's how Classvoice brings the conversation together.</p></div>
      <div class="steps-grid">
        <article class="step-card"><span class="step-number">01 / SHARE</span><div class="step-icon">✎</div><h3>Say what you think</h3><p>Offer a rating and a few honest words about a course or teaching experience.</p></article>
        <article class="step-card"><span class="step-number">02 / LISTEN</span><div class="step-icon">◎</div><h3>Be heard with care</h3><p>Your feedback is organized thoughtfully so the people who can help can learn from it.</p></article>
        <article class="step-card"><span class="step-number">03 / GROW</span><div class="step-icon">↗</div><h3>Make learning better</h3><p>Clear insights help educators celebrate what works and improve what doesn't.</p></article>
      </div>
    </section>
    <section class="quote-section" id="why-feedback"><div class="quote-mark">“</div><blockquote>Good feedback isn't about finding fault. It's about making space for every learner to thrive.</blockquote><span class="quote-credit">A more thoughtful classroom starts with listening.</span></section>`;
}

function authPage(mode) {
  const isRegister = mode === 'register';
  const isAdmin = mode === 'admin-login';
  const endpoint = isRegister ? '/auth/register' : (isAdmin ? '/auth/admin/login' : '/auth/login');
  const title = isRegister ? 'Create your account' : (isAdmin ? 'Administrator sign in' : 'Welcome back');
  const subtitle = isRegister ? 'A few details and you’re ready to share.' : (isAdmin ? 'Sign in to review feedback and learning trends.' : 'Pick up where your voice makes a difference.');
  const asideTitle = isAdmin ? 'Listen closer. Lead better.' : 'Your perspective belongs here.';
  return `<section class="auth-layout">
    <div class="auth-aside"><span class="eyebrow"><span class="eyebrow-dot"></span> ${isAdmin ? 'ADMIN PORTAL' : 'STUDENT COMMUNITY'}</span><h1>${asideTitle}</h1><p>${isAdmin ? 'Bring student voices into focus. Review feedback, explore trends, and help your learning community grow.' : 'Every thoughtful comment makes learning a little better. Share your experience in a space built around respect and progress.'}</p></div>
    <form class="auth-card" id="auth-form" data-endpoint="${endpoint}" data-mode="${mode}">
      <h2>${title}</h2><p>${subtitle}</p>
      ${isRegister ? `<div class="form-field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="e.g. Avery Johnson"></div>
      <div class="form-row"><div class="form-field"><label for="studentId">Student ID</label><input id="studentId" name="studentId" required minlength="2" maxlength="30" placeholder="e.g. STU-1042"></div><div class="form-field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="you@school.edu"></div></div>` :
      `<div class="form-field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="${isAdmin ? 'admin@school.edu' : 'you@school.edu'}"></div>`}
      <div class="form-field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required ${isRegister ? 'minlength="8"' : ''} placeholder="${isRegister ? 'At least 8 characters' : 'Enter your password'}"></div>
      <button class="button button-primary auth-submit" type="submit">${isRegister ? 'Create student account' : 'Sign in'} <span aria-hidden="true">↗</span></button>
      <p class="form-switch">${isRegister ? 'Already have an account?' : (isAdmin ? 'Are you a student?' : 'New to Classvoice?')} <button class="text-button" type="button" data-page="${isRegister ? 'login' : (isAdmin ? 'login' : 'register')}">${isRegister || isAdmin ? 'Sign in' : 'Create an account'}</button></p>
    </form>
  </section>`;
}

function dashboardLayout(content, active) {
  const user = session.user;
  const admin = user?.role === 'admin';
  const nav = admin
    ? [['admin-dashboard', '▦', 'Overview'], ['admin-feedback', '☷', 'All feedback']]
    : [['dashboard', '⌂', 'Overview'], ['submit', '✎', 'Share feedback'], ['history', '◷', 'My feedback']];
  return `<section class="dashboard">
    <header class="dashboard-header"><div><span class="eyebrow"><span class="eyebrow-dot"></span> ${admin ? 'ADMIN WORKSPACE' : 'STUDENT SPACE'}</span><h1>${content.title}</h1><p>${content.subtitle}</p></div>${content.action || ''}</header>
    <div class="dashboard-layout"><nav class="side-nav" aria-label="Dashboard navigation">${nav.map(([page, icon, label]) => `<button class="${active === page ? 'active' : ''}" data-page="${page}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><div class="dashboard-content">${content.body}</div></div>
  </section>`;
}

function studentOverview() {
  return dashboardLayout({
    title: `Good to see you, ${escapeHtml(session.user.name.split(' ')[0])}.`,
    subtitle: 'Your voice helps make every learning experience better.',
    action: '<button class="button button-primary" data-page="submit">Share feedback <span aria-hidden="true">↗</span></button>',
    body: '<div class="loading">Loading your learning snapshot…</div>',
  }, 'dashboard');
}

function feedbackCard(item) {
  return `<article class="feedback-item"><div class="feedback-avatar">${escapeHtml((item.teacherName || '?').slice(0, 1).toUpperCase())}</div><div class="feedback-item-main"><strong>${escapeHtml(item.courseName)} · ${escapeHtml(item.teacherName)}</strong><span>${formatDate(item.createdAt)}</span><p>${escapeHtml(item.comment)}</p></div>${stars(item.rating)}</article>`;
}

function renderStudentOverview(data) {
  const latest = data.feedback.slice(0, 3);
  const uniqueCourses = new Set(data.feedback.map((item) => item.courseName)).size;
  const rows = [...new Set(data.feedback.map((item) => item.courseName))].slice(0, 4).map((course) => {
    const items = data.feedback.filter((item) => item.courseName === course);
    const average = items.reduce((sum, item) => sum + item.rating, 0) / items.length;
    return `<div><div class="course-row-head"><span>${escapeHtml(course)}</span><span>${average.toFixed(1)} / 5</span></div><div class="progress-track"><span style="width:${average * 20}%"></span></div></div>`;
  }).join('');
  const content = `<div class="stats-grid"><article class="stat-card"><span>FEEDBACK SHARED</span><strong>${data.feedback.length}</strong><small>Every reflection counts</small></article><article class="stat-card"><span>COURSES REVIEWED</span><strong>${uniqueCourses}</strong><small>Your learning journey</small></article><article class="stat-card"><span>YOUR AVERAGE RATING</span><strong>${data.average ? `${data.average.toFixed(1)} <span style="color:#e4a247;font-size:15px">★</span>` : '—'}</strong><small>Across your feedback</small></article></div>
    <div class="content-grid"><section class="panel"><div class="panel-heading"><h2>Your recent reflections</h2><button class="text-button" data-page="history">View all</button></div><div class="feedback-list">${latest.length ? latest.map(feedbackCard).join('') : '<div class="empty-state">Your first reflection is just a thought away.</div>'}</div></section><section class="panel"><div class="panel-heading"><h2>Course snapshot</h2><span>Your ratings</span></div><div class="course-list">${rows || '<div class="empty-state">Course insights will show up here.</div>'}</div></section></div>`;
  appRoot.innerHTML = dashboardLayout({
    title: `Good to see you, ${escapeHtml(session.user.name.split(' ')[0])}.`,
    subtitle: 'Your voice helps make every learning experience better.',
    action: '<button class="button button-primary" data-page="submit">Share feedback <span aria-hidden="true">↗</span></button>',
    body: content,
  }, 'dashboard');
}

function feedbackFormPage() {
  appRoot.innerHTML = dashboardLayout({
    title: 'Share a reflection.',
    subtitle: 'A little feedback can make a meaningful difference.',
    body: `<section class="panel feedback-form-panel">    <div class="panel-heading"><h2>Your learning experience</h2><span>Visible to school administrators</span></div><form id="feedback-form">
      <div class="form-row"><div class="form-field"><label for="courseName">Course</label><select id="courseName" name="courseName" required><option value="" selected disabled>Select a course</option><option>Computer Science</option><option>Mathematics</option><option>Physics</option><option>Chemistry</option><option>Biology</option><option>English</option><option>Business Studies</option><option value="Other">Other</option></select></div><div class="form-field"><label for="teacherName">Teacher name</label><input id="teacherName" name="teacherName" required minlength="2" maxlength="100" placeholder="e.g. Jordan Lee"></div></div>
      <div class="form-field" id="custom-course-field" hidden><label for="customCourseName">Course name</label><input id="customCourseName" name="customCourseName" minlength="2" maxlength="120" placeholder="Enter your course name"></div>
      <div class="form-field"><label>Your overall rating</label><div class="rating-select" role="radiogroup" aria-label="Rating from one to five">${[1, 2, 3, 4, 5].map((rating) => `<button type="button" data-rating="${rating}" role="radio" aria-checked="false" aria-label="${rating} star${rating > 1 ? 's' : ''}">★</button>`).join('')}</div></div>
      <div class="form-field"><label for="comment">Comments <span style="font-weight:400;color:#87918a">(optional)</span></label><textarea id="comment" name="comment" minlength="3" maxlength="1000" placeholder="Share what helped you learn, or what could make the experience even better…"></textarea></div>
      <button class="button button-primary" type="submit">Submit feedback <span aria-hidden="true">↗</span></button>
    </form></section>`,
  }, 'submit');
}

async function historyPage() {
  appRoot.innerHTML = dashboardLayout({ title: 'Your feedback history.', subtitle: 'A record of the moments you chose to make learning better.', body: '<div class="loading">Loading your feedback…</div>' }, 'history');
  try {
    const { feedback } = await api('/feedback/history');
    feedbackCache = feedback;
    const body = feedback.length ? `<div class="feedback-list">${feedback.map(feedbackCard).join('')}</div>` : '<section class="panel empty-state">No feedback shared yet. When you do, it will be saved here.</section>';
    appRoot.innerHTML = dashboardLayout({ title: 'Your feedback history.', subtitle: 'A record of the moments you chose to make learning better.', body }, 'history');
  } catch (error) { notify(error.message, 'error'); }
}

async function adminOverview() {
  appRoot.innerHTML = dashboardLayout({ title: 'The listening room.', subtitle: 'See what students are saying and where learning is growing.', body: '<div class="loading">Gathering your school’s feedback…</div>' }, 'admin-dashboard');
  try {
    const data = await api('/feedback/stats');
    const max = Math.max(1, ...data.courses.map((course) => course.count));
    const courses = data.courses.map((course) => `<div><div class="course-row-head"><span>${escapeHtml(course.courseName)}</span><span>${course.averageRating.toFixed(1)} ★ · ${course.count} response${course.count === 1 ? '' : 's'}</span></div><div class="progress-track"><span style="width:${course.averageRating * 20}%"></span></div></div>`).join('');
    const recent = data.recent.map((item) => `<article class="feedback-item"><div class="feedback-avatar">${escapeHtml((item.studentName || '?').slice(0, 1).toUpperCase())}</div><div class="feedback-item-main"><strong>${escapeHtml(item.courseName)} · ${escapeHtml(item.teacherName)}</strong><span>${escapeHtml(item.studentName)} · ${formatDate(item.createdAt)}</span><p>${escapeHtml(item.comment)}</p></div>${stars(item.rating)}</article>`).join('');
    const body = `<div class="stats-grid"><article class="stat-card"><span>TOTAL REFLECTIONS</span><strong>${data.total}</strong><small>Student voices received</small></article><article class="stat-card"><span>AVERAGE EXPERIENCE</span><strong>${data.averageRating.toFixed(1)} <span style="color:#e4a247;font-size:15px">★</span></strong><small>Out of five stars</small></article><article class="stat-card"><span>COURSES WITH FEEDBACK</span><strong>${data.courses.length}</strong><small>Learning areas represented</small></article></div>
      <div class="content-grid"><section class="panel"><div class="panel-heading"><h2>Course insights</h2><span>By average rating</span></div><div class="course-list">${courses || '<div class="empty-state">Feedback trends will appear here.</div>'}</div></section><section class="panel"><div class="panel-heading"><h2>Latest voices</h2><button class="text-button" data-page="admin-feedback">See all</button></div><div class="feedback-list">${recent || '<div class="empty-state">No feedback to show yet.</div>'}</div></section></div>`;
    appRoot.innerHTML = dashboardLayout({ title: 'The listening room.', subtitle: 'See what students are saying and where learning is growing.', body }, 'admin-dashboard');
  } catch (error) { notify(error.message, 'error'); }
}

async function adminFeedbackPage(filters = {}) {
  appRoot.innerHTML = dashboardLayout({ title: 'Every student voice.', subtitle: 'Review feedback and find patterns worth acting on.', body: '<div class="loading">Loading feedback…</div>' }, 'admin-feedback');
  try {
    const params = new URLSearchParams();
    if (filters.studentId) params.set('studentId', filters.studentId);
    if (filters.teacher) params.set('teacher', filters.teacher);
    if (filters.course) params.set('course', filters.course);
    const queryString = params.toString();
    const { feedback } = await api(`/feedback${queryString ? `?${queryString}` : ''}`);
    feedbackCache = feedback;
    const rows = feedback.map((item) => `<tr><td><strong>${escapeHtml(item.studentName)}</strong></td><td>${escapeHtml(item.studentId)}</td><td>${escapeHtml(item.studentEmail)}</td><td>${escapeHtml(item.teacherName)}</td><td>${escapeHtml(item.courseName)}</td><td>${stars(item.rating)}</td><td><p>${escapeHtml(item.comment || '—')}</p></td><td>${formatDate(item.createdAt)}</td><td><button class="delete-feedback" data-delete="${item._id}" aria-label="Delete feedback from ${escapeHtml(item.studentName)}">Delete</button></td></tr>`).join('');
    const body = `<section class="panel"><div class="panel-heading"><h2>Feedback inbox <span style="color:#87918a;font-weight:400">(${feedback.length})</span></h2><div class="toolbar filter-toolbar"><label class="search-field"><span>Student ID</span><input id="filter-student-id" type="search" value="${escapeHtml(filters.studentId || '')}" placeholder="Search ID" aria-label="Filter by student ID"></label><label class="search-field"><span>Teacher</span><input id="filter-teacher" type="search" value="${escapeHtml(filters.teacher || '')}" placeholder="Search teacher" aria-label="Filter by teacher"></label><label class="search-field"><span>Course</span><input id="filter-course" type="search" value="${escapeHtml(filters.course || '')}" placeholder="Search course" aria-label="Filter by course"></label><button class="button button-soft" data-action="search">Search</button><button class="button button-outline" data-action="export" ${feedback.length ? '' : 'disabled'}>Export CSV</button></div></div><div class="table-wrap"><table class="feedback-table"><thead><tr><th>STUDENT NAME</th><th>STUDENT ID</th><th>EMAIL</th><th>TEACHER</th><th>COURSE</th><th>RATING</th><th>COMMENTS</th><th>SUBMITTED</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="9"><div class="empty-state">No feedback matches these filters.</div></td></tr>'}</tbody></table></div></section>`;
    appRoot.innerHTML = dashboardLayout({ title: 'Every student voice.', subtitle: 'Review feedback and find patterns worth acting on.', body }, 'admin-feedback');
  } catch (error) { notify(error.message, 'error'); }
}

async function navigate(page) {
  const user = session.user;
  const studentPages = ['dashboard', 'submit', 'history'];
  const adminPages = ['admin-dashboard', 'admin-feedback'];
  if (studentPages.includes(page) && (!user || user.role !== 'student')) return renderPage('login');
  if (adminPages.includes(page) && (!user || user.role !== 'admin')) return renderPage('admin-login');
  if (page === 'home') {
    appRoot.innerHTML = homePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (page === 'register' || page === 'login' || page === 'admin-login') {
    appRoot.innerHTML = authPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (page === 'dashboard') {
    appRoot.innerHTML = studentOverview();
    try {
      const { feedback } = await api('/feedback/history');
      const average = feedback.length ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0;
      renderStudentOverview({ feedback, average });
    } catch (error) { notify(error.message, 'error'); }
  } else if (page === 'submit') {
    feedbackFormPage();
    selectedRating = 0;
  } else if (page === 'history') await historyPage();
  else if (page === 'admin-dashboard') await adminOverview();
  else if (page === 'admin-feedback') await adminFeedbackPage();
  topbar.classList.remove('nav-open');
  const main = document.querySelector('main');
  if (main) main.focus({ preventScroll: true });
}

function renderPage(page) {
  updateHeader();
  return navigate(page);
}

document.addEventListener('click', async (event) => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    event.preventDefault();
    await renderPage(pageButton.dataset.page);
    return;
  }
  if (event.target.closest('[data-action="logout"]')) {
    session.clear();
    updateHeader();
    notify('You have been signed out.');
    await renderPage('home');
    return;
  }
  const ratingButton = event.target.closest('[data-rating]');
  if (ratingButton) {
    selectedRating = Number(ratingButton.dataset.rating);
    document.querySelectorAll('[data-rating]').forEach((button) => {
      const active = Number(button.dataset.rating) <= selectedRating;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-checked', String(Number(button.dataset.rating) === selectedRating));
    });
  }
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) {
    if (!window.confirm('Delete this feedback? This cannot be undone.')) return;
    try {
      await api(`/feedback/${encodeURIComponent(deleteButton.dataset.delete)}`, { method: 'DELETE' });
      notify('Feedback deleted.');
      await adminFeedbackPage({
        studentId: document.getElementById('filter-student-id')?.value.trim() || '',
        teacher: document.getElementById('filter-teacher')?.value.trim() || '',
        course: document.getElementById('filter-course')?.value.trim() || '',
      });
    } catch (error) { notify(error.message, 'error'); }
  }
  if (event.target.closest('[data-action="search"]')) {
    await adminFeedbackPage({
      studentId: document.getElementById('filter-student-id')?.value.trim() || '',
      teacher: document.getElementById('filter-teacher')?.value.trim() || '',
      course: document.getElementById('filter-course')?.value.trim() || '',
    });
  }
  if (event.target.closest('[data-action="export"]')) {
    const columns = ['Date', 'Student', 'Student ID', 'Email', 'Course', 'Teacher', 'Rating', 'Comment'];
    const rows = feedbackCache.map((item) => [
      formatDate(item.createdAt),
      item.studentName,
      item.studentId,
      item.studentEmail,
      item.courseName,
      item.teacherName,
      item.rating,
      item.comment,
    ]);
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `classvoice-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
});

document.addEventListener('change', (event) => {
  if (event.target.id !== 'courseName') return;
  const customCourseField = document.getElementById('custom-course-field');
  const customCourseInput = document.getElementById('customCourseName');
  const isCustomCourse = event.target.value === 'Other';
  customCourseField.hidden = !isCustomCourse;
  customCourseInput.required = isCustomCourse;
  if (!isCustomCourse) customCourseInput.value = '';
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'auth-form') {
    event.preventDefault();
    const form = event.target;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const data = await api(form.dataset.endpoint, { method: 'POST', body: JSON.stringify(body) });
      session.save(data);
      notify(`Welcome${data.user.name ? `, ${data.user.name.split(' ')[0]}` : ''}!`);
      await renderPage(data.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    } catch (error) {
      notify(error.message, 'error');
    } finally { submit.disabled = false; }
  }
  if (event.target.id === 'feedback-form') {
    event.preventDefault();
    if (!selectedRating) return notify('Choose a star rating before submitting.', 'error');
    const form = event.target;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const body = Object.fromEntries(new FormData(form).entries());
    if (body.courseName === 'Other') body.courseName = body.customCourseName.trim();
    delete body.customCourseName;
    body.rating = selectedRating;
    try {
      await api('/feedback', { method: 'POST', body: JSON.stringify(body) });
      notify('Your reflection has been shared. Thank you!');
      await renderPage('history');
    } catch (error) {
      notify(error.message, 'error');
    } finally { submit.disabled = false; }
  }
});

document.getElementById('mobile-menu').addEventListener('click', (event) => {
  const isOpen = topbar.classList.toggle('nav-open');
  event.currentTarget.setAttribute('aria-expanded', String(isOpen));
});

document.getElementById('year').textContent = String(new Date().getFullYear());
updateHeader();
renderPage(session.user?.role === 'admin' ? 'admin-dashboard' : (session.user?.role === 'student' ? 'dashboard' : 'home'));
