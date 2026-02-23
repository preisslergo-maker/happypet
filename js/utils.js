/**
 * UTILS - Ferramentas de Formatação, Validação e Otimização
 */
const Utils = {
    // Máscara de Telefone
    maskPhone: (v) => {
        v = v.replace(/\D/g, ""); 
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2"); 
        v = v.replace(/(\d)(\d{4})$/, "$1-$2"); 
        return v;
    },

    abrirZap: (telefone, mensagem) => {
        const num = telefone.replace(/\D/g, '');
        const texto = encodeURIComponent(mensagem);
        window.open(`https://wa.me/55${num}?text=${texto}`, '_blank');
    },

    gerarMensagemVacina: (nomePet, vacina) => {
        return `Olá! Aqui é a Natalia da Happy Pet. 🐾 Vi aqui que a vacina ${vacina} do(a) ${nomePet} venceu. Vamos agendar a revacinação para garantir a proteção dele?`;
    },

    gerarMensagemCobranca: (nomeTutor, valor) => {
        return `Oi ${nomeTutor}, tudo bem? Aqui é a Natalia da Happy Pet. 🐾 Estou passando para te enviar o resumo do seu saldo pendente de R$ ${valor}. Posso te mandar o Pix para acerto?`;
    },
    
    // Máscara de CEP
    maskCEP: (v) => {
        v = v.replace(/\D/g, "");
        v = v.replace(/^(\d{5})(\d)/, "$1-$2");
        return v;
    },

    // Máscara de CPF
    maskCPF: (v) => {
        v = v.replace(/\D/g, "");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return v;
    },

    // --- VALIDAÇÃO REAL DE CPF (Algoritmo Módulo 11) ---
    validarCPF: (cpf) => {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf == '') return false;
        // Elimina CPFs invalidos conhecidos
        if (cpf.length != 11 || 
            cpf == "00000000000" || cpf == "11111111111" || 
            cpf == "22222222222" || cpf == "33333333333" || 
            cpf == "44444444444" || cpf == "55555555555" || 
            cpf == "66666666666" || cpf == "77777777777" || 
            cpf == "88888888888" || cpf == "99999999999")
                return false;
        
        // Valida 1o digito
        let add = 0;
        for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
        let rev = 11 - (add % 11);
        if (rev == 10 || rev == 11) rev = 0;
        if (rev != parseInt(cpf.charAt(9))) return false;
        
        // Valida 2o digito
        add = 0;
        for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
        rev = 11 - (add % 11);
        if (rev == 10 || rev == 11) rev = 0;
        if (rev != parseInt(cpf.charAt(10))) return false;
        
        return true;
    },

    formatDate: (dataISO) => {
        if (!dataISO) return '-';
        const partes = dataISO.split('-'); 
        if(partes.length !== 3) return dataISO; 
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },

    calcularIdade: (dataNascimento) => {
        if (!dataNascimento) return "Idade não inf.";
        
        const hoje = new Date();
        const nasc = new Date(dataNascimento);
        
        let anos = hoje.getFullYear() - nasc.getFullYear();
        let meses = hoje.getMonth() - nasc.getMonth();

        if (meses < 0 || (meses === 0 && hoje.getDate() < nasc.getDate())) {
            anos--;
            meses += 12;
        }

        if (anos > 1) return `${anos} anos`;
        if (anos === 1) return "1 ano";
        if (meses > 1) return `${meses} meses`;
        if (meses === 1) return "1 mês";
        
        return "Recém-nascido";
    },


    // Adicione esta logo abaixo da sua calcularIdade
    calcularMesesEntre: (dataInicio, dataFim) => {
        if (!dataInicio || !dataFim) return 0;
        const d1 = new Date(dataInicio);
        const d2 = new Date(dataFim);
        let meses = (d2.getFullYear() - d1.getFullYear()) * 12;
        meses -= d1.getMonth();
        meses += d2.getMonth();
        return meses <= 0 ? 0 : meses;
    },



    
    // --- BUSCA DE CEP (ViaCEP) ---
    consultarCEP: async (cep) => {
        const limpo = cep.replace(/\D/g, '');
        if (limpo.length !== 8) return null;
        
        try {
            const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
            const data = await res.json();
            if (data.erro) return null;
            return data;
        } catch (e) {
            console.error("Erro CEP:", e);
            return null;
        }
    },

    // --- OTIMIZADOR DE IMAGEM (Redimensiona e Comprime) ---
    comprimirImagem: (file, maxWidth = 800) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Mantém a proporção
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converte para WebP 70%
                    const dataUrl = canvas.toDataURL('image/webp', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};