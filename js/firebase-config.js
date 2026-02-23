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

    // Exporta as globais
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = typeof firebase.storage === 'function' ? firebase.storage() : null;

    // --- TURBO PARA 4G/SAFARI (Evita que o celular trave a conexão) ---
    window.db.settings({
        experimentalForceLongPolling: true,
        merge: true
    });

    // 🛑 A PERSISTÊNCIA OFFLINE FOI REMOVIDA PARA PARAR DE TRAVAR OS LINKS 🛑

    console.log("🔥 Firebase Pronto e Destravado!");
} else {
    console.error("Firebase não carregado. Verifique os scripts no HTML.");
}
