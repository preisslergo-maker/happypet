/**
 * FIREBASE CONFIG - BLINDADO + OFFLINE (MULTI-ABAS)
 */

const firebaseConfig = {
  apiKey: "AIzaSyB12ZGGdhmBHmLpG0zcaLPaj-aFPlcAfNI",
  authDomain: "vetfamily-b110a.firebaseapp.com",
  projectId: "vetfamily-b110a",
  storageBucket: "vetfamily-b110a.firebasestorage.app",
  messagingSenderId: "262884239352",
  appId: "1:262884239352:web:70cab5140db210811f580d"
};

try {
    if (typeof firebase === 'undefined') {
        console.error("ERRO CRÍTICO: As bibliotecas do Firebase (app, firestore, auth) não foram carregadas no <head> do HTML.");
        alert("Erro Técnico: Firebase não encontrado. Verifique sua internet ou o código.");
    } else {
        // Inicializa apenas se ainda não foi inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Exporta Globais
        window.db = firebase.firestore();
        window.auth = firebase.auth();

        // --- ATIVAÇÃO DO MODO OFFLINE (COM SUPORTE A MÚLTIPLAS ABAS) ---
        // A opção { synchronizeTabs: true } evita erros se você abrir 2 abas do sistema
/*        window.db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log("✅ Modo Offline ativado! O sistema funcionará sem internet.");
            })
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistência falhou: Múltiplas abas abertas (tente fechar outras abas).');
                } else if (err.code == 'unimplemented') {
                    console.warn('Este navegador não suporta salvar dados offline.');
                }
            });
*/       
        // Verifica Storage
        if (typeof firebase.storage === 'function') {
            window.storage = firebase.storage();
            console.log("📦 Storage Ativo (Pronto para fotos na nuvem).");
        } else {
            console.warn("⚠️ Biblioteca Storage não carregada. Fotos continuarão pesando no banco.");
            window.storage = null;
        }

        console.log("🔥 Firebase conectado com sucesso.");
    }
} catch (error) {
    console.error("Erro fatal na config:", error);
    alert("Erro de Configuração: " + error.message);
}

// Ativar persistência offline
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Múltiplas abas abertas, a persistência só funciona em uma por vez
        console.log('Persistência falhou: múltiplas abas');
    } else if (err.code == 'unimplemented') {
        // O navegador não suporta (raro em celulares modernos)
        console.log('O navegador não suporta persistência');
    }
});