// api/index.js — Webhook da ZENTRO AI integrado com Z-API

export default async function handler(req, res) {
  // ------------------ TESTE VIA NAVEGADOR ------------------
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      message: "ZENTRO AI Webhook OK",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use método POST" });
  }

  try {
    console.log("Webhook recebido:", req.body);

    // Transformar o body em string pra poder fazer busca se precisar
    const rawBody =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // ------------------ TENTAR ACHAR O TEXTO ------------------
    let message =
      req.body?.text_?.message || // formato que vimos no log
      req.body?.message?.body ||
      req.body?.body ||
      req.body?.lastMessage ||
      req.body?.content ||
      "";

    // Se ainda não achou, tenta via regex na string
    if (!message && rawBody) {
      // 1) procura especificamente por "text_":{"message":"..."}
      let match = rawBody.match(
        /"text_"\s*:\s*{\s*"message"\s*:\s*"([^"]+)"/
      );
      // 2) se não achar, pega o primeiro "message":"..."
      if (!match) {
        match = rawBody.match(/"message"\s*:\s*"([^"]+)"/);
      }
      if (match) {
        message = match[1];
      }
    }

    // ------------------ TENTAR ACHAR O NÚMERO ------------------
    let phone =
      req.body?.phone ||
      req.body?.contactPhone ||
      req.body?.message?.phone ||
      null;

    // Se não achou, tenta extrair de chatId
    if (!phone && req.body?.chatId && typeof req.body.chatId === "string") {
      phone = req.body.chatId.split("@")[0];
    }

    // Última tentativa: regex na string
    if (!phone && rawBody) {
      const phoneMatch = rawBody.match(/"phone"\s*:\s*"([^"]+)"/);
      if (phoneMatch) {
        phone = phoneMatch[1];
      }
    }

    console.log("Texto detectado:", message);
    console.log("Telefone detectado:", phone);

    if (!message) {
      console.log("Nenhuma mensagem de texto encontrada no webhook.");
      return res.status(200).json({ ok: true, info: "sem texto" });
    }

    // ------------------ GERAR RESPOSTA COM IA ------------------
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

    // ------------------ ENVIAR RESPOSTA PELO WHATSAPP ------------------
    if (phone) {
      const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
      const TOKEN = process.env.ZAPI_TOKEN;

      if (INSTANCE_ID && TOKEN) {
        const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

        try {
          const zapResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        console.error("INSTANCE_ID ou TOKEN não configurados.");
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro geral no webhook:", err);
    return res.status(500).json({ error: "Erro interno no webhook" });
  }
}
