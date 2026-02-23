/**
 * CONTROLLER - Novo Cadastro Happy Pet (Corrigido e Padronizado)
 */

let tutorIdAtual = null;
let listaVacinasTemp = [];
let catalogoVacinasCache = [];

const bancoRacas = {
    canino: ["SRD", "Shih Tzu", "Yorkshire", "Poodle", "Golden Retriever", "Bulldog", "Pinscher", "Lhasa Apso", "Pitbull", "Maltês", "Pug", "Dachshund"],
    felino: ["SRD", "Siamês", "Persa", "Maine Coon", "Angorá", "Ragdoll", "Bengal"]
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carrega vacinas do Firebase
    await carregarCatalogoDoFirebase();
    
    // 2. Ativa os mecanismos
    configurarCEP();
    configurarEventosTutor();
    configurarEventosPet();
});

// --- BUSCA DE CEP AUTOMÁTICA ---
function configurarCEP() {
    const cepInput = document.getElementById('cliCep');
    if(cepInput) {
        cepInput.addEventListener('blur', async (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if(cep.length !== 8) return;

            const inputEnd = document.getElementById('cliEndereco');
            inputEnd.value = "Buscando endereço...";

            const dados = await Utils.consultarCEP(cep);
            if(dados) {
                // Preenche Bairro e Cidade, útil para a rota da Natalia
                inputEnd.value = `${dados.logradouro}, ${dados.bairro}`;
                document.getElementById('cliNum').focus();
            } else {
                inputEnd.value = "";
                alert("CEP não encontrado.");
            }
        });
    }
}

// --- ETAPA 1: LÓGICA DO TUTOR ---
function configurarEventosTutor() {
    const cpfInput = document.getElementById('cliCpf');
    
    // Verifica se CPF já existe
    if(cpfInput) {
        cpfInput.addEventListener('blur', async (e) => {
            const cpf = e.target.value.replace(/\D/g, '');
            if(cpf.length !== 11) return;

            const query = await db.collection('clientes').where('cpf', '==', cpf).get();
            if(!query.empty) {
                const dadosTutor = query.docs[0].data();
                if(confirm(`Tutor já cadastrado: ${dadosTutor.nome}.\n\nDeseja carregar estes dados para adicionar mais um pet?`)) {
                    tutorIdAtual = query.docs[0].id;
                    preencherCamposTutor(dadosTutor);
                    avancarParaPets();
                }
            }
        });
    }

    // Salvando o Tutor no Padrão Novo
    document.getElementById('formTutor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSalvarTutor');
        
        const nomeDigitado = document.getElementById('cliNome').value.trim();
        const telefoneMasc = document.getElementById('cliTel').value;
        const telefoneLimpo = telefoneMasc.replace(/\D/g, ''); // Guarda só números pro zap
        
        // PADRÃO DE DADOS DO TUTOR
        const dados = {
            nome: nomeDigitado,
            nome_busca: nomeDigitado.toLowerCase(), // CRUCIAL para a busca funcionar!
            cpf: document.getElementById('cliCpf').value.replace(/\D/g, ''),
            telefone: telefoneLimpo,
            telefoneFormatado: telefoneMasc, // Salva os dois formatos
            cep: document.getElementById('cliCep').value.replace(/\D/g, ''),
            endereco: document.getElementById('cliEndereco').value,
            numero: document.getElementById('cliNum').value,
            bairro: document.getElementById('cliEndereco').value.split(',')[1]?.trim() || 'N/I', // Tenta extrair bairro
            saldo_devedor: 0, // Inicia zerado para não quebrar a lógica financeira
            criadoEm: new Date()
        };

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            // Tenta salvar usando o ClientService (se existir) ou direto no Firestore
            if(typeof ClientService !== 'undefined' && ClientService.salvar) {
                 tutorIdAtual = await ClientService.salvar(dados);
            } else {
                 const docRef = await db.collection('clientes').add(dados);
                 tutorIdAtual = docRef.id;
            }
            
            alert("✅ Tutor salvo com sucesso! Agora cadastre o Pet.");
            btn.innerHTML = '<i class="fas fa-check"></i> SALVO';
            avancarParaPets();
        } catch (err) { 
            console.error(err);
            alert("Erro ao salvar: " + err.message); 
            btn.disabled = false; 
            btn.innerHTML = '<i class="fas fa-save"></i> TENTAR NOVAMENTE';
        }
    });
}

// --- ETAPA 2: LÓGICA DO PET & VACINAS ---
async function carregarCatalogoDoFirebase() {
    try {
        const snapshot = await db.collection('catalogo_vacinas').get();
        catalogoVacinasCache = snapshot.docs.map(doc => doc.data());
    } catch (e) { 
        console.warn("Sem catálogo de vacinas no Firebase. Usando array local."); 
        // Array local caso a coleção não exista ainda
        catalogoVacinasCache = [
            { nome: 'V10', especie: 'canino', dias_reforco: 365 },
            { nome: 'Antirrábica', especie: 'ambos', dias_reforco: 365 },
            { nome: 'V5 (Quíntupla Felina)', especie: 'felino', dias_reforco: 365 }
        ];
    }
}

function configurarEventosPet() {
    const btnMostrarForm = document.getElementById('btnMostrarFormPet');
    const formPet = document.getElementById('formPet');
    const selEspecie = document.getElementById('petEspecie');
    const selVacina = document.getElementById('selVacina');
    const inputDataDose = document.getElementById('dataVac');

    if(btnMostrarForm) {
        btnMostrarForm.addEventListener('click', () => {
            formPet.style.display = 'block';
            btnMostrarForm.style.display = 'none';
        });
    }

    // Troca espécie: Atualiza Datalist e Select de Vacinas
    selEspecie.addEventListener('change', (e) => {
        const esp = e.target.value;
        const dlRacas = document.getElementById('listaRacasSugestao');
        dlRacas.innerHTML = (bancoRacas[esp] || []).map(r => `<option value="${r}">`).join('');

        selVacina.innerHTML = '<option value="">Selecione a vacina...</option>';
        const vacinasFiltradas = catalogoVacinasCache.filter(v => v.especie === esp || v.especie === 'ambos');
        
        vacinasFiltradas.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.nome;
            opt.dataset.reforco = v.dias_reforco || 365;
            opt.textContent = v.nome;
            selVacina.appendChild(opt);
        });
    });

    // Cálculo automático de retorno (com compensação de fuso corrigida)
    const calcularRetorno = () => {
        const selected = selVacina.options[selVacina.selectedIndex];
        const dataDose = inputDataDose.value;
        const dataNasc = document.getElementById('petNascimento').value;

        if (selected && dataDose && selected.value !== "") {
            let dias = parseInt(selected.dataset.reforco) || 365;

            // Lógica de Filhote
            if (dataNasc) {
                // Verifica idade aprox
                const dNasc = new Date(dataNasc);
                const dDose = new Date(dataDose);
                const meses = (dDose - dNasc) / (1000 * 60 * 60 * 24 * 30);
                
                const vacinasPrincipais = ['V10', 'V8', 'V5', 'Giardia'];
                if (meses < 4 && vacinasPrincipais.includes(selected.value)) {
                    dias = 21;
                }
            }

            // Garante que a data lida do input não sofra com fuso horário
            let [ano, mes, dia] = dataDose.split('-');
            let d = new Date(ano, mes - 1, dia); 
            d.setDate(d.getDate() + dias);
            
            // Formata YYYY-MM-DD
            document.getElementById('dataRevacinaPrevista').value = d.toISOString().split('T')[0];
        }
    };
    
    selVacina.addEventListener('change', calcularRetorno);
    inputDataDose.addEventListener('change', calcularRetorno);

    // Carregar vacina na lista temporária
    document.getElementById('btnAddVacinaLista').onclick = () => {
        const nome = selVacina.value;
        const dose = inputDataDose.value;
        const revac = document.getElementById('dataRevacinaPrevista').value;
        
        if(!nome || !dose || !revac) return alert("Preencha a vacina, data da dose e previsão de retorno!");

        listaVacinasTemp.push({ nome: nome, data_aplicacao: dose, data_revacina: revac });
        
        document.getElementById('miniListaVacinas').innerHTML += `
            <div class="vacina-item" style="border-left: 3px solid var(--primary); padding: 8px; margin-bottom: 5px; background: #eee; border-radius: 5px;">
                <b>${nome}</b><br>
                <small>Retorno: ${revac.split('-').reverse().join('/')}</small>
            </div>`;
            
        // Limpa pra próxima vacina
        selVacina.value = "";
        inputDataDose.value = "";
        document.getElementById('dataRevacinaPrevista').value = "";
    };

    // Salvar Pet no Banco
    formPet.onsubmit = async (e) => {
        e.preventDefault();
        
        if(!tutorIdAtual) {
            alert("Erro: Salve o tutor primeiro!");
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const comp = document.querySelector('input[name="comportamento"]:checked');
        const tutorTel = document.getElementById('cliTel').value.replace(/\D/g, ''); // Pega o tel do form acima

        // Pega a data da última revacina adicionada (se houver) para o alerta do dashboard
        let proximaRevacinaGlobal = null;
        if(listaVacinasTemp.length > 0) {
            // Pega a data mais próxima
            let datas = listaVacinasTemp.map(v => new Date(v.data_revacina));
            proximaRevacinaGlobal = new Date(Math.min.apply(null, datas)).toISOString().split('T')[0];
        }

        // PADRÃO DE DADOS DO PET
        const petData = {
            nome: document.getElementById('petNome').value.trim(),
            especie: selEspecie.value,
            raca: document.getElementById('petRaca').value || 'SRD',
            sexo: document.getElementById('petSexo').value,
            castrado: document.getElementById('petCastrado').value === 'sim',
            microchip: document.getElementById('petChip').value || '',
            nascimento: document.getElementById('petNascimento').value,
            comportamento: comp ? comp.value : 'manso',
            vacinas: listaVacinasTemp, // O Array de vacinas
            data_revacina: proximaRevacinaGlobal || '2099-12-31', // CRUCIAL para o Dashboard de Vacinas
            tutorTel: tutorTel, // Importante pro botão do zap no dashboard de vacinas
            criadoEm: new Date()
        };

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando Pet...';
            
            // Salva na subcoleção do tutor atual
            await db.collection('clientes').doc(tutorIdAtual).collection('pets').add(petData);
            
            alert("🐾 Pet salvo com sucesso!");
            
            document.getElementById('listaPetsCadastrados').innerHTML += `
                <div class="card-mini" style="padding:10px; margin-bottom:8px; border-left: 4px solid var(--primary);">
                    <strong>${petData.nome}</strong> (${petData.raca})
                </div>`;
                
            limparFormularioPet();
        } catch (err) { 
            console.error(err);
            alert("Erro ao salvar pet: " + err.message); 
            btn.disabled = false; 
            btn.innerHTML = 'SALVAR ESTE PET';
        }
    };

    document.getElementById('btnCancelarPet').onclick = limparFormularioPet;
}

// AUXILIARES
function preencherCamposTutor(d) {
    document.getElementById('cliNome').value = d.nome || '';
    document.getElementById('cliCpf').value = d.cpf || '';
    document.getElementById('cliTel').value = d.telefoneFormatado || d.telefone || '';
    document.getElementById('cliCep').value = d.cep || '';
    document.getElementById('cliEndereco').value = d.endereco || '';
    document.getElementById('cliNum').value = d.numero || '';
}

function avancarParaPets() {
    // Escurece o form do tutor e desabilita cliques
    document.getElementById('cardTutor').style.opacity = '0.6';
    document.getElementById('cardTutor').style.pointerEvents = 'none';
    
    // Mostra a área de pets e rola a tela para baixo
    document.getElementById('secaoPets').style.display = 'block';
    setTimeout(() => {
        document.getElementById('secaoPets').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function limparFormularioPet() {
    document.getElementById('formPet').reset();
    listaVacinasTemp = [];
    document.getElementById('miniListaVacinas').innerHTML = '';
    document.getElementById('formPet').style.display = 'none';
    document.getElementById('btnMostrarFormPet').style.display = 'block';
    
    // Rola para o topo do form do pet
    document.getElementById('secaoPets').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
