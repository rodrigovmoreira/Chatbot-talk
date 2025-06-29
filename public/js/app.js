const socket = io();
const qrcodeImg = document.getElementById('qrcode');
const statusDiv = document.getElementById('status');

socket.on('connect', () => {
  statusDiv.textContent = 'Conectado ao servidor...';
});

socket.on('qr', (url) => {
  qrcodeImg.src = url;
  statusDiv.textContent = 'Escaneie o QR Code no WhatsApp';
  statusDiv.className = 'status waiting';
});

socket.on('status', (message) => {
  statusDiv.textContent = message;
  if (message.includes('Conectado')) {
    statusDiv.className = 'status connected';
  } else if (message.includes('Desconectado')) {
    statusDiv.className = 'status error';
  }
});

socket.on('disconnect', () => {
  statusDiv.textContent = 'Servidor desconectado';
  statusDiv.className = 'status error';
});