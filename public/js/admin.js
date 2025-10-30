console.log('🔄 Carregando admin.js...');

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

console.log('🔐 Token no localStorage:', token ? 'PRESENTE' : 'AUSENTE');
console.log('👤 Usuário no localStorage:', user);

if (!token) {
    console.log('❌ Sem token, redirecionando para login...');
    window.location.href = '/admin/login';
} else {
    console.log('✅ Token presente, continuando...');
}

document.getElementById('user-greeting').textContent = `Olá, ${user.name || 'Usuário'}!`;

// ✅ CORREÇÃO: Inicialização do Socket.IO com mais opções
console.log('🔌 Conectando ao Socket.IO...');
const socket = io({
    auth: { 
        token: token 
    },
    transports: ['websocket', 'polling'] // Forçar ambos os transportes
});

// ✅ CORREÇÃO: Logs de conexão Socket.IO
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor via Socket.IO');
    console.log('🔗 ID da conexão:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado do Socket.IO:', reason);
    document.getElementById('whatsapp-status').textContent = 'Desconectado do servidor';
    document.getElementById('whatsapp-status').className = 'status disconnected';
});

socket.on('connect_error', (error) => {
    console.error('💥 Erro de conexão Socket.IO:', error);
    document.getElementById('whatsapp-status').textContent = 'Erro de conexão';
    document.getElementById('whatsapp-status').className = 'status error';
});

// ✅ CORREÇÃO: Gerenciar status do WhatsApp com mais detalhes
socket.on('qr', (url) => {
    console.log('📱 QR Code recebido no cliente');
    console.log('🖼️ URL do QR Code:', url.substring(0, 100) + '...'); // Log parcial da URL
    
    const qrcodeImg = document.getElementById('qrcode');
    const statusDiv = document.getElementById('whatsapp-status');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const successContainer = document.getElementById('success-container');
    
    // Verificar se os elementos existem
    if (!qrcodeImg) {
        console.error('❌ Elemento #qrcode não encontrado');
        return;
    }
    if (!qrcodeContainer) {
        console.error('❌ Elemento #qrcode-container não encontrado');
        return;
    }
    
    // Atualizar a imagem do QR Code
    qrcodeImg.src = url;
    qrcodeImg.alt = 'QR Code para conectar WhatsApp';
    
    // Atualizar status
    statusDiv.textContent = 'Aguardando escaneamento do QR Code...';
    statusDiv.className = 'status waiting';
    
    // Mostrar container do QR Code e ocultar sucesso
    qrcodeContainer.classList.remove('hidden');
    if (successContainer) {
        successContainer.classList.add('hidden');
    }
    
    console.log('✅ QR Code exibido na interface');
});

socket.on('status', (message) => {
    console.log('📢 Status recebido:', message);
    const statusDiv = document.getElementById('whatsapp-status');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const successContainer = document.getElementById('success-container');
    
    if (!statusDiv) {
        console.error('❌ Elemento #whatsapp-status não encontrado');
        return;
    }
    
    statusDiv.textContent = message;
    
    if (message.includes('Conectado') || message.includes('pronto')) {
        statusDiv.className = 'status connected';
        if (qrcodeContainer) qrcodeContainer.classList.add('hidden');
        if (successContainer) successContainer.classList.remove('hidden');
        console.log('✅ WhatsApp conectado - interface atualizada');
    } else if (message.includes('Escaneie') || message.includes('QR Code')) {
        statusDiv.className = 'status waiting';
        if (qrcodeContainer) qrcodeContainer.classList.remove('hidden');
        if (successContainer) successContainer.classList.add('hidden');
    } else if (message.includes('Desconectado') || message.includes('Falha')) {
        statusDiv.className = 'status disconnected';
        if (qrcodeContainer) qrcodeContainer.classList.add('hidden');
        if (successContainer) successContainer.classList.add('hidden');
    } else {
        statusDiv.className = 'status waiting';
    }
});

// ✅ CORREÇÃO: Função para conectar WhatsApp
function connectWhatsApp() {
    console.log('🔗 Solicitando nova geração de QR Code...');
    // O servidor deve regenerar o QR Code automaticamente quando o cliente WhatsApp estiver pronto
    // Esta função pode ser usada para forçar uma reconexão se necessário
    document.getElementById('whatsapp-status').textContent = 'Solicitando QR Code...';
    document.getElementById('whatsapp-status').className = 'status waiting';
}

// ✅ CORREÇÃO: Carregar configurações do negócio
async function loadBusinessConfig() {
    console.log('📋 Carregando configurações do negócio...');
    try {
        const response = await fetch('/api/business-config', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Resposta da API config:', response.status);
        
        if (response.ok) {
            const config = await response.json();
            console.log('✅ Configurações carregadas:', config);
            
            // Atualizar interface com as configurações
            document.getElementById('business-name').textContent = config.businessName || 'Meu Negócio';
            document.getElementById('business-name-input').value = config.businessName || '';
            document.getElementById('business-type').value = config.businessType || 'outros';
            document.getElementById('welcome-message').value = config.welcomeMessage || '';
            
            // Carregar opções do menu
            loadMenuOptions(config.menuOptions || []);
        } else {
            console.error('❌ Erro ao carregar configurações:', response.status);
        }
    } catch (error) {
        console.error('💥 ERRO ao carregar configurações:', error);
    }
}

function loadMenuOptions(menuOptions) {
    console.log('📝 Carregando opções do menu:', menuOptions);
    const container = document.getElementById('menu-options-container');
    
    if (!container) {
        console.error('❌ Container de opções do menu não encontrado');
        return;
    }
    
    if (!menuOptions || menuOptions.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Nenhuma opção configurada</p>';
        return;
    }
    
    container.innerHTML = menuOptions.map((option, index) => `
        <div class="menu-option">
            <input type="text" value="${option.keyword || ''}" placeholder="Palavra-chave (ex: produtos)" 
                   onchange="updateMenuOption(${index}, 'keyword', this.value)">
            <input type="text" value="${option.description || ''}" placeholder="Descrição (ex: Ver produtos)"
                   onchange="updateMenuOption(${index}, 'description', this.value)">
            <textarea onchange="updateMenuOption(${index}, 'response', this.value)"
                      placeholder="Resposta automática">${option.response || ''}</textarea>
            <button onclick="removeMenuOption(${index})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️ Remover</button>
        </div>
    `).join('');
}

async function updateMenuOption(index, field, value) {
    console.log(`📝 Atualizando opção ${index}, campo ${field}:`, value);
    try {
        const response = await fetch('/api/business-config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                [`menuOptions.${index}.${field}`]: value
            })
        });
        
        if (response.ok) {
            console.log('✅ Opção atualizada com sucesso');
        } else {
            console.error('❌ Erro ao atualizar opção:', response.status);
        }
    } catch (error) {
        console.error('💥 ERRO ao atualizar opção:', error);
    }
}

// ✅ CORREÇÃO: Função de logout
async function logout() {
    console.log('🚪 Realizando logout...');
    try {
        await fetch('/api/logout', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('💥 Erro no logout:', error);
    } finally {
        // Limpar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirecionar para login
        window.location.href = '/admin/login';
    }
}

// ✅ CORREÇÃO: Inicialização completa
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, inicializando dashboard...');
    
    // Carregar configurações do negócio
    loadBusinessConfig();
    
    // Configurar formulário de negócio
    const businessForm = document.getElementById('business-config-form');
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('💾 Salvando configurações do negócio...');
            await saveBusinessConfig();
        });
    } else {
        console.error('❌ Formulário de configuração do negócio não encontrado');
    }
    
    console.log('✅ Dashboard inicializado completamente');
});

async function saveBusinessConfig() {
    try {
        const configData = {
            businessName: document.getElementById('business-name-input').value,
            businessType: document.getElementById('business-type').value,
            welcomeMessage: document.getElementById('welcome-message').value
        };
        
        console.log('📤 Enviando configurações:', configData);
        
        const response = await fetch('/api/business-config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        if (response.ok) {
            console.log('✅ Configurações salvas com sucesso!');
            // Atualizar o nome no header
            document.getElementById('business-name').textContent = configData.businessName;
            alert('Configurações salvas com sucesso!');
        } else {
            const error = await response.json();
            console.error('❌ Erro ao salvar configurações:', error);
            alert('Erro ao salvar configurações: ' + error.message);
        }
    } catch (error) {
        console.error('💥 ERRO ao salvar configurações:', error);
        alert('Erro de conexão ao salvar configurações');
    }
}

console.log('✅ admin.js carregado completamente');