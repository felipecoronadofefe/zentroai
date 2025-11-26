// api/index.js — Webhook simples da ZENTRO AI com Z-API

export default async function handler(req, res) {
  // Teste rápido pelo navegador
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      message: "ZENTRO AI Webhook OK",
    });
  }

  // Aceita só POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use método POST" });
  }

  try {
    console.log("Webhook recebido:", req.body);
    const body = req.body || {};

    // ------------------ PEGAR TEXTO ------------------
    // Formato que vimos nos logs: text_: { message: 'Oi' }
    const message =
      body?.text_?.message ||
      body?.message?.body ||
      body?.body ||
      "";

    // ------------------ PEGAR TELEFONE ------------------
    let phone = body?.phone || null;

    // Se não vier phone mas vier chatId tipo "5543...@s.whatsapp.net"
    if (!phone && typeof body?.chatId === "string" && body.chatId.includes("@")) {
      phone = body.chatId.split("@")[0];
    }

    console.log("Texto detectado:", message);
    console.log("Telefone detectado:", phone);

    // Se realmente não tiver texto, só registra e sai
    if (!message) {
      console.log("Nenhuma mensagem de texto encontrada no webhook (sem text_ nem body).");
      return res.status(200).json({ ok: true, info: "sem texto" });
    }

    // ------------------ RESPOSTA SIMPLES (sem IA por enquanto) ------------------
    const resposta = `Oi! Aqui é a ZENTRO AI 👋\nRecebi sua mensagem: "${message}"`;

    // ------------------ ENVIAR PELA Z-API ------------------
    const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
    const TOKEN = process.env.ZAPI_TOKEN;

    if (phone && INSTANCE_ID && TOKEN) {
      const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

      try {
        const zapResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
