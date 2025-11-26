// api/index.js — Webhook simples da ZENTRO AI com logs detalhados

export default async function handler(req, res) {
  // Teste rápido pelo navegador
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
    const body = req.body || {};

    // ---------- TEXTO ----------
    const message =
      body?.text_?.message ||       // formato que vimos no log
      body?.message?.body ||
      body?.body ||
      "";

    // ---------- TELEFONE ----------
    let phone = body?.phone || null;

    if (!phone && typeof body?.chatId === "string" && body.chatId.includes("@")) {
      phone = body.chatId.split("@")[0];
    }

    console.log("Texto detectado:", message || "<vazio>");
    console.log("Telefone detectado:", phone || "<nenhum>");

    if (!message) {
      // só loga e sai, sem essa frase confusa
      return res.status(200).json({ ok: true, info: "sem texto" });
    }

    // ---------- RESPOSTA SIMPLES ----------
    const resposta = `Oi! Aqui é a ZENTRO AI 👋\nRecebi sua mensagem: "${message}"`;

    // ---------- ENVIO PELA Z-API ----------
    const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
    const TOKEN = process.env.ZAPI_TOKEN;

    if (!INSTANCE_ID || !TOKEN) {
      console.error("ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.");
    } else if (!phone) {
      console.error("Telefone não encontrado para envio.");
    } else {
      const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;
      console.log("Enviando para Z-API:", url, "phone:", phone);

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

        const text = await zapResponse.text();
        console.log("Status HTTP da Z-API:", zapResponse.status);
        console.log("Resposta da Z-API (texto bruto):", text);
      } catch (err) {
        console.error("Erro ao chamar Z-API:", err);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro geral no webhook:", err);
    return res.status(500).json({ error: "Erro interno no webhook" });
  }
}
