// ============================================================
// 🔌 CONEXÃO SOCKET.IO AUTENTICADA
// ============================================================
const token = getCookie('auth_token');
const socket = io({
  auth: { token },
  transports: ['websocket']
});

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

// ============================================================
// 🚀 INICIALIZAÇÃO DO DASHBOARD
// ============================================================
async function initDashboard() {
  await loadBusinessConfig();
  setupBusinessForm();
  setupMenuManagement();
  handleWhatsAppStatus();
  setupWhatsAppButton();
}

// ============================================================
// 🔐 AUTENTICAÇÃO E LOGOUT
// ============================================================
function logout() {
  fetch('/api/logout', { method: 'POST' })
    .then(() => {
      document.cookie = 'auth_token=; Max-Age=0; path=/;';
      window.location.href = '/admin/login';
    });
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// ============================================================
// ⚙️ CARREGAMENTO E ATUALIZAÇÃO DE CONFIGURAÇÃO
// ============================================================
async function loadBusinessConfig() {
  try {
    const res = await fetch('/api/business-config', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const config = await res.json();

    document.getElementById('business-name-input').value = config.businessName || '';
    document.getElementById('business-type').value = config.businessType || 'outros';
    document.getElementById('welcome-message').value = config.welcomeMessage || '';
    renderMenuOptions(config.menuOptions || []);
  } catch (error) {
    console.error('💥 Erro ao carregar configuração:', error);
  }
}

function setupBusinessForm() {
  const form = document.getElementById('business-config-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      businessName: form.businessName.value,
      businessType: form.businessType.value,
      welcomeMessage: form.welcomeMessage.value
    };
    await updateBusinessConfig(data);
  });
}

async function updateBusinessConfig(updateData) {
  try {
    const res = await fetch('/api/business-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    const result = await res.json();
    console.log('✅ Configuração atualizada:', result);
  } catch (error) {
    console.error('💥 Erro ao atualizar configuração:', error);
  }
}

// ============================================================
// 📋 MENU DE ATENDIMENTO
// ============================================================
function renderMenuOptions(options) {
  const container = document.getElementById('menu-options-container');
  container.innerHTML = '';

  options.forEach((opt, index) => {
    const div = document.createElement('div');
    div.classList.add('menu-option');
    div.innerHTML = `
      <input type="text" placeholder="Palavra-chave" value="${opt.keyword || ''}" data-index="${index}" data-field="keyword">
      <input type="text" placeholder="Descrição" value="${opt.description || ''}" data-index="${index}" data-field="description">
      <textarea placeholder="Resposta">${opt.response || ''}</textarea>
      <label>
        <input type="checkbox" ${opt.requiresHuman ? 'checked' : ''} data-index="${index}" data-field="requiresHuman">
        Requer atendente humano
      </label>
      <button type="button" onclick="removeMenuOption(${index})">🗑️ Remover</button>
    `;
    container.appendChild(div);
  });
}

function setupMenuManagement() {
  document.querySelector('.btn-secondary').addEventListener('click', addMenuOption);
}

function addMenuOption() {
  const container = document.getElementById('menu-options-container');
  const newIndex = container.children.length;

  const div = document.createElement('div');
  div.classList.add('menu-option');
  div.innerHTML = `
    <input type="text" placeholder="Palavra-chave" data-index="${newIndex}" data-field="keyword">
    <input type="text" placeholder="Descrição" data-index="${newIndex}" data-field="description">
    <textarea placeholder="Resposta"></textarea>
    <label>
      <input type="checkbox" data-index="${newIndex}" data-field="requiresHuman">
      Requer atendente humano
    </label>
    <button type="button" onclick="removeMenuOption(${newIndex})">🗑️ Remover</button>
  `;
  container.appendChild(div);
}

function removeMenuOption(index) {
  const container = document.getElementById('menu-options-container');
  if (container.children[index]) container.children[index].remove();
}

async function saveMenuOptions() {
  const container = document.getElementById('menu-options-container');
  const options = Array.from(container.children).map(div => ({
    keyword: div.querySelector('[data-field="keyword"]').value.trim(),
    description: div.querySelector('[data-field="description"]').value.trim(),
    response: div.querySelector('textarea').value.trim(),
    requiresHuman: div.querySelector('[data-field="requiresHuman"]').checked
  }));
  await updateBusinessConfig({ menuOptions: options });
}

// ============================================================
// 📱 STATUS DO WHATSAPP E QR CODE
// ============================================================
function handleWhatsAppStatus() {
  const statusEl = document.getElementById('whatsapp-status');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const qrImg = document.getElementById('qrcode');
  const successContainer = document.getElementById('success-container');
  const btn = document.getElementById('whatsapp-action-btn');

  socket.on('qr', (qrImageUrl) => {
    console.log('📱 QR Code recebido:', qrImageUrl ? 'sim' : 'não');
    qrImg.src = qrImageUrl;
    qrcodeContainer.classList.remove('hidden');
    successContainer.classList.add('hidden');
  });

  socket.on('status', (status) => {
    console.log('📡 Status WhatsApp:', status);
    if (status.includes('Conectado')) {
      statusEl.className = 'status connected';
      statusEl.textContent = 'Conectado';
      qrcodeContainer.classList.add('hidden');
      successContainer.classList.remove('hidden');
      btn.textContent = 'Desconectar WhatsApp';
    } else {
      statusEl.className = 'status disconnected';
      statusEl.textContent = 'Desconectado';
      qrcodeContainer.classList.remove('hidden');
      successContainer.classList.add('hidden');
      btn.textContent = 'Conectar WhatsApp';
    }
  });
}

// ============================================================
// 🔘 AÇÃO DO BOTÃO WHATSAPP
// ============================================================
function setupWhatsAppButton() {
  const btn = document.getElementById('whatsapp-action-btn');
  btn.addEventListener('click', toggleWhatsApp);
}

function toggleWhatsApp() {
  const btn = document.getElementById('whatsapp-action-btn');
  const isDisconnecting = btn.textContent.includes('Desconectar');
  if (isDisconnecting) {
    socket.emit('disconnect-whatsapp');
    console.log('🔌 Solicitando desconexão do WhatsApp...');
  } else {
    socket.emit('connect-whatsapp');
    console.log('🔗 Solicitando conexão do WhatsApp...');
  }
}
