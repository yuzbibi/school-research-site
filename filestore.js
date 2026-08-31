/**
 * =====================================================
 *  filestore.js — 端末ファイルストレージ（IndexedDB）
 *
 *  アップロードされたPDF等をブラウザのIndexedDBに保存します。
 *  ※ このファイルは編集不要です
 * =====================================================
 */

const FS_DB_NAME  = 'research_site_files';
const FS_STORE    = 'files';
const FS_VERSION  = 1;

let _fsDb = null;

/** IDB接続を開く */
function fsOpen() {
  if (_fsDb) return Promise.resolve(_fsDb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, FS_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(FS_STORE, { keyPath: 'name' });
    };
    req.onsuccess = e => { _fsDb = e.target.result; resolve(_fsDb); };
    req.onerror   = e => reject(e.target.error);
  });
}

/** ファイルを保存する */
window.fsSave = async function(name, file) {
  const db = await fsOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).put({
      name,
      file,
      size:    file.size,
      type:    file.type,
      savedAt: Date.now(),
    });
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
};

/** ファイルを取得する */
window.fsGet = async function(name) {
  const db = await fsOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(FS_STORE).objectStore(FS_STORE).get(name);
    req.onsuccess = e => resolve(e.target.result?.file || null);
    req.onerror   = e => reject(e.target.error);
  });
};

/** ファイルを削除する */
window.fsDelete = async function(name) {
  const db = await fsOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).delete(name);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
};

/** IDB URLを使ってファイルをブラウザで開く（idb:ファイル名） */
window.fsOpenFile = async function(idbUrl) {
  const name = idbUrl.replace(/^idb:/, '');
  try {
    const blob = await window.fsGet(name);
    if (!blob) {
      alert('ファイルが見つかりません。\n管理パネルから再度アップロードしてください。');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch(e) {
    alert('ファイルを開けませんでした: ' + e.message);
  }
};

/** クリックイベントの委譲（idbリンクを処理） */
document.addEventListener('click', e => {
  const link = e.target.closest('[data-idb-url]');
  if (link) {
    e.preventDefault();
    window.fsOpenFile(link.dataset.idbUrl);
  }
});
