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

// =========================================================================
// O "Limpador" Avançado de formatação do Discord
// =========================================================================
function limparTextoDiscord(texto) {
    if (!texto) return '';
    let limpo = texto;
    
    // Remove marcações do Discord, formatações de texto e citações
    limpo = limpo.replace(/<@&?\d+>/g, '');
    limpo = limpo.replace(/^#+\s*/gm, '');
    limpo = limpo.replace(/^>\s*/gm, '');
    limpo = limpo.replace(/^-#\s*/gm, '');
    limpo = limpo.replace(/\*\*(.*?)\*\*/gs, '$1');
    limpo = limpo.replace(/\*(.*?)\*/gs, '$1');
    limpo = limpo.replace(/_(.*?)_/gs, '$1');
    limpo = limpo.replace(/\n{3,}/g, '\n\n');
    
    return limpo.trim();
}

// =========================================================================
// Função para postar @followers nos comentários da publicação
// =========================================================================
async function postarComentarioSeguidores(postId) {
    try {
        await axios.post(`https://graph.facebook.com/v19.0/${postId}/comments`, {
            message: '@followers',
            access_token: FACEBOOK_ACCESS_TOKEN
        });
        console.log(`Comentário @followers postado na publicação ${postId}.`);
    } catch (error) {
        console.error('Erro ao postar comentário @followers:', error.response ? error.response.data : error.message);
    }
}

client.once('ready', async () => {
    console.log(`Self-Bot logado na conta: ${client.user.tag}`);
    console.log(`Monitorando ${canaisMonitorados.length} canais silenciosamente...`);
    console.log('Versão definitiva ativa. Aguardando novas postagens.');
});

client.on('messageCreate', async (message) => {
    // Evita ler as próprias mensagens
    if (message.author.id === client.user.id) return;
    
    // Verifica se o canal está na lista de monitorados
    if (!canaisMonitorados.includes(message.channelId)) return;

    // 1. Limpa a formatação original do Discord
    const legendaLimpa = limparTextoDiscord(message.content);
    
    // 2. Legenda final sem hashtags
    const legendaFinal = legendaLimpa || '';
    
    const anexo = message.attachments.first();

    // Caso a mensagem tenha imagem
    if (anexo && anexo.contentType && anexo.contentType.startsWith('image/')) {
        const urlImagem = anexo.url;
        console.log(`Nova notícia com imagem detectada no canal ${message.channelId}. Repassando...`);

        try {
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                url: urlImagem,
                message: legendaFinal,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Foto publicada na página.`);
            
            // Posta @followers nos comentários
            const postId = response.data.post_id || response.data.id;
            if (postId) {
                await postarComentarioSeguidores(postId);
            }
        } catch (error) {
            console.error('Erro ao postar imagem:', error.response ? error.response.data : error.message);
        }
    } 
    // Caso a mensagem seja apenas texto
    else if (legendaFinal && !anexo) {
         console.log(`Nova notícia em texto detectada. Repassando...`);
         try {
            const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                message: legendaFinal,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Texto publicado na página.`);
            
            // Posta @followers nos comentários
            const postId = response.data.id;
            if (postId) {
                await postarComentarioSeguidores(postId);
            }
         } catch (error) {
             console.error('Erro ao postar texto:', error.response ? error.response.data : error.message);
         }
    }
});

client.login(DISCORD_USER_TOKEN);
