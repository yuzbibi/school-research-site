/**
 * =====================================================
 *  小学校外国語研究サイト — メインスクリプト
 *  ※ このファイルは編集不要です
 *  　 コンテンツの追加・変更は data/content.js を編集してください
 * =====================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadFromFirebase();
  window.renderAll();
  initScrollAnimations();
  initNavHighlight();
});

// ─────────────────────────────────────────────────────
// Firebase 読み込み（Firestoreからデータを取得）
// ─────────────────────────────────────────────────────
async function loadFromFirebase() {
  try {
    const docRef = window.db.collection('siteData').doc('main');
    const doc = await docRef.get();
    
    let saved = null;
    if (doc.exists) {
      saved = doc.data();
    } else {
      // Firestoreにデータが無い場合は、localStorageから引き継いでFirestoreに初期保存
      const raw = localStorage.getItem('research_site_data');
      if (raw) saved = JSON.parse(raw);
      if (saved) {
        await docRef.set({
          config: saved.config || window.SITE_DATA.config,
          news: saved.news || window.SITE_DATA.news,
          sections: saved.sections || window.SITE_DATA.sections || [],
          sectionItems: saved.sectionItems || window.SITE_DATA.sectionItems || {}
        });
      }
    }

    if (saved) {
      if (saved.config)       Object.assign(window.SITE_DATA.config, saved.config);
      if (saved.news)         window.SITE_DATA.news         = saved.news;
      if (saved.sections)     window.SITE_DATA.sections     = saved.sections;
      if (saved.sectionItems) window.SITE_DATA.sectionItems = saved.sectionItems;
      
      // 後方互換性
      if (saved.documents && !saved.sections) window.SITE_DATA.documents = saved.documents;
      if (saved.trainings && !saved.sections) window.SITE_DATA.trainings = saved.trainings;
    }

    // パスワードはセキュリティ上localStorageのみで管理
    const rawLocal = localStorage.getItem('research_site_data');
    if (rawLocal) {
      const local = JSON.parse(rawLocal);
      if (local._adminPassword) window.ADMIN_PASSWORD = local._adminPassword;
    }
  } catch (e) {
    console.error('Firebaseからのデータ読み込みに失敗しました:', e);
    // フォールバック: Firebaseにアクセスできない場合はローカルストレージから読む
    try {
      const raw = localStorage.getItem('research_site_data');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.config)       Object.assign(window.SITE_DATA.config, saved.config);
        if (saved.news)         window.SITE_DATA.news         = saved.news;
        if (saved.sections)     window.SITE_DATA.sections     = saved.sections;
        if (saved.sectionItems) window.SITE_DATA.sectionItems = saved.sectionItems;
        if (saved._adminPassword) window.ADMIN_PASSWORD = saved._adminPassword;
      }
    } catch(err) {}
  }
}

// ───────────────────────────────────────────────────
// 全セクション再描画（管理パネルから呼び出し可能）
// ───────────────────────────────────────────────────
window.renderAll = function () {
  migrateDataIfNeeded();
  renderSiteConfig();
  renderHeroNews();
  renderNewsList();
  renderDynamicNav();
  renderDynamicSections();
  // Lucide SVGアイコンに変換（静的および動的生成分）
  if (window.lucide) lucide.createIcons();
};

// 古いデータ構造からのマイグレーション
function migrateDataIfNeeded() {
  if (window.SITE_DATA.sections) return;
  window.SITE_DATA.sections = [
    { id: 'sec_docs', title: window.SITE_DATA.config?.docsSecTitle || '授業資料', description: window.SITE_DATA.config?.docsSecDesc || '資料一覧', type: 'documentList' },
    { id: 'sec_trainings', title: window.SITE_DATA.config?.trainingsSecTitle || '研修スケジュール', description: window.SITE_DATA.config?.trainingsSecDesc || '今後の予定', type: 'scheduleList' }
  ];
  window.SITE_DATA.sectionItems = {
    sec_docs: window.SITE_DATA.documents || [],
    sec_trainings: window.SITE_DATA.trainings || []
  };
  delete window.SITE_DATA.documents;
  delete window.SITE_DATA.trainings;
}

function renderDynamicNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  // ホームとお知らせは固定、その間に動的リンクを挿入
  const links = window.SITE_DATA.sections.map(sec => 
    `<a href="#${sec.id}" class="nav-link" id="nav-${sec.id}">${sec.title}</a>`
  ).join('');
  nav.innerHTML = `
    <a href="#home" class="nav-link active" id="nav-home">ホーム</a>
    ${links}
    <a href="#news" class="nav-link" id="nav-news">お知らせ</a>
  `;
}

// ─────────────────────────────────────────────────────
// 基本設定の反映
// ─────────────────────────────────────────────────────
function renderSiteConfig() {
  const c = window.SITE_DATA.config;
  if (!c) return;
  document.querySelectorAll('[data-site-name]').forEach(el => el.textContent = c.siteName || '');
  document.querySelectorAll('[data-school-name]').forEach(el => el.textContent = c.schoolName || '');
  document.querySelectorAll('[data-catch-copy]').forEach(el => el.textContent = c.catchCopy || '');
  document.querySelectorAll('[data-sub-copy]').forEach(el => el.textContent = c.subCopy || '');
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = c.year || '');

  // 汎用データ設定の反映
  for (const key in c) {
    document.querySelectorAll(`[data-config="${key}"]`).forEach(el => el.textContent = c[key] || '');
  }
}

// ─────────────────────────────────────────────────────
// ヒーロー最新お知らせ（上位2件）
// ─────────────────────────────────────────────────────
function renderHeroNews() {
  const container = document.getElementById('hero-news-list');
  if (!container) return;

  const items = window.SITE_DATA.news.slice(0, 2);
  container.innerHTML = items.length
    ? items.map(item => `
        <div class="hero-news__item">
          <span class="hero-news__date">${formatDate(item.date)}</span>
          <a href="${item.url || '#'}">${item.title}</a>
        </div>`).join('')
    : '<div class="hero-news__item"><span style="color:rgba(255,255,255,.4)">お知らせはありません</span></div>';
}

// ─────────────────────────────────────────────────────
// ニュース一覧
// ─────────────────────────────────────────────────────
const NEWS_INITIAL = 5;
let newsExpanded = false;

function renderNewsList() {
  const container = document.getElementById('news-list');
  if (!container) return;

  const items = newsExpanded
    ? window.SITE_DATA.news
    : window.SITE_DATA.news.slice(0, NEWS_INITIAL);

  container.innerHTML = items.map(item => `
    <div class="news-item">
      <span class="news-item__date">${formatDate(item.date)}</span>
      <span class="news-item__badge ${categoryBadgeClass(item.category)}">${item.category}</span>
      <span class="news-item__title"><a href="${item.url || '#'}">${item.title}</a></span>
    </div>`).join('');

  const moreBtn = document.getElementById('news-more-btn');
  if (moreBtn) {
    moreBtn.style.display =
      (!newsExpanded && window.SITE_DATA.news.length > NEWS_INITIAL) ? 'inline-flex' : 'none';

    if (!moreBtn._bound) {
      moreBtn.addEventListener('click', () => {
        newsExpanded = true;
        renderNewsList();
      });
      moreBtn._bound = true;
    }
  }
}

// ─────────────────────────────────────────────────────
// 動的セクション描画
// ─────────────────────────────────────────────────────
function renderDynamicSections() {
  const container = document.getElementById('dynamic-sections');
  if (!container) return;

  const sectionsHTML = window.SITE_DATA.sections.map(sec => {
    let contentHTML = '';
    const items = window.SITE_DATA.sectionItems[sec.id] || [];
    
    if (sec.type === 'documentList') {
      contentHTML = renderDocumentListHTML(items);
    } else if (sec.type === 'scheduleList') {
      contentHTML = renderScheduleListHTML(items);
    }

    return `
      <section id="${sec.id}" class="section fade-section" aria-label="${sec.title}">
        <div class="container">
          <div class="section-header">
            <div>
              <h2 class="section-title">${sec.title}</h2>
              <p class="section-subtitle">${sec.description || ''}</p>
            </div>
          </div>
          ${contentHTML}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = sectionsHTML;
  // 動的セクション生成後に交差監視を再初期化
  initScrollAnimations();
}

function renderDocumentListHTML(items) {
  if (!items || items.length === 0) return '<p style="text-align:center;color:var(--color-text-muted);">現在資料はありません。</p>';
  const cards = items.map(doc => {
    const thumbCls = categoryThumbClass(doc.category);
    const catCls = categoryBadgeClass(doc.category);
    return `
      <div class="doc-card">
        <div class="doc-card__thumb doc-card__thumb--${thumbCls}">
          <i data-lucide="${categoryIcon(doc.category)}"></i>
        </div>
        <div class="doc-card__body">
          <div class="doc-card__category doc-card__category--${catCls}">${doc.category || '分類なし'}</div>
          <div class="doc-card__title">${doc.title}</div>
          <div class="doc-card__desc">${doc.description || ''}</div>
        </div>
        <div class="doc-card__footer">
          <span class="doc-card__date">${formatDate(doc.date)}</span>
          ${doc.url && doc.url.startsWith('idb:') 
            ? `<a href="#" data-idb-url="${doc.url}" class="doc-card__download"><i data-lucide="download"></i> ${doc.fileType || 'PDF'}</a>`
            : `<a href="${doc.url || '#'}" target="_blank" rel="noopener" class="doc-card__download"><i data-lucide="download"></i> ${doc.fileType || 'PDF'}</a>`
          }
        </div>
      </div>`;
  }).join('');
  return `<div class="docs-grid">${cards}</div>`;
}

function renderScheduleListHTML(items) {
  if (!items || items.length === 0) return '<p style="text-align:center;color:var(--color-text-muted);">現在予定されている研修はありません。</p>';
  const cards = items.map(item => `
    <div class="training-card">
      <div class="training-card__date">
        <i data-lucide="calendar"></i> ${formatDate(item.date)}
      </div>
      <div class="training-card__title">${item.title}</div>
      <div class="training-card__meta">
        <span><i data-lucide="clock"></i> ${item.time || ''}</span>
        <span><i data-lucide="map-pin"></i> ${item.place || ''}</span>
      </div>
      ${item.url && item.url !== '#' ? `<a href="${item.url}" target="_blank" class="training-card__link">詳細 <i data-lucide="external-link"></i></a>` : ''}
    </div>
  `).join('');
  return `<div class="trainings-grid">${cards}</div>`;
}

// Cleanup old filter code and duplicate training render

// ─────────────────────────────────────────────────────
// スクロールアニメーション
// ─────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.fade-section').forEach(el => observer.observe(el));
}

// ─────────────────────────────────────────────────────
// ナビハイライト
// ─────────────────────────────────────────────────────
function initNavHighlight() {
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link[href^="#"]');

  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    }),
    { threshold: 0.4 }
  );

  sections.forEach(sec => observer.observe(sec));
}

// ─────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || '';
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function categoryBadgeClass(cat) {
  return { '授業資料':'badge--research', '研修情報':'badge--training' }[cat] || 'badge--other';
}

function categoryThumbClass(cat) {
  return { '授業資料':'research', '研修情報':'training' }[cat] || 'research';
}

function categoryCssClass(cat) {
  return { '授業資料':'research', '研修情報':'training' }[cat] || 'research';
}

function categoryIcon(cat) {
  return { '授業資料':'file-text', '研修情報':'calendar' }[cat] || 'file';
}
