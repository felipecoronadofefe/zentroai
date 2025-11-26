// api/index.js — Webhook oficial da ZENTRO AI

export default async function handler(req, res) {
  // -------------------------------------------
  // TESTE GET (abre no navegador)
  // -------------------------------------------
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      message: "ZENTRO AI Webhook OK"
    });
  }

  // Aceita apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    console.log("Webhook recebido:", req.body);

    // --------------------------------------------------
    // PEGAR TEXTO DA MENSAGEM (FORMATO REAL DA SUA Z-API)
    // --------------------------------------------------
    const message =
      req.body?.text_?.message ||  // <- AQUI está o “Oi”
      req.body?.message?.body ||
      req.body?.body ||
      req.body?.lastMessage ||
      req.body?.content ||
      "";

    // --------------------------------------------------
    // PEGAR TELEFONE
    // --------------------------------------------------
    let phone =
      req.body?.phone ||
      req.body?.contactPhone ||
      req.body?.message?.phone ||
      null;

    // Tentativa extra via chatId
    if (!phone && req.body?.chatId) {
      phone = req.body.chatId.split("@")[0];
    }

    console.log("Texto detectado:", message);
    console.log("Telefone detectado:", phone);

    if (!message) {
      console.log("Nenhuma mensagem de texto encontrada.");
      return res.status(200).json({ ok: true });
    }

    // --------------------------------------------------
    // RESPOSTA DA IA
    // --------------------------------------------------
    const apiKey = process.env.OPENAI_API_KEY;
    let resposta = "";

    const systemPrompt = `
Você é a ZENTRO AI, assistente virtual do Felipe Coronado.
Responda sempre de forma simpática e profissional.
Nunca diga que é uma IA da OpenAI; diga apenas que é a ZENTRO AI.
    `;

    if (apiKey) {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
      });

      const data = await openaiResponse.json();

      resposta =
        data?.choices?.[0]?.message?.content?.trim() ||
        "Olá! Aqui é a ZENTRO AI, tudo bem? 😊";
    } else {
      resposta =
        "Olá! Aqui é a ZENTRO AI 👋\nAinda estou aguardando ativação completa do Felipe.";
    }

    // --------------------------------------------------
    // ENVIAR RESPOSTA PELO WHATSAPP (Z-API)
    // --------------------------------------------------
    if (phone) {
      const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
      const TOKEN = process.env.ZAPI_TOKEN;

      const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message: resposta
        })
      });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("Erro:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
