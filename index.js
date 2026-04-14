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
    
    // 1. Remove menções a cargos ou usuários (ex: <@&1440442360235560993>)
    limpo = limpo.replace(/<@&?\d+>/g, '');
    
    // 2. Remove cabeçalhos do Discord (ex: # Visita em casa!)
    limpo = limpo.replace(/^#+\s*/gm, '');
    
    // 3. Remove blocos de citação (ex: > texto)
    limpo = limpo.replace(/^>\s*/gm, '');
    
    // 4. Remove formatação de texto pequeno (ex: -# link)
    limpo = limpo.replace(/^-#\s*/gm, '');
    
    // 5. Remove negritos e itálicos (ex: **texto**, *texto*)
    limpo = limpo.replace(/\*\*(.*?)\*\*/gs, '$1');
    limpo = limpo.replace(/\*(.*?)\*/gs, '$1');
    limpo = limpo.replace(/_(.*?)_/gs, '$1');
    
    // 6. Limpa espaços e quebras de linha em branco que sobram
    limpo = limpo.replace(/\n{3,}/g, '\n\n');
    
    return limpo.trim();
}

client.once('ready', async () => {
    console.log(`Self-Bot logado na conta: ${client.user.tag}`);
    console.log(`Monitorando ${canaisMonitorados.length} canais silenciosamente...`);

    // =========================================================================
    // ⚠️ INÍCIO DO BLOCO DE TESTE
    // =========================================================================
    try {
        console.log('--- INICIANDO TESTE COM LIMPADOR DE TEXTO ---');
        const canalTesteId = canaisMonitorados[0]; 
        const canal = await client.channels.fetch(canalTesteId);
        const mensagens = await canal.messages.fetch({ limit: 1 });
        const ultimaMensagem = mensagens.first();

        if (ultimaMensagem) {
            console.log(`Última mensagem encontrada! Passando pelo filtro...`);
            
            // AQUI ESTÁ A MÁGICA: Passamos o texto sujo pelo limpador antes de enviar
            const legendaTeste = limparTextoDiscord(ultimaMensagem.content);
            const anexoTeste = ultimaMensagem.attachments.first();

            if (anexoTeste && anexoTeste.contentType && anexoTeste.contentType.startsWith('image/')) {
                const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                    url: anexoTeste.url,
                    message: legendaTeste,
                    access_token: FACEBOOK_ACCESS_TOKEN
                });
                console.log(`[TESTE OK] Foto publicada com sucesso! ID: ${response.data.id}`);
            } 
            else if (legendaTeste && !anexoTeste) {
                const response = await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                    message: legendaTeste,
                    access_token: FACEBOOK_ACCESS_TOKEN
                });
                console.log(`[TESTE OK] Texto publicado com sucesso! ID: ${response.data.id}`);
            }
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

    // Também limpa as mensagens reais que chegarem no dia a dia
    const legendaLimpa = limparTextoDiscord(message.content);
    const anexo = message.attachments.first();

    if (anexo && anexo.contentType && anexo.contentType.startsWith('image/')) {
        const urlImagem = anexo.url;
        console.log(`Nova notícia detectada no canal ${message.channelId}. Repassando...`);

        try {
            await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`, {
                url: urlImagem,
                message: legendaLimpa,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Foto publicada na página.`);
        } catch (error) {
            console.error('Erro ao postar imagem:', error.response ? error.response.data : error.message);
        }
    } 
    else if (legendaLimpa && !anexo) {
         console.log(`Nova notícia em texto detectada. Repassando...`);
         try {
            await axios.post(`https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`, {
                message: legendaLimpa,
                access_token: FACEBOOK_ACCESS_TOKEN
            });
            console.log(`Sucesso! Texto publicado na página.`);
         } catch (error) {
             console.error('Erro ao postar texto:', error.response ? error.response.data : error.message);
         }
    }
});

client.login(DISCORD_USER_TOKEN);