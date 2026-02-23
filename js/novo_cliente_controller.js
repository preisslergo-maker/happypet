/** * CONTROLLER - Novo Cadastro Happy Pet (Versão Final Destravada e Corrigida) 
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

// --- BUSCA DE CEP AUTOMÁTICA (Versão Corrigida para Callback/JSONP) --- 
function configurarCEP() { 
    const cepInput = document.getElementById('cliCep'); 
    if(cepInput) { 
        cepInput.addEventListener('blur', (e) => { 
            const cep = e.target.value.replace(/\D/g, ''); 
            if(cep.length !== 8) return; 
            
            const inputEnd = document.getElementById('cliEndereco'); 
            const originalVal = inputEnd.value; 
            inputEnd.value = "Buscando endereço..."; 
            
            // Chama o Utils usando Callback para pular o erro de CORS 
            Utils.consultarCEP(cep, (dados) => { 
                if(dados && !dados.erro) { 
                    inputEnd.value = `${dados.logradouro}, ${dados.bairro}, ${dados.localidade} - ${dados.uf}`; 
                    document.getElementById('cliNum').focus(); 
                } else { 
                    inputEnd.value = originalVal; 
                    alert("CEP não encontrado ou erro na conexão."); 
                } 
            }); 
        }); 
    } 
} 

// --- ETAPA 1: LÓGICA DO TUTOR --- 
function configurarEventosTutor() { 
    const cpfInput = document.getElementById('cliCpf'); 
    if(cpfInput) { 
        cpfInput.addEventListener('blur', async (e) => { 
            const cpfLimpo = e.target.value.replace(/\D/g, ''); 
            // 1. Validação de formato/algoritmo 
            if (cpfLimpo.length > 0 && !Utils.validarCPF(cpfLimpo)) { 
                alert("⚠️ CPF Inválido! Por favor, verifique os números."); 
                e.target.style.borderColor = "red"; 
                e.target.focus(); 
                return; 
            } else { 
                e.target.style.borderColor = "#F0F0F0"; 
            } 
            if(cpfLimpo.length !== 11) return; 
            
            // 2. Busca no Firebase (sempre usando o CPF limpo) 
            try { 
                const query = await db.collection('clientes').where('cpf', '==', cpfLimpo).get(); 
                if(!query.empty) { 
                    const dadosTutor = query.docs[0].data(); 
                    if(confirm(`Tutor já cadastrado: ${dadosTutor.nome}.\n\nDeseja carregar estes dados para adicionar mais um pet?`)) { 
                        tutorIdAtual = query.docs[0].id; 
                        preencherCamposTutor(dadosTutor); 
                        avancarParaPets(); 
                    } 
                } 
            } catch (err) { console.error("Erro busca CPF:", err); } 
        }); 
    } 

    document.getElementById('formTutor').addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        const btn = document.getElementById('btnSalvarTutor'); 
        const nomeDigitado = document.getElementById('cliNome').value.trim(); 
        const telefoneMasc = document.getElementById('cliTel').value; 
        const telefoneLimpo = telefoneMasc.replace(/\D/g, ''); 
        
        const dados = { 
            nome: nomeDigitado, 
            nome_busca: nomeDigitado.toLowerCase(), 
            cpf: document.getElementById('cliCpf').value.replace(/\D/g, ''), 
            telefone: telefoneLimpo, 
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
            // Se já carregamos um ID pelo CPF, atualizamos. Se não, criamos novo. 
            if (tutorIdAtual) { 
                await db.collection('clientes').doc(tutorIdAtual).update(dados); 
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
        if (!snapshot.empty) { 
            catalogoVacinasCache = snapshot.docs.map(doc => doc.data()); 
        } else { 
            throw new Error("Coleção vazia"); 
        } 
    } catch (e) { 
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
    
    selEspecie.addEventListener('change', (e) => { 
        const esp = e.target.value; 
        const dlRacas = document.getElementById('listaRacasSugestao'); 
        
        // CORREÇÃO: O bug estava aqui. As aspas e o fechamento da tag option estavam errados.
        dlRacas.innerHTML = (bancoRacas[esp] || []).map(r => `<option value="${r}"></option>`).join(''); 
        
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
    
    const calcularRetorno = () => { 
        const selected = selVacina.options[selVacina.selectedIndex]; 
        const dataDose = inputDataDose.value; 
        const dataNasc = document.getElementById('petNascimento').value; 
        
        if (selected && dataDose && selected.value !== "") { 
            let dias = parseInt(selected.dataset.reforco) || 365; 
            
            if (dataNasc) { 
                const dNasc = new Date(dataNasc + 'T12:00:00'); 
                const dDose = new Date(dataDose + 'T12:00:00'); 
                const meses = (dDose - dNasc) / (1000 * 60 * 60 * 24 * 30); 
                const vacinasPrincipais = ['V10', 'V8', 'V5', 'Giardia']; 
                if (meses < 4 && vacinasPrincipais.includes(selected.value)) { 
                    dias = 21; 
                } 
            } 
            
            let [ano, mes, dia] = dataDose.split('-'); 
            let d = new Date(ano, mes - 1, dia); 
            d.setDate(d.getDate() + dias); 
            document.getElementById('dataRevacinaPrevista').value = d.toISOString().split('T')[0]; 
        } 
    }; 
    
    selVacina.addEventListener('change', calcularRetorno); 
    inputDataDose.addEventListener('change', calcularRetorno); 
    
    document.getElementById('btnAddVacinaLista').onclick = () => { 
        const nome = selVacina.value; 
        const dose = inputDataDose.value; 
        const revac = document.getElementById('dataRevacinaPrevista').value; 
        
        if(!nome || !dose || !revac) return alert("Preencha a vacina, data da dose e previsão de retorno!"); 
        
        listaVacinasTemp.push({ nome: nome, data_aplicacao: dose, data_revacina: revac }); 
        
        const item = document.createElement('div'); 
        item.style = "border-left: 3px solid var(--primary); padding: 8px; margin-bottom: 5px; background: #eee; border-radius: 5px; font-size: 0.8rem;"; 
        item.innerHTML = `<b>${nome}</b><br><small>Retorno: ${revac.split('-').reverse().join('/')}</small>`; 
        document.getElementById('miniListaVacinas').appendChild(item); 
        
        selVacina.value = ""; 
        inputDataDose.value = ""; 
        document.getElementById('dataRevacinaPrevista').value = ""; 
    }; 
    
    formPet.onsubmit = async (e) => { 
        e.preventDefault(); 
        if(!tutorIdAtual) return alert("Erro: Salve o tutor primeiro!"); 
        
        const btn = e.target.querySelector('button[type="submit"]'); 
        const comp = document.querySelector('input[name="comportamento"]:checked'); 
        const tutorTel = document.getElementById('cliTel').value.replace(/\D/g, ''); 
        
        let proximaRevacinaGlobal = null; 
        if(listaVacinasTemp.length > 0) { 
            let datas = listaVacinasTemp.map(v => new Date(v.data_revacina + 'T12:00:00').getTime()); 
            proximaRevacinaGlobal = new Date(Math.min(...datas)).toISOString().split('T')[0]; 
        } 
        
        const petData = { 
            nome: document.getElementById('petNome').value.trim(), 
            especie: selEspecie.value, 
            raca: document.getElementById('petRaca').value || 'SRD', 
            sexo: document.getElementById('petSexo').value, 
            castrado: document.getElementById('petCastrado').value === 'sim', 
            microchip: document.getElementById('petChip').value || '', 
            nascimento: document.getElementById('petNascimento').value, 
            comportamento: comp ? comp.value : 'manso', 
            vacinas: listaVacinasTemp, 
            data_revacina: proximaRevacinaGlobal || '2099-12-31', 
            tutorTel: tutorTel, 
            criadoEm: new Date() 
        }; 
        
        try { 
            btn.disabled = true; 
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando Pet...'; 
            await db.collection('clientes').doc(tutorIdAtual).collection('pets').add(petData); 
            alert("🐾 Pet salvo com sucesso!"); 
            
            const cardMini = document.createElement('div'); 
            cardMini.style = "padding:10px; margin-bottom:8px; border-left: 4px solid var(--primary); background: white; border-radius: 10px; font-weight: bold;"; 
            cardMini.textContent = `${petData.nome} (${petData.raca})`; 
            document.getElementById('listaPetsCadastrados').appendChild(cardMini); 
            
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
    document.getElementById('cardTutor').style.opacity = '0.6'; 
    document.getElementById('cardTutor').style.pointerEvents = 'none'; 
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
    document.getElementById('secaoPets').scrollIntoView({ behavior: 'smooth', block: 'start' }); 
}
