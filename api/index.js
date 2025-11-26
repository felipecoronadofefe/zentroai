// api/index.js — Webhook da ZENTRO AI integrado com Z-API (WhatsApp)

export default async function handler(req, res) {
  // ---------------------------
  // TESTE RÁPIDO (GET pelo navegador)
  // ---------------------------
  if (req.method === "GET") {
    return res
      .status(200)
      .json({ status: "online", message: "ZENTRO AI Webhook OK" });
  }

  // ---------------------------
  // TRATAR APENAS POST PARA WEBHOOK
  // ---------------------------
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Método não permitido. Use requisição POST." });
  }

  try {
    console.log("Webhook recebido:", req.body);

    // ---------------------------
    // TENTAR PEGAR A PRIMEIRA MENSAGEM EM waitingMessages (formato da Z-API)
    // ---------------------------
    let wm0 = null;
    if (Array.isArray(req.body?.waitingMessages) && req.body.waitingMessages.length > 0) {
      wm0 = req.body.waitingMessages[0]; // primeira mensagem da fila
    }

    // Se wm0 tiver um campo "message" dentro, usa ele
    const innerMsg = wm0?.message || wm0 || null;

    // ---------------------------
    // PEGAR TEXTO DA MENSAGEM
    // ---------------------------
    let message =
      req.body?.message?.body ||   // alguns formatos antigos
      req.body?.body ||            // outro fallback
      req.body?.lastMessage ||     // formato novo da Z-API
      req.body?.content ||         // variação
      req.body?.message ||         // caso venha do site
      innerMsg?.body ||            // body direto em waitingMessages[0]
      innerMsg?.text ||            // ou text
      innerMsg?.content ||         // ou content
      "";

    // ---------------------------
    // PEGAR TELEFONE
    // ---------------------------
    let phone =
      req.body?.message?.phone ||   // formato antigo
      req.body?.phone ||            // outro fallback
      req.body?.contactPhone ||     // formato novo da Z-API
      innerMsg?.phone ||            // telefone dentro de waitingMessages[0]
      null;

    // Se ainda não tiver phone mas tiver chatId, tenta extrair
    if (!phone) {
      const chatId =
        req.body?.chatId ||
        wm0?.chatId ||
        innerMsg?.chatId ||
        null;

      if (chatId && typeof chatId === "string" && chatId.includes("@")) {
        phone = chatId.split("@")[0]; // pega só o número antes do @
      }
    }

    if (!message) {
      console.log("Nenhuma mensagem de texto encontrada no webhook.");
      return res.status(200).json({ received: true, info: "Sem mensagem de texto." });
    }

    console.log("Texto detectado:", message);
    console.log("Telefone detectado:", phone);

    // ---------------------------
    // CONFIGURAR OPENAI (se existir)
    // ---------------------------
    const apiKey = process.env.OPENAI_API_KEY;
    let resposta = "";

    const systemPrompt = `
Você é a ZENTRO AI, assistente virtual do Felipe Coronado.
Atenda clientes de forma simpática, rápida, clara e profissional.
Ajude em dúvidas sobre compras, produtos, marca, vídeos e projetos do Felipe.
Não fale que é uma IA da OpenAI; diga apenas que é a assistente ZENTRO AI.
    `;

    if (apiKey) {
      try {
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
          "Oi! Aqui é a ZENTRO AI. Recebi sua mensagem, mas tive um probleminha para gerar a resposta. Pode tentar de novo em alguns segundos?";

        console.log("Resposta gerada pela OpenAI:", resposta);
      } catch (err) {
        console.error("Erro ao chamar OpenAI:", err);
        resposta =
          "Oi! Aqui é a ZENTRO AI. Tive um erro interno ao processar sua mensagem, mas já já o Felipe vê isso pra você. 😊";
      }
    } else {
      // Caso não tenha OPENAI_API_KEY configurada
      resposta =
        "Oi! Aqui é a ZENTRO AI 👋\nAinda não estou conectada ao cérebro de IA (OPENAI_API_KEY ausente), mas já estou recebendo suas mensagens. Em breve o Felipe vai ativar tudo!";
    }

    // ---------------------------
    // SE TIVER TELEFONE → RESPONDER PELO WHATSAPP (Z-API)
    // ---------------------------
    if (phone) {
      const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
      const TOKEN = process.env.ZAPI_TOKEN;

      if (!INSTANCE_ID || !TOKEN) {
        console.error("ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.");
      } else {
        const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

        try {
          const zapResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: phone,
              message: resposta,
            }),
          });

          const zapData = await zapResponse.json();
          console.log("Resposta da Z-API:", zapData);
        } catch (err) {
          console.error("Erro ao enviar mensagem pela Z-API:", err);
        }
      }

      // Mesmo que dê erro no envio, respondemos 200 pro webhook
      return res.status(200).json({ status: "ok", via: "whatsapp" });
    }

    // ---------------------------
    // SE NÃO TIVER TELEFONE → RESPOSTA PARA SITE
    // ---------------------------
    return res.status(200).json({
      reply: resposta,
      via: "site",
    });

  } catch (err) {
    console.error("Erro geral no handler:", err);
    return res.status(500).json({ error: "Erro interno no Webhook da ZENTRO AI." });
  }
}
