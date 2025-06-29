const socket = io();
const qrcodeImg = document.getElementById('qrcode');
const statusDiv = document.getElementById('status');
const qrcodeContainer = document.getElementById('qrcode-container');
const successContainer = document.getElementById('success-container');

socket.on('connect', () => {
  statusDiv.textContent = 'Conectado ao servidor...';
});

socket.on('qr', (url) => {
  qrcodeImg.src = url;
  statusDiv.textContent = 'Escaneie o QR Code no WhatsApp';
  statusDiv.className = 'status waiting';
  // Mostra QR Code e oculta ícone de sucesso
  qrcodeContainer.classList.remove('hidden');
  successContainer.classList.add('hidden');
});

socket.on('status', (message) => {
  statusDiv.textContent = message;
  if (message.includes('Conectado')) {
    statusDiv.className = 'status connected';
    // Oculta QR Code e mostra ícone de sucesso
    qrcodeContainer.classList.add('hidden');
    successContainer.classList.remove('hidden');
    // Opcional: Altera o título
    document.querySelector('h1').textContent = 'WhatsApp Conectado!';
  } else if (message.includes('Desconectado')) {
    statusDiv.className = 'status error';
    // Volta ao estado inicial
    qrcodeContainer.classList.remove('hidden');
    successContainer.classList.add('hidden');
  }
});

socket.on('disconnect', () => {
  statusDiv.textContent = 'Servidor desconectado';
  statusDiv.className = 'status error';
});