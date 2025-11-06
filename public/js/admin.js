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

// Estado do WhatsApp
let whatsappConnected = false;

// Socket.IO
console.log('🔌 Conectando ao Socket.IO...');
const socket = io({
    auth: { 
        token: token 
    },
    transports: ['websocket', 'polling']
});

// Eventos Socket.IO
socket.on('connect', () => {
    console.log('✅ Conectado ao servidor via Socket.IO');
    console.log('🔗 ID da conexão:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Desconectado do Socket.IO:', reason);
    updateWhatsAppStatus('Desconectado do servidor', 'disconnected');
});

socket.on('connect_error', (error) => {
    console.error('💥 Erro de conexão Socket.IO:', error);
    updateWhatsAppStatus('Erro de conexão', 'error');
});

// ✅ CORREÇÃO: Eventos do WhatsApp simplificados
socket.on('whatsapp_ready', (isReady) => {
    console.log('📱 Status WhatsApp pronto:', isReady);
    whatsappConnected = isReady;
    updateWhatsAppUI(isReady);
});

socket.on('qr', (url) => {
    console.log('📱 QR Code recebido no cliente');
    console.log('🖼️ URL do QR Code:', url.substring(0, 100) + '...');
    
    showQRCode(url);
    updateWhatsAppStatus('Aguardando escaneamento do QR Code...', 'waiting');
});

socket.on('status', (message) => {
    console.log('📢 Status recebido:', message);
    updateWhatsAppStatus(message, getStatusClass(message));
});

// ✅ CORREÇÃO: Função única para toggle do WhatsApp
function toggleWhatsApp() {
    console.log('🔄 Alternando estado do WhatsApp...');
    if (whatsappConnected) {
        disconnectWhatsApp();
    } else {
        connectWhatsApp();
    }
}

function connectWhatsApp() {
    console.log('🔗 Solicitando QR Code...');
    socket.emit('request_qr');
    updateWhatsAppStatus('Solicitando QR Code...', 'waiting');
}

function disconnectWhatsApp() {
    console.log('🔌 Solicitando desconexão...');
    // Em uma implementação real, aqui você enviaria um evento para o servidor desconectar
    updateWhatsAppStatus('Desconectado - Recarregue a página para reconectar', 'disconnected');
    updateWhatsAppUI(false);
}

// ✅ CORREÇÃO: Atualização unificada da UI do WhatsApp
function updateWhatsAppUI(isConnected) {
    const statusDiv = document.getElementById('whatsapp-status');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const successContainer = document.getElementById('success-container');
    const actionBtn = document.getElementById('whatsapp-action-btn');
    
    whatsappConnected = isConnected;
    
    if (isConnected) {
        // WhatsApp CONECTADO
        console.log('✅ Atualizando UI para: CONECTADO');
        qrcodeContainer.classList.add('hidden');
        successContainer.classList.remove('hidden');
        actionBtn.textContent = '🔌 Desconectar WhatsApp';
        actionBtn.className = 'btn-secondary';
        statusDiv.textContent = 'Conectado com sucesso!';
        statusDiv.className = 'status connected';
    } else {
        // WhatsApp DESCONECTADO
        console.log('❌ Atualizando UI para: DESCONECTADO');
        qrcodeContainer.classList.add('hidden');
        successContainer.classList.add('hidden');
        actionBtn.textContent = 'Conectar WhatsApp';
        actionBtn.className = 'btn-primary';
        statusDiv.textContent = 'Desconectado';
        statusDiv.className = 'status disconnected';
    }
}

function updateWhatsAppStatus(message, statusClass) {
    const statusDiv = document.getElementById('whatsapp-status');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const successContainer = document.getElementById('success-container');
    const actionBtn = document.getElementById('whatsapp-action-btn');
    
    if (!statusDiv) {
        console.error('❌ Elemento #whatsapp-status não encontrado');
        return;
    }
    
    statusDiv.textContent = message;
    statusDiv.className = `status ${statusClass}`;
    
    // Atualiza a UI baseada no status atual
    if (statusClass === 'connected') {
        updateWhatsAppUI(true);
    } else if (statusClass === 'waiting') {
        qrcodeContainer.classList.remove('hidden');
        successContainer.classList.add('hidden');
        actionBtn.textContent = 'Conectar WhatsApp';
        actionBtn.className = 'btn-primary';
    } else if (statusClass === 'disconnected' || statusClass === 'error') {
        updateWhatsAppUI(false);
    }
}

function getStatusClass(message) {
    if (message.includes('Conectado') || message.includes('pronto') || message.includes('Autenticado')) return 'connected';
    if (message.includes('Escaneie') || message.includes('QR Code')) return 'waiting';
    if (message.includes('Desconectado') || message.includes('Falha') || message.includes('Erro')) return 'disconnected';
    return 'waiting';
}

function showQRCode(url) {
    const qrcodeImg = document.getElementById('qrcode');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const successContainer = document.getElementById('success-container');
    
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
    
    // Mostrar container do QR Code e ocultar sucesso
    qrcodeContainer.classList.remove('hidden');
    if (successContainer) {
        successContainer.classList.add('hidden');
    }
    
    console.log('✅ QR Code exibido na interface');
}

// ✅ Sistema de Menu de Atendimento
let menuOptions = [];

function loadMenuOptions(options) {
    console.log('📝 Carregando opções do menu:', options);
    menuOptions = options || [];
    const container = document.getElementById('menu-options-container');
    
    if (!container) {
        console.error('❌ Container de opções do menu não encontrado');
        return;
    }
    
    if (menuOptions.length === 0) {
        container.innerHTML = '<p class="no-options">Nenhuma opção configurada. Clique em "Adicionar Opção" para começar.</p>';
        return;
    }
    
    container.innerHTML = menuOptions.map((option, index) => `
        <div class="menu-option" data-index="${index}">
            <input type="text" value="${option.keyword || ''}" placeholder="Palavra-chave (ex: produtos)" 
                   onchange="updateMenuOption(${index}, 'keyword', this.value)">
            <input type="text" value="${option.description || ''}" placeholder="Descrição (ex: Ver produtos)"
                   onchange="updateMenuOption(${index}, 'description', this.value)">
            <textarea placeholder="Resposta automática" 
                      onchange="updateMenuOption(${index}, 'response', this.value)">${option.response || ''}</textarea>
            <div class="menu-actions">
                <label class="human-attendance-label">
                    <input type="checkbox" ${option.requiresHuman ? 'checked' : ''} 
                           onchange="updateMenuOption(${index}, 'requiresHuman', this.checked)">
                    Encaminhar para atendente humano
                </label>
                <button class="btn-remove" onclick="removeMenuOption(${index})">🗑️ Remover</button>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ ${menuOptions.length} opções carregadas`);
}

function addMenuOption() {
    console.log('➕ Adicionando nova opção de menu');
    
    const newOption = {
        keyword: '',
        description: '',
        response: '',
        requiresHuman: false
    };
    
    menuOptions.push(newOption);
    saveMenuOptions();
    loadMenuOptions(menuOptions);
}

function removeMenuOption(index) {
    console.log(`🗑️ Tentando remover opção: ${index}`);
    
    if (confirm('Tem certeza que deseja remover esta opção?')) {
        menuOptions.splice(index, 1);
        saveMenuOptions();
        loadMenuOptions(menuOptions);
        console.log(`✅ Opção ${index} removida`);
    }
}

async function updateMenuOption(index, field, value) {
    console.log(`📝 Atualizando opção ${index}, campo ${field}:`, value);
    
    if (menuOptions[index]) {
        menuOptions[index][field] = value;
        await saveMenuOptions();
        console.log(`✅ Opção ${index} atualizada com sucesso`);
    } else {
        console.error(`❌ Opção ${index} não encontrada`);
    }
}

async function saveMenuOptions() {
    console.log('💾 Salvando opções do menu...');
    
    try {
        const response = await fetch('/api/business-config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                menuOptions: menuOptions
            })
        });
        
        if (response.ok) {
            console.log('✅ Opções do menu salvas com sucesso');
        } else {
            const error = await response.json();
            console.error('❌ Erro ao salvar opções:', error);
            alert('Erro ao salvar opções: ' + (error.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('💥 ERRO ao salvar opções:', error);
        alert('Erro de conexão ao salvar opções');
    }
}

// ✅ Carregar configurações do negócio
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
            
            // Carregar estatísticas
            loadStats();
        } else {
            console.error('❌ Erro ao carregar configurações:', response.status);
            const error = await response.json();
            alert('Erro ao carregar configurações: ' + (error.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('💥 ERRO ao carregar configurações:', error);
        alert('Erro de conexão ao carregar configurações');
    }
}

// ✅ Carregar estatísticas
async function loadStats() {
    console.log('📊 Carregando estatísticas...');
    
    try {
        // Por enquanto, vamos usar valores estáticos
        // Em uma implementação real, você faria uma chamada API
        document.getElementById('total-conversations').textContent = '0';
        document.getElementById('total-customers').textContent = '0';
        document.getElementById('messages-today').textContent = '0';
        document.getElementById('response-rate').textContent = '0%';
        
        console.log('✅ Estatísticas carregadas');
    } catch (error) {
        console.error('💥 Erro ao carregar estatísticas:', error);
    }
}

// ✅ Salvar configurações do negócio
async function saveBusinessConfig() {
    console.log('💾 Salvando configurações do negócio...');
    
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
            alert('✅ Configurações salvas com sucesso!');
        } else {
            const error = await response.json();
            console.error('❌ Erro ao salvar configurações:', error);
            alert('❌ Erro ao salvar configurações: ' + (error.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('💥 ERRO ao salvar configurações:', error);
        alert('❌ Erro de conexão ao salvar configurações');
    }
}

// ✅ Função de logout
async function logout() {
    console.log('🚪 Realizando logout...');
    
    if (!confirm('Tem certeza que deseja sair?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/logout', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ Logout realizado com sucesso');
        } else {
            console.error('❌ Erro no logout:', response.status);
        }
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

// ✅ INICIALIZAÇÃO
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
    
    // Configurar botão do WhatsApp
    const whatsappBtn = document.getElementById('whatsapp-action-btn');
    if (whatsappBtn) {
        // Já está configurado via onclick no HTML
        console.log('✅ Botão WhatsApp configurado');
    } else {
        console.error('❌ Botão WhatsApp não encontrado');
    }
    
    console.log('✅ Dashboard inicializado completamente');
});

// ✅ Tratamento de erros globais
window.addEventListener('error', function(event) {
    console.error('💥 Erro global capturado:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('💥 Promise rejeitada não tratada:', event.reason);
});

console.log('✅ admin.js carregado completamente');