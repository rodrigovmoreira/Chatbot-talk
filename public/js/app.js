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
  const instructions = document.querySelector('.instructions');
  
  if (message.includes('Conectado')) {
    statusDiv.className = 'status connected';
    qrcodeContainer.classList.add('hidden');
    successContainer.classList.remove('hidden');
    document.querySelector('h1').textContent = 'WhatsApp Conectado!';
    // Altera as instruções para modo operacional
    instructions.innerHTML = `
      <p>O bot está ativo!</p>
      <p>Você pode minimizar esta janela.</p>
    `;
  } else {
    // Restaura instruções originais se desconectar
    instructions.innerHTML = `
      <p>1. Abra o WhatsApp no seu celular</p>
      <p>2. Toque em <strong>Menu → Dispositivos conectados</strong></p>
      <p>3. Escaneie o QR Code acima</p>
    `;
  }
});

socket.on('disconnect', () => {
  statusDiv.textContent = 'Servidor desconectado';
  statusDiv.className = 'status error';
});