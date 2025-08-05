// Carrega fluxos ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  loadFlows();
  setupSocketConnection();
});

// Carrega lista de fluxos
async function loadFlows() {
  const response = await fetch('/api/flows');
  const flows = await response.json();
  
  const flowsList = document.getElementById('flows-list');
  flowsList.innerHTML = flows.map(flow => `
    <div class="p-3 border-b flex justify-between items-center">
      <div>
        <strong>${flow.trigger}</strong>: ${flow.content.substring(0, 30)}...
      </div>
      <button onclick="editFlow('${flow._id}')" class="text-blue-500">Editar</button>
    </div>
  `).join('');
}

// Configura conexão Socket.IO para QR Code
function setupSocketConnection() {
  const socket = io();
  
  socket.on('qr', (url) => {
    document.getElementById('qrcode').src = url;
  });
  
  socket.on('status', (message) => {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.textContent = message;
    
    if (message.includes('Conectado')) {
      statusDiv.className = 'p-2 rounded bg-green-100 text-green-800';
    } else if (message.includes('Erro')) {
      statusDiv.className = 'p-2 rounded bg-red-100 text-red-800';
    }
  });
}

// Gerencia o modal de fluxos
function openFlowModal(flow = null) {
  const modal = document.getElementById('flow-modal');
  const form = document.getElementById('flow-form');
  
  if (flow) {
    document.getElementById('flow-id').value = flow._id;
    document.getElementById('trigger').value = flow.trigger;
    document.getElementById('response-type').value = flow.responseType;
    document.getElementById('content').value = flow.content;
  } else {
    form.reset();
  }
  
  modal.classList.remove('hidden');
}

function closeFlowModal() {
  document.getElementById('flow-modal').classList.add('hidden');
}

// Envia formulário de fluxo
document.getElementById('flow-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const flowData = {
    trigger: document.getElementById('trigger').value,
    responseType: document.getElementById('response-type').value,
    content: document.getElementById('content').value
  };
  
  const flowId = document.getElementById('flow-id').value;
  const url = flowId ? `/api/flows/${flowId}` : '/api/flows';
  const method = flowId ? 'PUT' : 'POST';
  
  try {
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flowData)
    });
    
    closeFlowModal();
    loadFlows();
  } catch (error) {
    console.error('Erro ao salvar fluxo:', error);
  }
});