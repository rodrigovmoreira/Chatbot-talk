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

console.log('🔌 Conectando ao Socket.IO...');
const socket = io({
    auth: { token }
});

// Logs de conexão Socket.IO
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor via Socket.IO');
});

socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado do Socket.IO:', reason);
});

socket.on('connect_error', (error) => {
    console.error('💥 Erro de conexão Socket.IO:', error);
});

// Gerenciar status do WhatsApp
socket.on('qr', (url) => {
    console.log('📱 QR Code recebido no cliente');
    document.getElementById('qrcode').src = url;
    document.getElementById('whatsapp-status').textContent = 'Escaneie o QR Code';
    document.getElementById('whatsapp-status').className = 'status waiting';
    document.getElementById('qrcode-container').classList.remove('hidden');
});

socket.on('status', (message) => {
    console.log('📢 Status recebido:', message);
    const statusDiv = document.getElementById('whatsapp-status');
    statusDiv.textContent = message;
    
    if (message.includes('Conectado')) {
        statusDiv.className = 'status connected';
        document.getElementById('qrcode-container').classList.add('hidden');
    } else if (message.includes('Escaneie')) {
        statusDiv.className = 'status waiting';
    }
});

// Carregar configurações do negócio
async function loadBusinessConfig() {
    console.log('📋 Carregando configurações do negócio...');
    try {
        const response = await fetch('/api/business-config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Resposta da API config:', response.status);
        
        if (response.ok) {
            const config = await response.json();
            console.log('✅ Configurações carregadas:', config);
            
            document.getElementById('business-name').textContent = config.businessName;
            document.getElementById('business-name-input').value = config.businessName;
            document.getElementById('business-type').value = config.businessType;
            document.getElementById('welcome-message').value = config.welcomeMessage;
            
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
    
    if (!menuOptions || menuOptions.length === 0) {
        container.innerHTML = '<p>Nenhuma opção configurada</p>';
        return;
    }
    
    container.innerHTML = menuOptions.map((option, index) => `
        <div class="menu-option">
            <input type="text" value="${option.keyword}" placeholder="Palavra-chave" 
                   onchange="updateMenuOption(${index}, 'keyword', this.value)">
            <input type="text" value="${option.description}" placeholder="Descrição"
                   onchange="updateMenuOption(${index}, 'description', this.value)">
            <textarea onchange="updateMenuOption(${index}, 'response', this.value)"
                      placeholder="Resposta">${option.response}</textarea>
            <button onclick="removeMenuOption(${index})">🗑️</button>
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

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, inicializando dashboard...');
    loadBusinessConfig();
    
    document.getElementById('business-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('💾 Salvando configurações do negócio...');
        await saveBusinessConfig();
    });
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