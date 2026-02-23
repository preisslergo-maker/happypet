const firebaseConfig = {
  apiKey: "AIzaSyB12ZGGdhmBHmLpG0zcaLPaj-aFPlcAfNI",
  authDomain: "vetfamily-b110a.firebaseapp.com",
  projectId: "vetfamily-b110a",
  storageBucket: "vetfamily-b110a.firebasestorage.app",
  messagingSenderId: "262884239352",
  appId: "1:262884239352:web:70cab5140db210811f580d"
};

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Exporta as globais de uma vez só
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = typeof firebase.storage === 'function' ? firebase.storage() : null;

    // ATIVAÇÃO DO MODO OFFLINE ÚNICA E CORRETA
    window.db.enablePersistence({ synchronizeTabs: true })
        .then(() => console.log("✅ Happy Pet Online e Offline!"))
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Persistência: Use apenas uma aba por vez.');
            } else {
                console.error('Erro de persistência:', err.code);
            }
        });

    console.log("🔥 Firebase Pronto.");
} else {
    console.error("Firebase não carregado. Verifique os scripts no HTML.");
}
