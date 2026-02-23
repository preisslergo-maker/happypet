const CACHE_NAME = 'happypet-v4.1.2'; // Mudei para v2 para o iPhone entender que é novo

const ASSETS = [
  './',
  './index.html',
  './home.html',
  './agenda.html',
  './atendimento.html',
  './clientes.html',
  './consulta.html',
  './documento.html',
  './exame.html',
  './financeiro.html',
  './novo_agendamento.html',
  './novo_cliente.html',
  './perfil_cliente.html',
  './pets.html',
  './vacinas.html',
  './style.css',
  './manifest.json',
  './js/firebase-config.js',
  './js/client-service.js',
  './js/novo_cliente_controller.js',
  './js/utils.js',
  './assets/icon-192.png',
  './assets/receita_bg.jpg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js'
];

// Instalação: Guarda tudo no iPhone
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ativação: Remove lixo antigo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Estratégia: Cache primeiro (Velocidade Máxima)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
