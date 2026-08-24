// js/preload.js

(function() {
  const CACHE_NAME = 'model-cache-v1';
  let db = null;

  const pageConfig = {
    'index.html': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb'],
      background: ['models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'models/full.glb']
    },
    'index2.html': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'sostav/back.png', 'sostav/left.png', 'sostav/right.png'],
      background: ['models/full.glb']
    },
    'index3.html': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'sostav/back.png', 'sostav/left.png', 'sostav/right.png'],
      background: []
    },
    'index4.html': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'sostav/back.png', 'sostav/left.png', 'sostav/right.png'],
      background: []
    },
    'index5.html': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'sostav/back.png', 'sostav/left.png', 'sostav/right.png'],
      background: []
    },
    'index6.html': {
      priority: ['sostav/fon3.png', 'models/full.glb', 'sostav/back.png'],
      background: ['models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb']
    },
    'default': {
      priority: ['sostav/fon3.png', 'models/3untitled.glb', 'models/4untitled.glb', 'models/5untitled.glb', 'models/6untitled.glb', 'models/full.glb', 'sostav/back.png', 'sostav/left.png', 'sostav/right.png'],
      background: []
    }
  };

  function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'index.html';
  }

  function getPageConfig() {
    return pageConfig[getCurrentPage()] || pageConfig['default'];
  }

  function getAllFiles() {
    const all = new Set();
    Object.values(pageConfig).forEach(cfg => {
      cfg.priority.forEach(f => all.add(f));
      cfg.background.forEach(f => all.add(f));
    });
    return Array.from(all);
  }

  function getFileType(path) {
    const ext = path.split('.').pop().toLowerCase();
    if (['glb', 'gltf'].includes(ext)) return 'model';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
    return 'other';
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_NAME, 1);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains('files')) {
          database.createObjectStore('files', { keyPath: 'url' });
        }
      };
      request.onsuccess = () => { db = request.result; resolve(db); };
      request.onerror = () => reject(request.error);
    });
  }

  function saveToCache(url, data) {
    if (!db) return;
    const transaction = db.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    store.put({ url: url, data: data, timestamp: Date.now() });
  }

  function getFromCache(url) {
    return new Promise((resolve, reject) => {
      if (!db) { reject('DB not ready'); return; }
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  }

  async function fetchFile(url) {
    try {
      const response = await fetch(url);
      const fileType = getFileType(url);
      if (fileType === 'model') {
        const buffer = await response.arrayBuffer();
        saveToCache(url, buffer);
        return buffer;
      } else if (fileType === 'image') {
        const blob = await response.blob();
        saveToCache(url, blob);
        return blob;
      }
    } catch (err) {
      console.warn('❌ Fetch failed:', url, err);
      return null;
    }
  }

  async function loadFile(url) {
    const cached = await getFromCache(url);
    if (cached) return cached;
    return await fetchFile(url);
  }

  async function preloadFiles() {
    await openDB();
    const config = getPageConfig();
    const priority = config.priority;
    const background = config.background;

    console.log('📄 Current page:', getCurrentPage());
    console.log('🚀 Priority files:', priority.length);
    console.log('📦 Background files:', background.length);

    for (let i = 0; i < priority.length; i++) {
      const filePath = priority[i];
      const fileType = getFileType(filePath);
      if (fileType === 'model') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'fetch';
        link.href = filePath;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      } else if (fileType === 'image') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = filePath;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
      loadFile(filePath);
      console.log(`⭐ Priority ${i + 1}/${priority.length}: ${filePath}`);
    }

    setTimeout(() => {
      background.forEach((filePath) => {
        const fileType = getFileType(filePath);
        if (fileType === 'model') {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'fetch';
          link.href = filePath;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
        loadFile(filePath);
        console.log(`📦 Background: ${filePath}`);
      });
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadFiles);
  } else {
    preloadFiles();
  }

  window.preloadCache = {
    load: loadFile,
    clear: () => {
      if (!db) return;
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      store.clear();
      console.log('🗑️ Cache cleared');
    }
  };
})();