/**
 * CONTROLLER - Novo Cadastro Happy Pet (Versão Estabilizada)
 */

let tutorIdAtual = null;
let listaVacinasTemp = [];
let catalogoVacinasCache = [];

const bancoRacas = {
    canino: ["SRD", "Shih Tzu", "Yorkshire", "Poodle", "Golden Retriever", "Bulldog", "Pinscher", "Lhasa Apso", "Pitbull", "Maltês", "Pug", "Dachshund"],
    felino: ["SRD", "Siamês", "Persa", "Maine Coon", "Angorá", "Ragdoll", "Bengal"]
};

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCatalogoDoFirebase();
    configurarCEP();
    configurarEventosTutor();
    configurarEventosPet();
});

// --- BUSCA DE CEP AUTOMÁTICA (Corrigida e Sem Erro de Variável) ---
function configurarCEP() {
    const inputCep = document.getElementById('cliCep');
    let buscando = false;

    if(inputCep) {
        inputCep.addEventListener('blur', function(e) {
            const valor = e.target.value.replace(/\D/g, '');
            if(valor.length === 8 && !buscando) {
                buscando = true;
                const inputEnd = document.getElementById('cliEndereco');
                inputEnd.value = "Localizando...";

                Utils.consultarCEP(valor, (dados) => {
                    if(dados && !dados.erro) {
                        inputEnd.value = `${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`;
                        setTimeout(() => document.getElementById('cliNum').focus(), 100);
                    } else {
                        alert("CEP não encontrado.");
                        inputEnd.value = "";
                    }
                    buscando = false;
                });
            }
        });
    }
}

// --- ETAPA 1: LÓGICA DO TUTOR (Com Validação Real de CPF) ---
function configurarEventosTutor() {
    const cpfInput = document.getElementById('cliCpf');
    
    if(cpfInput) {
        cpfInput.addEventListener('blur', async (e) => {
            const cpfLimpo = e.target.value.replace(/\D/g, '');
            
            // Valida o algoritmo do CPF
            if (cpfLimpo.length > 0 && !Utils.validarCPF(cpfLimpo)) {
                alert("CPF inválido! Verifique os números.");
                return;
            }

            if(cpfLimpo.length === 11) {
                try {
                    const query = await db.collection('clientes').where('cpf', '==', cpfLimpo).get();
                    if(!query.empty) {
                        const dadosTutor = query.docs[0].data();
                        if(confirm(`Tutor já cadastrado: ${dadosTutor.nome}.\nDeseja carregar os dados?`)) {
                            tutorIdAtual = query.docs[0].id;
                            preencherCamposTutor(dadosTutor);
                            avancarParaPets();
                        }
                    }
                } catch (err) { console.error(err); }
            }
        });
    }

    document.getElementById('formTutor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSalvarTutor');
        const cpfValor = document.getElementById('cliCpf').value.replace(/\D/g, '');

        if (cpfValor !== "" && !Utils.validarCPF(cpfValor)) {
            alert("Não é possível salvar com CPF inválido.");
            return;
        }

        const nomeDigitado = document.getElementById('cliNome').value.trim();
        const telefoneMasc = document.getElementById('cliTel').value;
        
        const dados = {
            nome: nomeDigitado,
            nome_busca: nomeDigitado.toLowerCase(),
            cpf: cpfValor,
            telefone: telefoneMasc.replace(/\D/g, ''),
            telefoneFormatado: telefoneMasc,
            cep: document.getElementById('cliCep').value.replace(/\D/g, ''),
            endereco: document.getElementById('cliEndereco').value,
            numero: document.getElementById('cliNum').value,
            bairro: document.getElementById('cliEndereco').value.split(',')[1]?.trim() || 'N/I',
            saldo_devedor: 0,
            criadoEm: new Date()
        };

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            if (tutorIdAtual) {
                await db.collection('clientes').doc(tutorIdAtual).update(dados);
            } else {
                const docRef = await db.collection('clientes').add(dados);
                tutorIdAtual = docRef.id;
            }
            
            alert("Tutor salvo!");
            btn.innerHTML = '<i class="fas fa-check"></i> SALVO';
            avancarParaPets();
        } catch (err) { 
            alert("Erro: " + err.message); 
            btn.disabled = false;
        }
    });
}

// --- ETAPA 2: LÓGICA DO PET ---
async function carregarCatalogoDoFirebase() {
    try {
        const snapshot = await db.collection('catalogo_vacinas').get();
        catalogoVacinasCache = snapshot.docs.map(doc => doc.data());
    } catch (e) { 
        catalogoVacinasCache = [
            { nome: 'V10', especie: 'canino', dias_reforco: 365 },
            { nome: 'Antirrábica', especie: 'ambos', dias_reforco: 365 }
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
        btnMostrarForm.onclick = () => {
            formPet.style.display = 'block';
            btnMostrarForm.style.display = 'none';
        };
    }

    selEspecie.onchange = (e) => {
        const esp = e.target.value;
        const dlRacas = document.getElementById('listaRacasSugestao');
        dlRacas.innerHTML = (bancoRacas[esp] || []).map(r => `<option value="${r}">`).join('');
        selVacina.innerHTML = '<option value="">Selecione a vacina...</option>';
        catalogoVacinasCache.filter(v => v.especie === esp || v.especie === 'ambos').forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.nome;
            opt.dataset.reforco = v.dias_reforco || 365;
            opt.textContent = v.nome;
            selVacina.appendChild(opt);
        });
    };

    const calcularRetorno = () => {
        const selected = selVacina.options[selVacina.selectedIndex];
        const dataDose = inputDataDose.value;
        const dataNasc = document.getElementById('petNascimento').value;
        if (selected && dataDose && selected.value !== "") {
            let dias = parseInt(selected.dataset.reforco) || 365;
            if (dataNasc) {
                const meses = (new Date(dataDose + 'T12:00:00') - new Date(dataNasc + 'T12:00:00')) / (1000 * 60 * 60 * 24 * 30);
                if (meses < 4 && ['V10', 'V8', 'V5'].includes(selected.value)) dias = 21;
            }
            let [ano, mes, dia] = dataDose.split('-');
            let d = new Date(ano, mes - 1, dia); 
            d.setDate(d.getDate() + dias);
            document.getElementById('dataRevacinaPrevista').value = d.toISOString().split('T')[0];
        }
    };
    
    selVacina.onchange = calcularRetorno;
    inputDataDose.onchange = calcularRetorno;

    document.getElementById('btnAddVacinaLista').onclick = () => {
        const nome = selVacina.value;
        const dose = inputDataDose.value;
        const revac = document.getElementById('dataRevacinaPrevista').value;
        if(!nome || !dose || !revac) return alert("Preencha os dados da vacina!");
        listaVacinasTemp.push({ nome, data_aplicacao: dose, data_revacina: revac });
        document.getElementById('miniListaVacinas').innerHTML += `<div style="padding:5px; background:#eee; margin-top:5px; border-radius:5px;"><b>${nome}</b> - ${revac.split('-').reverse().join('/')}</div>`;
        selVacina.value = ""; inputDataDose.value = ""; document.getElementById('dataRevacinaPrevista').value = "";
    };

    formPet.onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        let proximaRevacina = (listaVacinasTemp.length > 0) ? new Date(Math.min(...listaVacinasTemp.map(v => new Date(v.data_revacina + 'T12:00:00')))).toISOString().split('T')[0] : '2099-12-31';

        const petData = {
            nome: document.getElementById('petNome').value.trim(),
            especie: selEspecie.value,
            raca: document.getElementById('petRaca').value || 'SRD',
            sexo: document.getElementById('petSexo').value,
            castrado: document.getElementById('petCastrado').value === 'sim',
            nascimento: document.getElementById('petNascimento').value,
            comportamento: document.querySelector('input[name="comportamento"]:checked')?.value || 'manso',
            vacinas: listaVacinasTemp,
            data_revacina: proximaRevacina,
            tutorTel: document.getElementById('cliTel').value.replace(/\D/g, ''),
            criadoEm: new Date()
        };

        try {
            btn.disabled = true;
            await db.collection('clientes').doc(tutorIdAtual).collection('pets').add(petData);
            alert("Pet salvo!");
            document.getElementById('listaPetsCadastrados').innerHTML += `<div style="font-weight:bold; padding:5px;">${petData.nome}</div>`;
            limparFormularioPet();
        } catch (err) { alert(err.message); btn.disabled = false; }
    };

    document.getElementById('btnCancelarPet').onclick = limparFormularioPet;
}

function preencherCamposTutor(d) {
    document.getElementById('cliNome').value = d.nome || '';
    document.getElementById('cliCpf').value = d.cpf || '';
    document.getElementById('cliTel').value = d.telefoneFormatado || d.telefone || '';
    document.getElementById('cliCep').value = d.cep || '';
    document.getElementById('cliEndereco').value = d.endereco || '';
    document.getElementById('cliNum').value = d.numero || '';
}

function avancarParaPets() {
    document.getElementById('cardTutor').style.opacity = '0.6';
    document.getElementById('cardTutor').style.pointerEvents = 'none';
    document.getElementById('secaoPets').style.display = 'block';
}

function limparFormularioPet() {
    document.getElementById('formPet').reset();
    listaVacinasTemp = [];
    document.getElementById('miniListaVacinas').innerHTML = '';
    document.getElementById('formPet').style.display = 'none';
    document.getElementById('btnMostrarFormPet').style.display = 'block';
}
