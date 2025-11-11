const CACHE_NAME = 'daily-bible-v1';
// 由于所有内容都在 index.html 中，我们只需要缓存它
const URLS_TO_CACHE = [
  './',
  './index.html'
  // 注意: manifest.json 和图标也会被浏览器自动缓存
  // 如果您未来添加了其他 .css, .js 或背景图片, 记得在这里添加它们的路径
  // 例如: './style.css', './background.jpg'
];

// 1. 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// 2. 激活 Service Worker (清理旧缓存)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // 清理所有不等于当前CACHE_NAME的旧缓存
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. 拦截网络请求 (核心)
self.addEventListener('fetch', event => {
  // 我们只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 策略: 网络优先 (Network First, Falling Back to Cache)
  // 这能确保用户总能获取最新的 index.html (如果他们添加了新数据)
  // 同时在离线时提供备用
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 检查响应是否有效
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 克隆响应，一份给缓存，一份给浏览器
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
          
        return response;
      })
      .catch(() => {
        // 如果网络请求失败 (离线), 则从缓存中查找
        console.log('Network request failed. Trying cache...');
        return caches.match(event.request);
      })
  );
});
