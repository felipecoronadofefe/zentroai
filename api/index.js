// api/index.js - Função serverless do ZENTRO AI

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'Método não permitido. Envie uma requisição POST.' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'OPENAI_API_KEY não configurada nas variáveis de ambiente.' });
    }

    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res
        .status(400)
        .json({ error: 'Envie um campo "message" (texto) no corpo da requisição.' });
    }

    const systemPrompt = `
    Você é o ZENTRO AI, um assistente de inteligência artificial especializado em e-commerce.
    Ajude clientes, responda dúvidas e gere mais vendas.
    Nunca mencione que usa OpenAI. Fale como se fosse o próprio sistema ZENTRO.
    `;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.6,
      }),
    });

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text();
      console.error('Erro OpenAI:', text);
      return res.status(500).json({ error: 'Falha ao gerar resposta da IA.' });
    }

    const data = await openaiResponse.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      'Não consegui gerar uma resposta agora. Tente novamente.';

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error('Erro interno ZENTRO:', err);
    return res.status(500).json({ error: 'Erro interno no servidor do ZENTRO.' });
  }
}
