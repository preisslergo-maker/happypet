/**
 * CLIENT SERVICE - Gestão Inteligente de Tutores e Pets
 */

const ClientService = {
    
    // --- SALVAR CLIENTE (COM MATRÍCULA SEQUENCIAL) ---
    salvar: async (dados) => {
        const db = firebase.firestore();

        // 1. Preparar Keywords para busca (Nome, Co-Tutores, Matrícula)
        let keywords = [];
        keywords = keywords.concat(dados.nome.toLowerCase().split(' '));
        if (dados.coTutores) {
            dados.coTutores.forEach(co => {
                if(co.nome) keywords = keywords.concat(co.nome.toLowerCase().split(' '));
            });
        }
        // Adiciona a matrícula como string para buscar pelo número
        if (dados.matricula) keywords.push(dados.matricula.toString());
        
        keywords = [...new Set(keywords)].filter(k => k.length > 1);

        const payload = {
            nome: dados.nome,
            cpf: dados.cpf,
            telefone: dados.telefone,
            email: dados.email || '',
            cep: dados.cep || '',
            endereco: dados.endereco || '',
            bairro: dados.bairro || '',
            numero: dados.numero || '',
            complemento: dados.complemento || '',
            coTutores: dados.coTutores || [],
            searchKeywords: keywords,
            updatedAt: new Date().toISOString()
        };

        // A) ATUALIZAR (Cliente já existe)
        if (dados.id) {
            // Não mexemos na matrícula na edição
            await db.collection('clientes').doc(dados.id).update(payload);
            return dados.id;
        } 
        
        // B) NOVO CLIENTE (Gerar Matrícula 1000+)
        else {
            const contadorRef = db.collection('contadores').doc('clientes');
            
            return await db.runTransaction(async (transaction) => {
                const contadorDoc = await transaction.get(contadorRef);
                
                // Se o contador não existir, inicia em 999 (próximo será 1000)
                let novoNumero = 1000;
                if (contadorDoc.exists) {
                    novoNumero = contadorDoc.data().atual + 1;
                } else {
                    transaction.set(contadorRef, { atual: 999 }); 
                }

                // Atualiza o contador global
                transaction.set(contadorRef, { atual: novoNumero }, { merge: true });

                // Prepara o novo cliente
                payload.matricula = novoNumero;
                payload.createdAt = new Date().toISOString();
                payload.animais = []; 
                
                // Cria com ID automático do Firebase
                const novoClienteRef = db.collection('clientes').doc();
                transaction.set(novoClienteRef, payload);
                
                return novoClienteRef.id;
            });
        }
    },

    // --- BUSCA INTELIGENTE ---
    buscar: async (termo) => {
        if (!termo || termo.length < 2) return []; 
        termo = termo.toLowerCase().trim();
        const db = firebase.firestore();

        // Se for número, tenta buscar pela Matrícula ou CPF
        if (!isNaN(termo)) {
            // Tenta matrícula exata primeiro (convertendo string para number se necessário)
            const snapMatricula = await db.collection('clientes')
                .where('matricula', '==', parseInt(termo))
                .limit(5)
                .get();
                
            if (!snapMatricula.empty) {
                return snapMatricula.docs.map(d => ({id: d.id, ...d.data()}));
            }
        } 
        
        // Busca textual (Keywords)
        const snapNome = await db.collection('clientes')
            .where('searchKeywords', 'array-contains', termo)
            .limit(20)
            .get();
        
        return snapNome.docs.map(d => ({id: d.id, ...d.data()}));
    },

    listarRecentes: async () => {
        const db = firebase.firestore();
        const snap = await db.collection('clientes')
            .orderBy('createdAt', 'desc')
            .limit(12)
            .get();
        return snap.docs.map(d => ({id: d.id, ...d.data()}));
    },

    // --- GESTÃO DE PETS (Salvar/Editar com Matrícula Hierárquica) ---
    salvarPet: async (clienteId, petData, indexEdicao = null) => {
        const db = firebase.firestore();
        const clienteRef = db.collection('clientes').doc(clienteId);

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(clienteRef);
            if (!doc.exists) throw "Cliente não encontrado!";
            
            const cliente = doc.data();
            let animais = cliente.animais || [];
            let keywords = cliente.searchKeywords || [];

            // Adiciona nome do pet nas buscas do cliente
            keywords = keywords.concat(petData.nome.toLowerCase().split(' '));
            keywords = [...new Set(keywords)].filter(k => k.length > 1);

            if (indexEdicao !== null) {
                // MODO EDIÇÃO: Mantém a matrícula antiga
                petData.matricula = animais[indexEdicao].matricula; 
                petData.data_cadastro = animais[indexEdicao].data_cadastro; // Preserva data original
                animais[indexEdicao] = petData; // Substitui
            } else {
                // MODO NOVO: Gera Matrícula Hierárquica (Ex: 1001 -> 100101)
                const matriculaPai = cliente.matricula || "0000";
                // Conta quantos pets existem para gerar o próximo (ex: 1 virar '01')
                const sequencial = (animais.length + 1).toString().padStart(2, '0');
                
                petData.matricula = `${matriculaPai}${sequencial}`;
                petData.data_cadastro = new Date().toISOString();
                animais.push(petData);
            }

            transaction.update(clienteRef, { 
                animais: animais,
                searchKeywords: keywords
            });
        });
    }
};