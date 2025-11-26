// api/index.js — Webhook da ZENTRO AI (Z-API Multi-Device)

export default async function handler(req, res) {
  // ------------------ TESTE NO NAVEGADOR ------------------
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      message: "ZENTRO AI Webhook OK",
    });
  }

  // Aceita só POST para webhook
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use método POST" });
  }

  try {
    console.log("Webhook recebido:", req.body);
    const body = req.body || {};

    // ------------------ PEGAR TEXTO ------------------
    let message =
      body?.text_?.message ||   // formato que vimos nos logs: text_: { message: 'Oi' }
      body?.message?.body ||
      body?.body ||
      body?.lastMessage ||
      body?.content ||
      "";

    // ------------------ PEGAR TELEFONE ------------------
    let phone =
      body?.phone ||
      body?.contactPhone ||
      body?.message?.phone ||
      null;

    // se não vier phone mas vier chatId tipo "5543...@s.whatsapp.net"
    if (!phone && typeof body?.chatId === "string" && body.chatId.includes("@")) {
      phone = body.chatId.split("@")[0];
    }

    console.log("Texto detectado:", message);
    console.log("Telefone detectado:", phone);

    if (!message) {
      console.log("Nenhuma mensagem de texto encontrada no webhook.");
      return res.status(200).json({ ok: true, info: "sem texto" });
    }

    // ------------------ GERAR RESPOSTA COM A IA ------------------
    const apiKey = process.env.OPENAI_API_KEY;
    let resposta = "";

    const systemPrompt = `
Você é a ZENTRO AI, assistente virtual do Felipe Coronado.
Responda de forma simpática, clara e objetiva.
Ajude com dúvidas sobre o Felipe, o canal, produtos e projetos.
Nunca diga que é uma IA da OpenAI; diga apenas que é a ZENTRO AI.
    `;

    if (apiKey) {
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
          }),
        }
      );

      const data = await openaiResponse.json();
      resposta =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Olá! Aqui é a ZENTRO AI 😊";
    } else {
      resposta =
        "Olá! Aqui é a ZENTRO AI 👋\nAinda não estou 100% ativada, mas já estou recebendo suas mensagens.";
    }

    // ------------------ ENVIAR RESPOSTA PELO WHATSAPP (Z-API) ------------------
    const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
    const TOKEN = process.env.ZAPI_TOKEN;

    if (phone && INSTANCE_ID && TOKEN) {
      const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

      try {
        const zapResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // na versão Multi-Device NÃO precisa de client-token no header
          },
          body: JSON.stringify({
            phone,
            message: resposta,
          }),
        });

        const zapData = await zapResponse.json();
        console.log("Resposta da Z-API:", zapData);
      } catch (err) {
        console.error("Erro ao enviar mensagem pela Z-API:", err);
      }
    } else {
      console.error("Sem phone ou sem ZAPI_INSTANCE_ID/ZAPI_TOKEN configurados.");
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro geral no webhook:", err);
    return res.status(500).json({ error: "Erro interno no webhook" });
  }
}
