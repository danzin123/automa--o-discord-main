require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const express = require('express'); // Adicionado para o servidor web da Render

// --- Servidor Web para manter o bot online na Render ---
const app = express();

app.get('/', (req, res) => {
    res.send('Bot do Santos está online e operante na Render!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor web rodando na porta ${port} para evitar hibernação.`);
});
// -------------------------------------------------------

// Inicializa o cliente usando a biblioteca de self-bot
const client = new Client({
    checkUpdate: false, // Evita avisos de atualização no console
});

// Configurações via variáveis de ambiente
const DISCORD_USER_TOKEN = process.env.DISCORD_USER_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

// O SEGREDO ESTÁ AQUI: 
// O '.split(',')' corta o texto do .env toda vez que acha uma vírgula.
// O '.map(id => id.trim())' limpa os espaços em branco que você deixou entre um ID e outro.
const canaisMonitorados = process.env.DISCORD_CHANNEL_ID.split(',').map(id => id.trim());

client.once('ready', () => {
    console.log(`Self-Bot logado na conta: ${client.user.tag}`);
    console.log(`Monitorando ${canaisMonitorados.length} canais silenciosamente...`);
});

client.on('messageCreate', async (message) => {
    // Evita ler as próprias mensagens caso você digite algo lá
    if (message.author.id === client.user.id) return;

    // Verifica se o ID do canal da mensagem está dentro da nossa lista de canais monitorados
    if (!canaisMonitorados.includes(message.channelId)) return;

    const legenda = message.content;
    const anexo = message.attachments.first();

    // Verifica se há uma imagem anexada na mensagem
    if (anexo && anexo.contentType && anexo.contentType.startsWith('image/')) {
        const urlImagem = anexo.url;

        console.log(`Nova notícia com imagem detectada no canal ${message.channelId}. Repassando para a página...`);

        try {
            // Faz a requisição POST para a Graph API do Facebook
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                url: urlImagem,
                message: legenda,
                access_token: FACEBOOK_ACCESS_TOKEN
            });

            console.log(`Sucesso! Foto publicada na página. ID: ${response.data.id}`);
        } catch (error) {
            console.error('Erro ao postar imagem no Facebook:');
            if (error.response) {
                console.error(error.response.data);
            } else {
                console.error(error.message);
            }
        }
    } 
    // Trata mensagens que contêm apenas texto, sem imagens
    else if (legenda && !anexo) {
         console.log(`Nova notícia em texto detectada no canal ${message.channelId}. Repassando para a página...`);
         
         try {
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                message: legenda,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Texto publicado na página. ID: ${response.data.id}`);
         } catch (error) {
             console.error('Erro ao postar texto no Facebook:');
             if (error.response) {
                 console.error(error.response.data);
             } else {
                 console.error(error.message);
             }
         }
    }
});

// Inicia o bot conectando com o token do seu usuário
client.login(DISCORD_USER_TOKEN);