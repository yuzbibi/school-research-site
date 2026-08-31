/**
 * =====================================================
 *  小学校外国語研究サイト — 管理者パネル ロジック
 *  ※ このファイルは編集不要です
 * =====================================================
 */

// ─────────────────────────────────────────────────────
// フィールド定義（各データ型のフォーム構造）
// ─────────────────────────────────────────────────────
const ADMIN_SCHEMAS = {
  news: [
    { key: 'date',     label: '日付',     type: 'date' },
    { key: 'title',    label: 'タイトル', type: 'text',     placeholder: 'お知らせのタイトル' },
    { key: 'category', label: 'カテゴリ', type: 'select',   options: ['お知らせ','その他'] },
    { key: 'url',      label: 'リンクURL',type: 'text',     placeholder: 'https://... または #' },
  ],
  sections: [
    { key: 'id',          label: 'ID (自動生成)', type: 'text', placeholder: 'sec_xxx (自動入力)', readonly: true },
    { key: 'title',       label: 'セクション名', type: 'text', placeholder: '例: 授業資料' },
    { key: 'description', label: '説明文', type: 'textarea', placeholder: 'セクションの説明' },
    { key: 'type',        label: '表示形式', type: 'select', options: ['documentList', 'scheduleList'] }
  ],
  documentList: [
    { key: 'title',       label: 'タイトル',    type: 'text',     placeholder: '資料のタイトル' },
    { key: 'description', label: '説明',        type: 'textarea', placeholder: '資料の簡単な説明' },
    { key: 'category',    label: 'カテゴリ',    type: 'text',     placeholder: '例: 授業資料、研修情報' },
    { key: 'date',        label: '日付',        type: 'date' },
    { key: 'url',         label: 'ファイルURL',  type: 'text',     placeholder: 'Googleドライブ等の共有リンクURL' },
    { key: 'fileType',    label: 'ファイル種別',type: 'text',     placeholder: 'PDF, DOCX など' },
  ],
  scheduleList: [
    { key: 'date',  label: '日付', type: 'date' },
    { key: 'title', label: 'タイトル', type: 'text', placeholder: '研修名' },
    { key: 'place', label: '場所',    type: 'text', placeholder: '開催場所' },
    { key: 'time',  label: '時間',    type: 'text', placeholder: '13:40〜' },
    { key: 'url',   label: 'リンクURL', type: 'text', placeholder: '#' },
  ]
};

const TAB_LABELS = {
  news:         { label: 'お知らせ',   icon: 'bell',      keyTitle: 'title' },
  sections:     { label: 'セクション', icon: 'layout',    keyTitle: 'title' },
  documentList: { label: '資料',       icon: 'file-text', keyTitle: 'title' },
  scheduleList: { label: '研修',       icon: 'calendar',  keyTitle: 'title' }
};

// ─────────────────────────────────────────────────────
// 状態管理
// ─────────────────────────────────────────────────────
let adminLoggedIn   = false;
let currentTab      = 'config';
let editingType     = null;   // 'news' | 'sections' | 'sec_xxx'
let editingSchema   = null;   // schemas key
let editingIndex    = null;   // null = 新規追加, number = 編集

// ─────────────────────────────────────────────────────
// 初期化
// ─────────────────────────────────────────────────────
function initAdmin() {
  // ログインボタン
  document.getElementById('admin-login-trigger').addEventListener('click', () => {
    if (adminLoggedIn) {
      openAdminPanel();
    } else {
      openLoginModal();
    }
  });

  // ログインモーダル
  document.getElementById('admin-login-btn').addEventListener('click', handleLogin);
  document.getElementById('admin-login-cancel').addEventListener('click', closeLoginModal);
  document.getElementById('admin-password-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // オーバーレイクリックで閉じる
  document.getElementById('admin-overlay').addEventListener('click', closeAdminPanel);

  // パネル閉じるボタン
  document.getElementById('admin-close-btn').addEventListener('click', closeAdminPanel);

  // ログアウトボタン
  document.getElementById('admin-logout-btn').addEventListener('click', handleLogout);

  // データリセットボタン
  document.getElementById('admin-reset-btn').addEventListener('click', handleReset);

  // タブ切り替え
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 基本設定 保存ボタン
  document.getElementById('admin-config-save').addEventListener('click', saveConfig);

  // パスワード変更ボタン
  document.getElementById('admin-pw-save').addEventListener('click', savePassword);

  // 編集モーダル キャンセル
  document.getElementById('admin-edit-cancel').addEventListener('click', closeEditModal);

  // 編集モーダル 保存
  document.getElementById('admin-edit-save').addEventListener('click', saveEditItem);

  // 各タブの「追加」ボタン（静的）
  ['news','sections'].forEach(type => {
    const btn = document.getElementById(`admin-add-${type}`);
    if (btn) btn.addEventListener('click', () => openEditModal(type, null, type));
  });
}

// ─────────────────────────────────────────────────────
// ログイン / ログアウト
// ─────────────────────────────────────────────────────
function handleLogin() {
  const input = document.getElementById('admin-password-input');
  const error = document.getElementById('admin-login-error');

  if (input.value === window.ADMIN_PASSWORD) {
    adminLoggedIn = true;
    input.value = '';
    error.textContent = '';
    closeLoginModal();

    const trigger = document.getElementById('admin-login-trigger');
    trigger.innerHTML = '<i data-lucide="settings"></i><span class="admin-btn-label"> 管理パネル</span>';
    trigger.classList.add('logged-in');
    if (window.lucide) lucide.createIcons();

    openAdminPanel();
  } else {
    error.textContent = 'パスワードが正しくありません';
    input.select();
  }
}

function handleLogout() {
  adminLoggedIn = false;
  closeAdminPanel();

  const trigger = document.getElementById('admin-login-trigger');
  trigger.innerHTML = '<i data-lucide="lock"></i><span class="admin-btn-label"> 管理者ログイン</span>';
  trigger.classList.remove('logged-in');
  if (window.lucide) lucide.createIcons();

  showToast('ログアウトしました', 'success');
}

// ─────────────────────────────────────────────────────
// モーダル / パネル 開閉
// ─────────────────────────────────────────────────────
function openLoginModal() {
  document.getElementById('admin-login-modal').classList.add('visible');
  document.getElementById('admin-overlay').classList.add('visible');
  setTimeout(() => document.getElementById('admin-password-input').focus(), 100);
}

function closeLoginModal() {
  document.getElementById('admin-login-modal').classList.remove('visible');
  if (!adminLoggedIn) {
    document.getElementById('admin-overlay').classList.remove('visible');
  }
  document.getElementById('admin-login-error').textContent = '';
  document.getElementById('admin-password-input').value = '';
}

function openAdminPanel() {
  renderCurrentTab();
  document.getElementById('admin-panel').classList.add('open');
  document.getElementById('admin-overlay').classList.add('visible');
}

function closeAdminPanel() {
  document.getElementById('admin-panel').classList.remove('open');
  document.getElementById('admin-overlay').classList.remove('visible');
}

function openEditModal(type, index, schemaOverride) {
  editingType   = type;
  editingSchema = schemaOverride || type;
  editingIndex  = index;

  const schema = ADMIN_SCHEMAS[editingSchema];
  
  let arr;
  if (type.startsWith('sec_')) {
    arr = window.SITE_DATA.sectionItems[type.replace('sec_', '')] || [];
  } else {
    arr = window.SITE_DATA[type] || [];
  }
  
  const item  = index !== null ? arr[index] : {};
  let info = TAB_LABELS[type];
  if (!info) {
    // 存在しない場合は動的セクション
    const section = window.SITE_DATA.sections.find(s => s.id === type.replace('sec_', ''));
    info = { label: section ? section.title : 'アイテム', icon: editingSchema === 'documentList' ? 'file-text' : 'calendar' };
  }
  
  const isNew = index === null;

  // タイトル
  document.getElementById('admin-edit-title').textContent =
    `${info.icon} ${isNew ? '追加' : '編集'} — ${info.label}`;

  // フォームフィールド生成
  const formEl = document.getElementById('admin-edit-fields');
  formEl.innerHTML = schema.map(field => `
    <div class="admin-input-group">
      <label for="edit_${field.key}">${field.label}</label>
      ${buildFieldHTML(field, item[field.key] || '')}
    </div>
  `).join('');

  document.getElementById('admin-edit-modal').classList.add('visible');
  document.getElementById('admin-overlay').classList.add('visible');
  
  if (window.lucide) lucide.createIcons({ root: formEl });
  formEl.querySelector('input, textarea, select')?.focus();
}

function closeEditModal() {
  document.getElementById('admin-edit-modal').classList.remove('visible');
  if (adminLoggedIn) {
    document.getElementById('admin-overlay').classList.add('visible');
  } else {
    document.getElementById('admin-overlay').classList.remove('visible');
  }
  window._adminSelectedFile = null;
  editingType  = null;
  editingIndex = null;
}

// ─────────────────────────────────────────────────────
// フォームフィールドHTML生成
// ─────────────────────────────────────────────────────
function buildFieldHTML(field, value) {
  const id = `edit_${field.key}`;

  if (field.type === 'textarea') {
    return `<textarea id="${id}" name="${field.key}" placeholder="${field.placeholder || ''}">${escapeHtml(value)}</textarea>`;
  }

  if (field.type === 'select') {
    const options = field.options
      .map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`)
      .join('');
    return `<select id="${id}" name="${field.key}">${options}</select>`;
  }

  return `<input type="${field.type}" id="${id}" name="${field.key}" value="${escapeHtml(value)}" placeholder="${field.placeholder || ''}" />`;
}

// ─────────────────────────────────────────────────────
// 保存処理
// ─────────────────────────────────────────────────────
async function saveEditItem() {
  const schema = ADMIN_SCHEMAS[editingSchema];
  const newItem = {};

  for (const field of schema) {
    // skip readonly fields if it's not newly generated (we handle it below)
    const el = document.getElementById(`edit_${field.key}`);
    if (el) newItem[field.key] = el.value.trim();
  }

  // バリデーション（titleは必須）
  if (!newItem.title && !newItem.time) {
    showToast('タイトルを入力してください', 'error');
    return;
  }

  // セクションの新規追加の場合、IDを自動生成
  if (editingType === 'sections' && editingIndex === null) {
    newItem.id = 'sec_' + Date.now();
    window.SITE_DATA.sectionItems[newItem.id] = [];
  } else if (editingType === 'sections' && editingIndex !== null) {
    // 既存セクションのIDを保持
    newItem.id = window.SITE_DATA.sections[editingIndex].id;
  }

  let arr;
  if (editingType.startsWith('sec_')) {
    arr = window.SITE_DATA.sectionItems[editingType.replace('sec_', '')];
  } else {
    arr = window.SITE_DATA[editingType];
  }

  if (editingIndex === null) {
    arr.push(newItem); // 追加は末尾（リストの場合は）お知らせは先頭かもですが、シンプルにpushかunshiftか
    if (editingType === 'news') {
      arr.pop(); // oops, wait let's just unshift everything except sections maybe?
      arr.unshift(newItem); // actually, let's just unshift if not section
    }
  } else {
    arr[editingIndex] = newItem;
  }

  // 整理
  if (editingType === 'sections' && editingIndex === null) {
    arr.pop(); // remove from end
    arr.push(newItem); // push sections to end
  } else if (editingIndex === null) {
    // unshift for items (newest first)
    if (editingType !== 'sections') {
       arr.pop(); // remove undefined oops
       arr.unshift(newItem);
    }
  }

  window._adminSelectedFile = null;
  await saveToFirebase();
  window.renderAll();
  closeEditModal();
  if (editingType === 'sections') renderAdminDynamicTabs();
  renderCurrentTab();
  showToast(editingIndex === null ? '追加しました ✓' : '更新しました ✓', 'success');
}

async function deleteItem(type, index) {
  if (!confirm('本当に削除しますか？')) return;
  
  let arr;
  if (type.startsWith('sec_')) {
    arr = window.SITE_DATA.sectionItems[type.replace('sec_', '')];
  } else {
    arr = window.SITE_DATA[type];
  }

  // もしセクション自体を削除する場合、中のアイテムも消す
  if (type === 'sections') {
    const secId = arr[index].id;
    delete window.SITE_DATA.sectionItems[secId];
  }

  arr.splice(index, 1);
  await saveToFirebase();
  window.renderAll();
  if (type === 'sections') renderAdminDynamicTabs();
  renderCurrentTab();
  showToast('削除しました', 'success');
}

// 基本設定の保存
async function saveConfig() {
  const fields = [
    'siteName','schoolName','catchCopy','subCopy',
    'newsSecTitle','newsSecDesc'
  ];
  fields.forEach(key => {
    const el = document.getElementById(`config_${key}`);
    if (el) window.SITE_DATA.config[key] = el.value.trim();
  });
  await saveToFirebase();
  window.renderAll();
  showToast('基本設定を保存しました ✓', 'success');
}

// パスワード変更の保存
function savePassword() {
  const newPw = document.getElementById('admin-new-pw').value.trim();
  const confirm2 = document.getElementById('admin-confirm-pw').value.trim();

  if (!newPw) { showToast('新しいパスワードを入力してください', 'error'); return; }
  if (newPw !== confirm2) { showToast('パスワードが一致しません', 'error'); return; }
  if (newPw.length < 4)  { showToast('4文字以上のパスワードにしてください', 'error'); return; }

  window.ADMIN_PASSWORD = newPw;
  // パスワードはlocalStorageに保存
  const saved = getSavedData();
  saved._adminPassword = newPw;
  localStorage.setItem('research_site_data', JSON.stringify(saved));

  document.getElementById('admin-new-pw').value     = '';
  document.getElementById('admin-confirm-pw').value = '';
  showToast('パスワードを変更しました ✓', 'success');
}

// データリセット
function handleReset() {
  if (!confirm('編集した内容をすべてリセットして、初期データに戻しますか？\nこの操作は元に戻せません。')) return;
  localStorage.removeItem('research_site_data');
  showToast('リセットしました。ページを再読み込みします…', 'success');
  setTimeout(() => location.reload(), 1400);
}

// ─────────────────────────────────────────────────────
// タブ描画
// ─────────────────────────────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.admin-tab-content').forEach(el => {
    el.classList.toggle('active', el.dataset.tabContent === tab);
  });
  renderCurrentTab();
}

function renderCurrentTab() {
  if (currentTab === 'config') renderConfigTab();
  else renderListTab(currentTab);
}

function renderConfigTab() {
  const c = window.SITE_DATA.config;
  const fields = [
    'siteName','schoolName','catchCopy','subCopy',
    'newsSecTitle','newsSecDesc'
  ];
  fields.forEach(key => {
    const el = document.getElementById(`config_${key}`);
    if (el) el.value = c[key] || '';
  });
}

function renderListTab(type) {
  const listEl = document.getElementById(`admin-list-${type}`);
  if (!listEl) return;

  let arr;
  if (type.startsWith('sec_')) {
    arr = window.SITE_DATA.sectionItems[type.replace('sec_', '')];
  } else {
    arr = window.SITE_DATA[type];
  }

  if (!arr || arr.length === 0) {
    listEl.innerHTML = '<p style="font-size:.82rem;color:var(--admin-muted);text-align:center;padding:16px;">データがありません</p>';
    return;
  }

  listEl.innerHTML = arr.map((item, i) => `
    <div class="admin-list-item">
      <div class="admin-list-item__body">
        ${item.date ? `<div class="admin-list-item__date">${item.date}</div>` : ''}
        ${item.type ? `<div class="admin-list-item__date" style="color:var(--color-blue);">${item.type}</div>` : ''}
        <div class="admin-list-item__title">${escapeHtml(item.title || item.place || item.id || '')}</div>
      </div>
      <div class="admin-list-item__actions">
        <button class="admin-icon-btn admin-icon-btn--edit"   onclick="openEditModal('${type}', ${i})" title="編集"><i data-lucide="pencil"></i></button>
        <button class="admin-icon-btn admin-icon-btn--delete" onclick="deleteItem('${type}', ${i})"    title="削除"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// ─────────────────────────────────────────────────────
// localStorage 保存・読み込み
// ─────────────────────────────────────────────────────
function openAdminPanel() {
  renderAdminDynamicTabs();
  const saved = getSavedData();
  if (saved.config) window.SITE_DATA.config = { ...window.SITE_DATA.config, ...saved.config };
  if (saved.news)   window.SITE_DATA.news   = [...saved.news];
  if (saved.sections) window.SITE_DATA.sections = JSON.parse(JSON.stringify(saved.sections));
  if (saved.sectionItems) window.SITE_DATA.sectionItems = JSON.parse(JSON.stringify(saved.sectionItems));

  switchTab('config');
  document.getElementById('admin-panel').classList.add('open');
  document.getElementById('admin-overlay').classList.add('visible');
}

function renderAdminDynamicTabs() {
  const tabsContainer = document.getElementById('admin-tabs');
  const contentContainer = document.getElementById('admin-dynamic-tabs-container');
  
  // 既存の動的タブ・コンテンツを削除
  tabsContainer.querySelectorAll('.dynamic-tab').forEach(el => el.remove());
  
  let contentHTML = '';
  window.SITE_DATA.sections.forEach(sec => {
    // タブ追加
    const icon = sec.type === 'documentList' ? 'file-text' : 'calendar';
    const btn = document.createElement('button');
    btn.className = 'admin-tab-btn dynamic-tab';
    btn.dataset.tab = `sec_${sec.id}`;
    btn.innerHTML = `<i data-lucide="${icon}"></i> ${sec.title}`;
    // clickリスナーは後でバインド
    tabsContainer.appendChild(btn);

    // コンテンツ追加
    contentHTML += `
      <div class="admin-tab-content" data-tab-content="sec_${sec.id}">
        <div class="admin-list-header">
          <div class="admin-list-title">${sec.title} 一覧</div>
          <button class="admin-add-btn" onclick="openEditModal('sec_${sec.id}', null, '${sec.type}')" type="button">
            <i data-lucide="plus"></i> 追加
          </button>
        </div>
        <div class="admin-item-list" id="admin-list-sec_${sec.id}"><!-- JS --></div>
      </div>
    `;
  });
  contentContainer.innerHTML = contentHTML;

  // タブボタンの再バインド
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    // 古いリスナーを消すためにクローン
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => switchTab(newBtn.dataset.tab));
  });
  if (window.lucide) lucide.createIcons();
}

function getSavedData() {
  try {
    return JSON.parse(localStorage.getItem('research_site_data') || '{}');
  } catch { return {}; }
}

async function saveToFirebase() {
  const saved = {
    config: { ...window.SITE_DATA.config },
    news: [...window.SITE_DATA.news],
    sections: JSON.parse(JSON.stringify(window.SITE_DATA.sections)),
    sectionItems: JSON.parse(JSON.stringify(window.SITE_DATA.sectionItems))
  };
  
  try {
    await window.db.collection('siteData').doc('main').set(saved);
  } catch (e) {
    console.error('Firebaseへの保存に失敗しました', e);
    showToast('Firebaseへの保存に失敗しました。権限を確認してください。', 'error');
  }

  // ローカルストレージにもバックアップとして保存（オフライン用・パスワード用）
  const localSaved = getSavedData();
  localSaved.config = saved.config;
  localSaved.news = saved.news;
  localSaved.sections = saved.sections;
  localSaved.sectionItems = saved.sectionItems;
  localStorage.setItem('research_site_data', JSON.stringify(localSaved));
}



// ─────────────────────────────────────────────────────
// トースト通知
// ─────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  toast.textContent = message;
  toast.className   = `show ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// ─────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────
// DOMContentLoaded で初期化
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAdmin);
