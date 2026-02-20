// ============================================
// NexusAI — Main Application
// ============================================

(function () {
  'use strict';

  // ---- Fetched Data ----
  let LEADS = [];
  let CAMPAIGNS = [];
  let ACTIVITIES = [];

  const CONTENT_TEMPLATES = {
    email: { icon: '📧', name: 'Email', desc: 'Sales & marketing emails' },
    social: { icon: '📱', name: 'Social Post', desc: 'LinkedIn, Twitter, etc.' },
    blog: { icon: '📝', name: 'Blog Outline', desc: 'SEO-optimized articles' },
    ad: { icon: '🎯', name: 'Ad Copy', desc: 'PPC & display ads' },
  };

  // ---- State ----
  let currentPage = 'dashboard';
  let selectedLead = null;
  let chatMessages = [];
  let selectedTemplate = 'email';
  let selectedTone = 'professional';
  let isGenerating = false;
  let generatedContentList = [];
  let authToken = localStorage.getItem('nexus_auth_token') || null;

  // ---- Authentication ----
  function setupAuth() {
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');

    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');

    goToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginView.style.display = 'none';
      registerView.style.display = 'block';
      document.getElementById('register-error').textContent = '';
    });

    goToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerView.style.display = 'none';
      loginView.style.display = 'block';
      document.getElementById('login-error').textContent = '';
    });

    btnLogin.addEventListener('click', async () => {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');

      if (!username || !password) { errorDiv.textContent = 'Please enter both username and password'; return; }

      btnLogin.disabled = true;
      btnLogin.innerHTML = '<div class="spinner"></div>';

      try {
        const res = await fetch('http://localhost:8000/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem('nexus_auth_token', data.username);
          authToken = data.username;
          transitionToApp();
        } else {
          errorDiv.textContent = data.message || 'Login failed';
        }
      } catch (err) {
        errorDiv.textContent = 'Server connection error';
      } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = 'Log In';
      }
    });

    btnRegister.addEventListener('click', async () => {
      const username = document.getElementById('register-username').value;
      const password = document.getElementById('register-password').value;
      const errorDiv = document.getElementById('register-error');

      if (!username || !password) { errorDiv.textContent = 'Please enter both username and password'; return; }

      btnRegister.disabled = true;
      btnRegister.innerHTML = '<div class="spinner"></div>';

      try {
        const res = await fetch('http://localhost:8000/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
          // Auto login after register
          localStorage.setItem('nexus_auth_token', username);
          authToken = username;
          transitionToApp();
        } else {
          errorDiv.textContent = data.message || 'Registration failed';
        }
      } catch (err) {
        errorDiv.textContent = 'Server connection error';
      } finally {
        btnRegister.disabled = false;
        btnRegister.innerHTML = 'Register';
      }
    });
  }

  async function transitionToApp() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app');

    authContainer.style.opacity = '0';
    setTimeout(async () => {
      authContainer.style.display = 'none';
      appContainer.style.display = 'flex';

      // small delay for transition
      setTimeout(() => { appContainer.style.opacity = '1'; }, 50);

      await loadAppData();
      setupNavigation();
      renderPage();

      // Update sidebar name
      const nameEl = document.querySelector('.user-name');
      const avatarEl = document.querySelector('.user-avatar');
      if (nameEl && authToken) {
        nameEl.textContent = authToken;
        avatarEl.textContent = authToken.substring(0, 2).toUpperCase();
      }
    }, 500);
  }

  // ---- Router ----
  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add('active');
    renderPage();
  }

  // ---- Navigation Setup ----
  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
      });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('btn-ai-quick').addEventListener('click', () => {
      navigateTo('assistant');
    });
  }

  // ---- Page Renderer ----
  function renderPage() {
    const container = document.getElementById('page-container');
    container.style.opacity = '0';
    setTimeout(() => {
      switch (currentPage) {
        case 'dashboard': renderDashboard(container); break;
        case 'leads': renderLeads(container); break;
        case 'campaigns': renderCampaigns(container); break;
        case 'assistant': renderAssistant(container); break;
        case 'content': renderContent(container); break;
      }
      container.style.opacity = '1';
      container.style.transition = 'opacity 0.3s ease';
    }, 150);
  }

  // ============== DASHBOARD ==============
  function renderDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1>Welcome back, <span class="gradient-text">Karthik</span></h1>
        <p>Here's what's happening with your sales pipeline today.</p>
      </div>

      <div class="kpi-grid">
        ${renderKPI('Revenue', '$2.4M', '+12.5%', 'positive', 'violet', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.52 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.95-3.12 3.19z', [30, 45, 35, 55, 42, 60, 50, 70, 65, 80, 72, 85])}
        ${renderKPI('Active Leads', '847', '+8.3%', 'positive', 'cyan', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', [20, 25, 30, 28, 35, 40, 38, 45, 50, 48, 55, 60])}
        ${renderKPI('Conversion Rate', '24.8%', '+3.2%', 'positive', 'emerald', 'M22 12h-4l-3 9L9 3l-3 9H2', [15, 18, 14, 22, 20, 28, 25, 30, 27, 35, 32, 38])}
        ${renderKPI('Pipeline Value', '$8.5M', '-2.1%', 'negative', 'amber', 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', [50, 48, 52, 45, 47, 42, 44, 40, 43, 38, 41, 39])}
      </div>

      <div class="dashboard-grid">
        <div class="glass-card chart-card">
          <h3>Revenue Trend</h3>
          <div class="line-chart-container" id="revenue-chart"></div>
        </div>
        <div class="glass-card chart-card">
          <h3>Lead Funnel</h3>
          <div class="funnel-container" id="lead-funnel"></div>
        </div>
      </div>

      <div class="glass-card activity-feed">
        <h3>Live Activity Feed</h3>
        <div class="feed-list" id="activity-feed"></div>
      </div>
    `;

    renderRevenueChart();
    renderFunnel();
    renderActivityFeed();
    animateKPIs();
  }

  function renderKPI(label, value, change, changeType, color, iconPath, sparkData) {
    const sparkPoints = sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 100},${100 - v}`).join(' ');
    return `
      <div class="kpi-card ${color}" style="animation: slideUp 0.5s ease-out both; animation-delay: ${Math.random() * 0.3}s">
        <div class="kpi-header">
          <span class="kpi-label">${label}</span>
          <div class="kpi-icon ${color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPath}"/></svg>
          </div>
        </div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-change ${changeType}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="${changeType === 'positive' ? 'M7 17l5-5 5 5' : 'M7 7l5 5 5-5'}"/></svg>
          ${change} vs last month
        </div>
        <div class="kpi-sparkline">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="spark-${color}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent-${color})" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="var(--accent-${color})" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <polygon points="0,100 ${sparkPoints} 100,100" fill="url(#spark-${color})"/>
            <polyline points="${sparkPoints}" fill="none" stroke="var(--accent-${color})" stroke-width="2" vector-effect="non-scaling-stroke"/>
          </svg>
        </div>
      </div>
    `;
  }

  function renderRevenueChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [180, 220, 195, 280, 310, 290, 360, 340, 420, 380, 450, 520];
    const max = Math.max(...data);
    const chartEl = document.getElementById('revenue-chart');
    if (!chartEl) return;

    const w = 600, h = 220, padX = 40, padY = 20;
    const stepX = (w - padX * 2) / (data.length - 1);

    let pathD = '';
    let areaD = `M${padX},${h - padY} `;
    const points = data.map((v, i) => {
      const x = padX + i * stepX;
      const y = h - padY - (v / max) * (h - padY * 2);
      return { x, y };
    });

    points.forEach((p, i) => {
      if (i === 0) { pathD += `M${p.x},${p.y}`; areaD += `L${p.x},${p.y}`; }
      else {
        const cp1x = points[i - 1].x + stepX / 3;
        const cp1y = points[i - 1].y;
        const cp2x = p.x - stepX / 3;
        const cp2y = p.y;
        pathD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
        areaD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
      }
    });
    areaD += ` L${points[points.length - 1].x},${h - padY} Z`;

    let labelsHTML = months.map((m, i) => {
      const x = padX + i * stepX;
      return `<text x="${x}" y="${h - 2}" text-anchor="middle" fill="#64748b" font-size="10" font-family="Inter">${m}</text>`;
    }).join('');

    let gridHTML = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = h - padY - pct * (h - padY * 2);
      const val = Math.round(pct * max);
      return `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
        <text x="${padX - 8}" y="${y + 4}" text-anchor="end" fill="#475569" font-size="9" font-family="Inter">$${val}K</text>`;
    }).join('');

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100%">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.02"/>
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        ${gridHTML}
        <path d="${areaD}" fill="url(#areaGrad)"/>
        <path d="${pathD}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round"/>
        ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#0a0e1a" stroke="#a78bfa" stroke-width="2"/>`).join('')}
        ${labelsHTML}
      </svg>
    `;
  }

  function renderFunnel() {
    const stages = [
      { label: 'Visitors', value: 24500, pct: 100, color: '#a78bfa' },
      { label: 'Leads', value: 4800, pct: 65, color: '#818cf8' },
      { label: 'MQLs', value: 2100, pct: 45, color: '#06b6d4' },
      { label: 'SQLs', value: 847, pct: 30, color: '#34d399' },
      { label: 'Deals Won', value: 210, pct: 15, color: '#fbbf24' },
    ];
    const funnelEl = document.getElementById('lead-funnel');
    if (!funnelEl) return;

    funnelEl.innerHTML = stages.map((s, i) => `
      <div class="funnel-stage" style="animation: slideInLeft 0.4s ease-out both; animation-delay: ${i * 0.1}s">
        <span class="funnel-label">${s.label}</span>
        <div class="funnel-bar-bg">
          <div class="funnel-bar-fill" style="width: ${s.pct}%; background: ${s.color};">
            <span>${s.value.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderActivityFeed() {
    const feedEl = document.getElementById('activity-feed');
    if (!feedEl) return;
    feedEl.innerHTML = ACTIVITIES.map((a, i) => `
      <div class="feed-item" style="animation-delay: ${i * 0.1}s">
        <div class="feed-dot ${a.dot}"></div>
        <div>
          <div class="feed-text">${a.text}</div>
          <div class="feed-time">${a.time}</div>
        </div>
      </div>
    `).join('');
  }

  function animateKPIs() {
    document.querySelectorAll('.kpi-value').forEach(el => {
      el.style.animation = 'countUp 0.8s ease-out both';
    });
  }

  // ============== LEADS ==============
  function renderLeads(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1><span class="gradient-text">Lead Intelligence</span></h1>
        <p>AI-powered lead scoring and pipeline management</p>
      </div>

      <div class="leads-toolbar">
        <div class="leads-filters">
          <button class="filter-btn active" data-filter="all">All Leads</button>
          <button class="filter-btn" data-filter="hot">🔥 Hot</button>
          <button class="filter-btn" data-filter="warm">🌡️ Warm</button>
          <button class="filter-btn" data-filter="cold">❄️ Cold</button>
        </div>
        <button class="btn-primary" id="btn-enrich">✨ AI Enrich All</button>
      </div>

      <div class="glass-card">
        <div class="leads-table-wrapper">
          <table class="leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>AI Score</th>
                <th>Status</th>
                <th>Source</th>
                <th>Deal Value</th>
                <th>Last Activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="leads-tbody"></tbody>
          </table>
        </div>
      </div>

      <div class="lead-detail-overlay" id="lead-detail-overlay">
        <div class="lead-detail-panel" id="lead-detail-panel"></div>
      </div>
    `;

    renderLeadRows('all');
    setupLeadFilters();
    setupEnrichButton();
  }

  function getScoreClass(score) { return score >= 80 ? 'hot' : score >= 55 ? 'warm' : 'cold'; }
  function getScoreLabel(score) { return score >= 80 ? '🔥 Hot' : score >= 55 ? '🌡️ Warm' : '❄️ Cold'; }

  function renderLeadRows(filter) {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;
    let filtered = LEADS;
    if (filter === 'hot') filtered = LEADS.filter(l => l.score >= 80);
    else if (filter === 'warm') filtered = LEADS.filter(l => l.score >= 55 && l.score < 80);
    else if (filter === 'cold') filtered = LEADS.filter(l => l.score < 55);

    tbody.innerHTML = filtered.map((lead, i) => `
      <tr style="animation: slideUp 0.3s ease-out both; animation-delay: ${i * 0.05}s" data-lead-id="${lead.id}">
        <td>
          <div class="lead-name-cell">
            <div class="lead-avatar" style="background: ${lead.color}">${lead.initials}</div>
            <div>
              <div class="lead-name">${lead.name}</div>
              <div class="lead-company">${lead.company}</div>
            </div>
          </div>
        </td>
        <td><span class="score-badge ${getScoreClass(lead.score)}">${lead.score} ${getScoreLabel(lead.score)}</span></td>
        <td><span class="status-dot ${lead.status}"></span>${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}</td>
        <td>${lead.source}</td>
        <td style="font-weight:600; color: var(--text-primary)">${lead.value}</td>
        <td>${lead.lastActivity}</td>
        <td><button class="btn-secondary view-lead-btn" data-lead-id="${lead.id}">View</button></td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-lead-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLeadDetail(parseInt(btn.dataset.leadId));
      });
    });
  }

  function setupLeadFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderLeadRows(btn.dataset.filter);
      });
    });
  }

  function setupEnrichButton() {
    const btn = document.getElementById('btn-enrich');
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block"></div> Enriching...';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '✅ Enriched 8 Leads';
        setTimeout(() => { btn.innerHTML = '✨ AI Enrich All'; }, 2000);
      }, 2500);
    });
  }

  function openLeadDetail(leadId) {
    const lead = LEADS.find(l => l.id === leadId);
    if (!lead) return;
    selectedLead = lead;
    const overlay = document.getElementById('lead-detail-overlay');
    const panel = document.getElementById('lead-detail-panel');

    panel.innerHTML = `
      <div class="detail-header">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div class="lead-avatar" style="background:${lead.color};width:48px;height:48px;font-size:1rem">${lead.initials}</div>
            <div>
              <h2 style="font-size:var(--fs-xl);font-weight:700">${lead.name}</h2>
              <p style="color:var(--text-secondary);font-size:var(--fs-sm)">${lead.company}</p>
            </div>
          </div>
        </div>
        <button class="detail-close" id="close-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="detail-section">
        <div class="ai-insight-card">
          <div class="ai-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            AI Insight
          </div>
          <p>${lead.score >= 80 ? `${lead.name} shows strong buying intent. They've visited your pricing page 3 times this week and downloaded 2 whitepapers. Recommend scheduling a demo within 48 hours for optimal conversion.` : lead.score >= 55 ? `${lead.name} is moderately engaged. Consider sending a personalized case study relevant to ${lead.company}'s industry to move them further down the funnel.` : `${lead.name} has shown decreased engagement recently. Consider a re-engagement campaign or nurture sequence to rekindle interest.`}</p>
        </div>
      </div>

      <div class="detail-section">
        <h4>Contact Details</h4>
        <div class="detail-meta-grid">
          <div class="meta-item"><span class="meta-label">Email</span><span class="meta-value">${lead.email}</span></div>
          <div class="meta-item"><span class="meta-label">Source</span><span class="meta-value">${lead.source}</span></div>
          <div class="meta-item"><span class="meta-label">Deal Value</span><span class="meta-value">${lead.value}</span></div>
          <div class="meta-item"><span class="meta-label">Score</span><span class="meta-value"><span class="score-badge ${getScoreClass(lead.score)}">${lead.score}</span></span></div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Engagement Timeline</h4>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-dot" style="background:rgba(167,139,250,0.15);color:var(--accent-violet)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div class="timeline-content"><p>Opened proposal email</p><time>${lead.lastActivity}</time></div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot" style="background:rgba(6,182,212,0.15);color:var(--accent-cyan)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="timeline-content"><p>Visited pricing page (3 min)</p><time>Yesterday</time></div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot" style="background:rgba(52,211,153,0.15);color:var(--accent-emerald)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="timeline-content"><p>Downloaded whitepaper</p><time>3 days ago</time></div>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Recommended Actions</h4>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn-primary" style="width:100%">📞 Schedule Demo Call</button>
          <button class="btn-secondary" style="width:100%">📧 Send Follow-up Email</button>
          <button class="btn-secondary" style="width:100%">📊 Generate Report</button>
        </div>
      </div>
    `;

    overlay.classList.add('open');

    document.getElementById('close-detail').addEventListener('click', () => {
      overlay.classList.remove('open');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  }

  // ============== CAMPAIGNS ==============
  function renderCampaigns(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1><span class="gradient-text">Campaign Analytics</span></h1>
        <p>AI-driven insights and performance tracking</p>
      </div>

      <div class="campaigns-grid">
        ${CAMPAIGNS.map((c, i) => `
          <div class="campaign-card" style="animation: slideUp 0.5s ease-out both; animation-delay: ${i * 0.08}s">
            <div class="campaign-card-header">
              <div>
                <h3>${c.name}</h3>
                <span class="campaign-channel">${c.channel}</span>
              </div>
              <span class="campaign-status ${c.status}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
            </div>
            <div class="campaign-metrics">
              <div class="campaign-metric"><span class="metric-label">Impressions</span><span class="metric-value">${c.impressions}</span></div>
              <div class="campaign-metric"><span class="metric-label">Clicks</span><span class="metric-value">${c.clicks}</span></div>
              <div class="campaign-metric"><span class="metric-label">Conversions</span><span class="metric-value">${c.conversions.toLocaleString()}</span></div>
              <div class="campaign-metric"><span class="metric-label">ROI</span><span class="metric-value positive">${c.roi}</span></div>
            </div>
            <div class="campaign-bar"><div class="campaign-bar-fill" style="width: ${c.progress}%"></div></div>
          </div>
        `).join('')}
      </div>

      <div class="channel-chart glass-card">
        <h2>Channel Performance</h2>
        <div class="channel-bars" id="channel-bars"></div>
      </div>

      <div class="campaign-insights">
        <h2>✨ AI-Generated Insights</h2>
        <div class="insights-grid">
          <div class="insight-card" style="animation: slideUp 0.5s ease-out both; animation-delay: 0.1s">
            <div class="insight-icon">🏆</div>
            <h4>Top Performer</h4>
            <p>Email Nurture Series outperforms all campaigns with <strong>+320% ROI</strong>. Consider increasing budget allocation by 25%.</p>
          </div>
          <div class="insight-card" style="animation: slideUp 0.5s ease-out both; animation-delay: 0.2s">
            <div class="insight-icon">📈</div>
            <h4>Growth Opportunity</h4>
            <p>LinkedIn ABM shows 23% higher engagement vs. industry average. Scaling this channel could yield an additional <strong>$240K</strong> pipeline.</p>
          </div>
          <div class="insight-card" style="animation: slideUp 0.5s ease-out both; animation-delay: 0.3s">
            <div class="insight-icon">⚠️</div>
            <h4>Attention Required</h4>
            <p>Google Search Enterprise CTR dropped 12% this week. Recommend refreshing ad copy and reviewing keyword strategy.</p>
          </div>
        </div>
      </div>

      <div class="ab-test-section">
        <h2>A/B Test Results</h2>
        <div class="ab-compare">
          <div class="glass-card ab-variant">
            <div class="variant-label a">Variant A — Original</div>
            <div class="variant-stats">
              <div class="ab-stat"><span class="ab-stat-label">Open Rate</span><span class="ab-stat-value">24.3%</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Click Rate</span><span class="ab-stat-value">5.8%</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Conversions</span><span class="ab-stat-value">142</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Revenue</span><span class="ab-stat-value">$34,200</span></div>
            </div>
          </div>
          <div class="glass-card ab-variant">
            <div class="variant-label b">Variant B — AI-Optimized <span class="ab-winner">Winner ✓</span></div>
            <div class="variant-stats">
              <div class="ab-stat"><span class="ab-stat-label">Open Rate</span><span class="ab-stat-value">31.7%</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Click Rate</span><span class="ab-stat-value">8.4%</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Conversions</span><span class="ab-stat-value">218</span></div>
              <div class="ab-stat"><span class="ab-stat-label">Revenue</span><span class="ab-stat-value">$52,800</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    renderChannelBars();
  }

  function renderChannelBars() {
    const channels = [
      { name: 'Email', value: 82, variant: 'v1' },
      { name: 'LinkedIn', value: 68, variant: 'v2' },
      { name: 'Google Ads', value: 55, variant: 'v3' },
      { name: 'Social', value: 43, variant: 'v4' },
      { name: 'Display', value: 35, variant: 'v5' },
    ];
    const el = document.getElementById('channel-bars');
    if (!el) return;
    el.innerHTML = channels.map((c, i) => `
      <div class="channel-row" style="animation: slideInLeft 0.4s ease-out both; animation-delay: ${i * 0.1}s">
        <span class="channel-name">${c.name}</span>
        <div class="channel-bar-track">
          <div class="channel-bar-value ${c.variant}" style="width: ${c.value}%">${c.value}%</div>
        </div>
      </div>
    `).join('');
  }

  // ============== AI ASSISTANT ==============
  function renderAssistant(container) {
    if (chatMessages.length === 0) {
      chatMessages.push({
        role: 'assistant',
        content: `Welcome! I'm your **AI Sales Assistant**. I can help you with:\n\n• 📊 Analyzing lead & pipeline data\n• 📧 Drafting personalized outreach\n• 📈 Campaign performance insights\n• 💡 Strategic recommendations\n\nWhat would you like to explore?`
      });
    }

    container.innerHTML = `
      <div class="assistant-container">
        <div class="chat-messages" id="chat-messages"></div>

        <div class="suggested-prompts" id="suggested-prompts">
          <button class="prompt-chip">📊 Summarize this week's leads</button>
          <button class="prompt-chip">📧 Draft a follow-up email</button>
          <button class="prompt-chip">📈 Campaign performance overview</button>
        </div>

        <div class="chat-input-area">
          <textarea id="chat-input" rows="1" placeholder="Ask me anything about your sales data..."></textarea>
          <button class="chat-send-btn" id="chat-send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;

    renderChatMessages();
    setupChatInput();
  }

  function renderChatMessages() {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    el.innerHTML = chatMessages.map((msg) => `
      <div class="chat-message ${msg.role === 'user' ? 'user' : 'assistant'}">
        <div class="msg-avatar ${msg.role === 'user' ? 'human' : 'ai'}">${msg.role === 'user' ? 'KS' : 'AI'}</div>
        <div class="msg-bubble">${formatMessage(msg.content)}</div>
      </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '• ');
  }

  function setupChatInput() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    if (!input || !sendBtn) return;

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;
      chatMessages.push({ role: 'user', content: text });
      input.value = '';
      renderChatMessages();
      simulateAIResponse(text);
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.textContent.replace(/^[^\s]+\s/, '');
        sendMessage();
      });
    });
  }

  function simulateAIResponse(userText) {
    const chatEl = document.getElementById('chat-messages');
    if (!chatEl) return;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant';
    typingDiv.innerHTML = `
      <div class="msg-avatar ai">AI</div>
      <div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    chatEl.appendChild(typingDiv);
    chatEl.scrollTop = chatEl.scrollHeight;

    // Hide suggested prompts
    const prompts = document.getElementById('suggested-prompts');
    if (prompts) prompts.style.display = 'none';

    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText })
        });
        const data = await res.json();
        chatEl.removeChild(typingDiv);
        chatMessages.push({ role: 'assistant', content: data.response });
        renderChatMessages();
      } catch (err) {
        chatEl.removeChild(typingDiv);
        chatMessages.push({ role: 'assistant', content: "Sorry, I couldn't reach the backend server." });
        renderChatMessages();
      }
    }, 500);
  }

  // ============== CONTENT GENERATOR ==============
  function renderContent(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1><span class="gradient-text">Content Generator</span></h1>
        <p>Create AI-powered marketing content in seconds</p>
      </div>

      <div class="content-layout">
        <div class="content-form-section">
          <h3>Choose Template</h3>
          <div class="template-grid">
            ${Object.entries(CONTENT_TEMPLATES).map(([key, t]) => `
              <div class="template-card ${selectedTemplate === key ? 'selected' : ''}" data-template="${key}">
                <div class="template-icon">${t.icon}</div>
                <div class="template-name">${t.name}</div>
                <div class="template-desc">${t.desc}</div>
              </div>
            `).join('')}
          </div>

          <div class="form-group">
            <label>Product / Service</label>
            <input type="text" id="content-product" placeholder="e.g. AI Sales Intelligence Platform" value="NexusAI Sales Platform" />
          </div>

          <div class="form-group">
            <label>Target Audience</label>
            <select id="content-audience">
              <option>B2B Sales Leaders</option>
              <option>Marketing Directors</option>
              <option>C-Suite Executives</option>
              <option>Small Business Owners</option>
              <option>SaaS Founders</option>
            </select>
          </div>

          <div class="form-group">
            <label>Tone</label>
            <div class="tone-chips">
              ${['Professional', 'Casual', 'Persuasive', 'Inspirational', 'Data-Driven'].map(t => `
                <button class="tone-chip ${selectedTone === t.toLowerCase() ? 'selected' : ''}" data-tone="${t.toLowerCase()}">${t}</button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label>Key Message (optional)</label>
            <textarea id="content-message" placeholder="Any specific points or details to include..."></textarea>
          </div>

          <button class="generate-btn" id="generate-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Generate Content
          </button>
        </div>

        <div class="content-preview-section">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Preview
          </h3>
          <div class="content-preview" id="content-preview">
            <div class="empty-preview">
              <div class="empty-icon">✨</div>
              <p>Select a template and click "Generate" to create AI-powered content</p>
            </div>
          </div>
          <div class="content-actions" id="content-actions" style="display:none">
            <button class="btn-primary">📋 Copy to Clipboard</button>
            <button class="btn-secondary">✏️ Edit</button>
            <button class="btn-secondary">🔄 Regenerate</button>
          </div>
        </div>
      </div>

      <div class="content-history glass-card" style="margin-top: var(--space-6)">
        <h3>Recent Generations</h3>
        <div class="history-list" id="history-list">
          <div class="history-item">
            <div><div class="history-title">Q1 Launch Email Sequence</div><div class="history-meta">Generated 2 hours ago</div></div>
            <span class="history-type">📧 Email</span>
          </div>
          <div class="history-item">
            <div><div class="history-title">LinkedIn Thought Leadership Post</div><div class="history-meta">Generated yesterday</div></div>
            <span class="history-type">📱 Social</span>
          </div>
          <div class="history-item">
            <div><div class="history-title">Enterprise PPC Ad Variations</div><div class="history-meta">Generated 3 days ago</div></div>
            <span class="history-type">🎯 Ad Copy</span>
          </div>
        </div>
      </div>
    `;

    setupContentGenerator();
  }

  function setupContentGenerator() {
    // Template selection
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTemplate = card.dataset.template;
      });
    });

    // Tone selection
    document.querySelectorAll('.tone-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedTone = chip.dataset.tone;
      });
    });

    // Generate button
    const genBtn = document.getElementById('generate-btn');
    if (!genBtn) return;
    genBtn.addEventListener('click', () => {
      if (isGenerating) return;
      isGenerating = true;
      genBtn.disabled = true;
      genBtn.innerHTML = '<div class="spinner"></div> Generating...';

      const preview = document.getElementById('content-preview');
      preview.innerHTML = '<div class="typing-indicator" style="padding:40px;display:flex;justify-content:center"><span></span><span></span><span></span></div>';

      setTimeout(async () => {
        try {
          const res = await fetch('http://localhost:8000/api/content/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template: selectedTemplate,
              product: document.getElementById('content-product')?.value || '',
              audience: document.getElementById('content-audience')?.value || '',
              tone: selectedTone,
              message: document.getElementById('content-message')?.value || ''
            })
          });
          const data = await res.json();
          preview.innerHTML = data.content;
          document.getElementById('content-actions').style.display = 'flex';
        } catch (err) {
          preview.innerHTML = '<div class="empty-preview"><p style="color:var(--accent-rose)">Backend connection failed. Is the Python server running?</p></div>';
        } finally {
          genBtn.disabled = false;
          genBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Generate Content';
          isGenerating = false;
        }
      }, 500);
    });
  }

  // ---- Initialize ----
  async function loadAppData() {
    try {
      const [leadsRes, campaignsRes, dashRes] = await Promise.all([
        fetch('http://localhost:8000/api/leads').then(r => r.json()),
        fetch('http://localhost:8000/api/campaigns').then(r => r.json()),
        fetch('http://localhost:8000/api/dashboard').then(r => r.json())
      ]);
      LEADS = leadsRes.leads || [];
      CAMPAIGNS = campaignsRes.campaigns || [];
      ACTIVITIES = dashRes.activities || [];
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    }
  }

  function init() {
    setupAuth();
    if (authToken) {
      // already logged in
      transitionToApp();
    } else {
      // show login
      document.getElementById('auth-container').style.display = 'flex';
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
