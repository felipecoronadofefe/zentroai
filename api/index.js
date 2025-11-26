export default async function handler(req, res) {

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
    const body = req.body || {};
    console.log("Webhook recebido:", body);

    // ---------- PEGAR TEXTO EM QUALQUER FORMATO POSSÍVEL ----------
    const message =
      body?.text_?.message ||      
      body?.text?.message ||
      body?.message?.body ||
      body?.message ||
      body?.body ||
      body?.lastMessage?.text ||
      body?.lastMessage ||
      "";

    // ---------- PEGAR TELEFONE ----------
    let phone = body?.phone || null;

    if (!phone && body?.chatId && body.chatId.includes("@")) {
      phone = body.chatId.split("@")[0];
    }

    console.log("Texto detectado:", message || "<vazio>");
    console.log("Telefone detectado:", phone || "<nenhum>");

    if (!message) {
      return res.status(200).json({ ok: true, info: "sem texto encontrado" });
    }

    const resposta = `Recebi sua mensagem: "${message}" 😊`;

    // ---------- VARIÁVEIS ----------
    const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
    const TOKEN = process.env.ZAPI_TOKEN;
    const CLIENT_TOKEN = TOKEN;

    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

    console.log("Chamando Z-API:", url);

    const zapResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": CLIENT_TOKEN
      },
      body: JSON.stringify({
        phone,
        message: resposta
      }),
    });

    const responseText = await zapResponse.text();

    console.log("Status Z-API:", zapResponse.status);
    console.log("Resposta da Z-API:", responseText);

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("Erro geral:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
