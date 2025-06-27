# 🤖 Chatbot WhatsApp - Rodrigo Moreira

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![whatsapp-web.js](https://img.shields.io/badge/whatsapp--web.js-1.31-blue)](https://wwebjs.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

Um chatbot inteligente para WhatsApp desenvolvido em Node.js, com integração de IA generativa para respostas contextualizadas e armazenamento de histórico de conversas.
## ✨ Funcionalidades Principais

- **Respostas Inteligentes** 🧠 - Integração com API de IA (DeepSeek) para respostas naturais e contextualizadas
- **Histórico de Conversas** 💾 - Armazenamento de mensagens no MongoDB para manter contexto
- **Controle de Sessão** 🧩 - Gerenciamento de estado por usuário
- **UX Aprimorada** ✍️ - Efeitos de digitação simulada para melhor experiência
- **Segurança** 🔒 - Validação de mensagens e tratamento de erros robusto

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js
- **WhatsApp**: whatsapp-web.js (v1.31)
- **Banco de Dados**: MongoDB (via Mongoose)
- **IA**: DeepSeek API
- **Outras Libs**:
  - Axios - Requisições HTTP
  - dotenv - Gerenciamento de variáveis de ambiente
  - qrcode-terminal - Autenticação via QR Code

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/rodrigovmoreira/Chatbot-talk.git
cd chatbot-whatsapp
```
2. Instale as dependências:
```bash
npm install
```
