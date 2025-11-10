const socket = io({
  auth: {
    token: getCookie('auth_token')
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

async function initDashboard() {
  await loadBusinessConfig();
  setupBusinessForm();
  setupMenuManagement();
  setupBehaviorForm();
  setupMessageConfig();
  handleWhatsAppStatus();
}

/* ============================================================
   🔐 AUTENTICAÇÃO E LOGOUT
============================================================ */
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

/* ============================================================
   ⚙️ CARREGAMENTO E ATUALIZAÇÃO DE CONFIGURAÇÃO
============================================================ */
async function loadBusinessConfig() {
  try {
    const res = await fetch('/api/business-config', {
      headers: { Authorization: `Bearer ${getCookie('auth_token')}` }
    });
    const config = await res.json();

    document.getElementById('business-name-input').value = config.businessName || '';
    document.getElementById('business-type').value = config.businessType || 'outros';
    document.getElementById('welcome-message').value = config.welcomeMessage || '';

    renderMenuOptions(config.menuOptions || []);
    renderBehaviorRules(config.behaviorRules || {});
    renderMessageConfigs(config.messages || {});

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
        Authorization: `Bearer ${getCookie('auth_token')}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();
    console.log('✅ Configuração atualizada:', result);
  } catch (error) {
    console.error('💥 Erro ao atualizar configuração:', error);
  }
}

/* ============================================================
   📋 MENU DE ATENDIMENTO
============================================================ */
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
      <button onclick="removeMenuOption(${index})">🗑️ Remover</button>
    `;
    container.appendChild(div);
  });
}

function setupMenuManagement() {
  const addBtn = document.querySelector('.btn-secondary');
  addBtn.addEventListener('click', () => addMenuOption());
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
      <input type="checkbox" data-index="${newIndex}" data-field="requiresHuman"> Requer atendente humano
    </label>
    <button onclick="removeMenuOption(${newIndex})">🗑️ Remover</button>
  `;
  container.appendChild(div);
}

function removeMenuOption(index) {
  const container = document.getElementById('menu-options-container');
  container.children[index]?.remove();
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

/* ============================================================
   🧠 REGRAS DE COMPORTAMENTO
============================================================ */
function renderBehaviorRules(rules) {
  const container = document.createElement('div');
  container.classList.add('behavior-config');
  container.innerHTML = `
    <h4>Regras de Comportamento</h4>
    <label><input type="checkbox" id="use-ai" ${rules.useAIOnFallback ? 'checked' : ''}> Usar IA quando não entender</label><br>
    <label><input type="checkbox" id="forward-human" ${rules.forwardToHumanIfNotUnderstood ? 'checked' : ''}> Encaminhar ao humano se não entender</label><br>
    <label><input type="checkbox" id="respond-outside" ${rules.respondOutsideHours ? 'checked' : ''}> Responder fora do horário</label><br>
    <button id="save-behavior-btn" class="btn-primary">Salvar Regras</button>
  `;
  document.querySelector('.card-business').appendChild(container);

  document.getElementById('save-behavior-btn').addEventListener('click', async () => {
    const update = {
      behaviorRules: {
        useAIOnFallback: document.getElementById('use-ai').checked,
        forwardToHumanIfNotUnderstood: document.getElementById('forward-human').checked,
        respondOutsideHours: document.getElementById('respond-outside').checked
      }
    };
    await updateBusinessConfig(update);
  });
}

/* ============================================================
   💬 MENSAGENS PADRÃO
============================================================ */
function renderMessageConfigs(msgs) {
  const container = document.createElement('div');
  container.classList.add('message-config');
  container.innerHTML = `
    <h4>Mensagens Padrão</h4>
    <label>Erro padrão:</label>
    <textarea id="msg-error" rows="2">${msgs.defaultError || ''}</textarea>
    <label>Encaminhamento para humano:</label>
    <textarea id="msg-human" rows="2">${msgs.humanForward || ''}</textarea>
    <label>Fallback de IA:</label>
    <textarea id="msg-ai" rows="2">${msgs.aiFallback || ''}</textarea>
    <button id="save-msgs-btn" class="btn-primary">Salvar Mensagens</button>
  `;
  document.querySelector('.card-business').appendChild(container);

  document.getElementById('save-msgs-btn').addEventListener('click', async () => {
    const update = {
      messages: {
        defaultError: document.getElementById('msg-error').value,
        humanForward: document.getElementById('msg-human').value,
        aiFallback: document.getElementById('msg-ai').value
      }
    };
    await updateBusinessConfig(update);
  });
}

/* ============================================================
   📱 STATUS DO WHATSAPP
============================================================ */
function handleWhatsAppStatus() {
  const statusEl = document.getElementById('whatsapp-status');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const successContainer = document.getElementById('success-container');
  const btn = document.getElementById('whatsapp-action-btn');

  socket.on('status', (status) => {
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

  socket.on('qr', (qrImageUrl) => {
    const qrImg = document.getElementById('qrcode');
    qrImg.src = qrImageUrl;
    qrcodeContainer.classList.remove('hidden');
  });
}
