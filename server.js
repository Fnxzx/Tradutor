const express = require('express');
const cors = require('cors');

const app = express();
// O Render define automaticamente a variável de ambiente PORT
const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: '20mb' }));

// Configuração de CORS para aceitar qualquer origem ou origens específicas
app.use(cors({
  origin: '*' // Permite que qualquer frontend (Netlify, Vercel, Local) acesse este backend
}));

// Rota de saúde para verificar se o servidor está online
app.get('/', (req, res) => {
  res.json({ 
    status: 'TRANSLA backend rodando ✓',
    api: 'Gemini',
    message: 'Servidor pronto para tradução'
  });
});

// Rota principal de tradução
app.post('/translate', async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error('ERRO: GEMINI_API_KEY não configurada.');
    return res.status(500).json({ error: { message: 'Chave API não configurada no servidor (GEMINI_API_KEY).' } });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Parâmetro "messages" inválido ou ausente.' } });
  }

  try {
    // Monta o conteúdo para o formato esperado pela API do Gemini
    const parts = [];
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            parts.push({ text: block.text });
          } else if (block.type === 'image') {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type,
                data: block.source.data
              }
            });
          }
        }
      }
    }

    // CORREÇÃO: Usando a URL estável v1 e o modelo gemini-1.5-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na API Gemini:', data);
      return res.status(response.status).json({ 
        error: { message: data.error?.message || 'Erro na API Gemini' } 
      });
    }

    // Extrai o texto da resposta do Gemini
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Retorna no formato que o frontend espera (compatível com o que você já tinha)
    res.json({ 
      content: [{ type: 'text', text }] 
    });

  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: { message: 'Erro interno no servidor: ' + err.message } });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Servidor TRANSLA (Gemini) rodando na porta ${PORT}`);
});
