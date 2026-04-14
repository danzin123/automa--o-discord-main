require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');
const express = require('express');

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

const client = new Client({
    checkUpdate: false,
});

const DISCORD_USER_TOKEN = process.env.DISCORD_USER_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

const canaisMonitorados = process.env.DISCORD_CHANNEL_ID.split(',').map(id => id.trim());

client.once('ready', async () => {
    console.log(`Self-Bot logado na conta: ${client.user.tag}`);
    console.log(`Monitorando ${canaisMonitorados.length} canais silenciosamente...`);

    // =========================================================================
    // ⚠️ INÍCIO DO BLOCO DE TESTE: Puxar a última notícia ao ligar
    // (APAGUE ESTA PARTE INTEIRA DEPOIS QUE O TESTE DER CERTO NO FACEBOOK)
    // =========================================================================
    try {
        console.log('--- INICIANDO TESTE ---');
        console.log('Buscando a última mensagem do primeiro canal da lista...');
        
        // Pega o ID do primeiro canal que você configurou no .env
        const canalTesteId = canaisMonitorados[0]; 
        const canal = await client.channels.fetch(canalTesteId);
        
        // Pede para a API do Discord a última (1) mensagem do canal
        const mensagens = await canal.messages.fetch({ limit: 1 });
        const ultimaMensagem = mensagens.first();

        if (ultimaMensagem) {
            console.log(`Última mensagem encontrada! Tentando processar...`);
            const legendaTeste = ultimaMensagem.content;
            const anexoTeste = ultimaMensagem.attachments.first();

            // Teste de Imagem
            if (anexoTeste && anexoTeste.contentType && anexoTeste.contentType.startsWith('image/')) {
                console.log('A mensagem possui uma imagem. Repassando para a página...');
                const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                    url: anexoTeste.url,
                    message: legendaTeste,
                    access_token: FACEBOOK_ACCESS_TOKEN
                });
                console.log(`[TESTE OK] Foto publicada com sucesso! ID: ${response.data.id}`);
            } 
            // Teste de Texto
            else if (legendaTeste && !anexoTeste) {
                console.log('A mensagem é apenas texto. Repassando para a página...');
                const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                    message: legendaTeste,
                    access_token: FACEBOOK_ACCESS_TOKEN
                });
                console.log(`[TESTE OK] Texto publicado com sucesso! ID: ${response.data.id}`);
            } else {
                console.log('A última mensagem não é foto nem texto (pode ser um vídeo ou aviso do servidor).');
            }
        } else {
            console.log('O canal está vazio, nenhuma mensagem encontrada para testar.');
        }
        console.log('--- FIM DO TESTE ---');
    } catch (erro) {
        console.error('Falha ao tentar puxar a mensagem de teste:', erro.message);
    }
    // =========================================================================
    // ⚠️ FIM DO BLOCO DE TESTE
    // =========================================================================
});

client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;
    if (!canaisMonitorados.includes(message.channelId)) return;

    const legenda = message.content;
    const anexo = message.attachments.first();

    if (anexo && anexo.contentType && anexo.contentType.startsWith('image/')) {
        const urlImagem = anexo.url;
        console.log(`Nova notícia com imagem detectada no canal ${message.channelId}. Repassando para a página...`);

        try {
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                url: urlImagem,
                message: legenda,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Foto publicada na página. ID: ${response.data.id}`);
        } catch (error) {
            console.error('Erro ao postar imagem no Facebook:', error.response ? error.response.data : error.message);
        }
    } 
    else if (legenda && !anexo) {
         console.log(`Nova notícia em texto detectada no canal ${message.channelId}. Repassando para a página...`);
         
         try {
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                message: legenda,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Texto publicado na página. ID: ${response.data.id}`);
         } catch (error) {
             console.error('Erro ao postar texto no Facebook:', error.response ? error.response.data : error.message);
         }
    }
});

client.login(DISCORD_USER_TOKEN);