// api/index.js — VERSÃO SIMPLIFICADA E DEBUGADA

export default async function handler(req, res) {
  // Teste no navegador
  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      message: "ZENTRO AI Webhook OK (versão debug)",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use método POST" });
  }

  try {
    const body = req.body || {};
    console.log("==== WEBHOOK RECEBIDO ====");
    console.log("BODY COMPLETO:", JSON.stringify(body, null, 2));

    // ---------- PEGAR TEXTO EM TODOS OS LUGARES POSSÍVEIS ----------
    const message =
      (body && body.text_ && body.text_.message) ||
      (body && body.text && body.text.message) ||
      (body && body.message && body.message.body) ||
      body.message ||
      body.body ||
      (body.lastMessage && body.lastMessage.text) ||
      body.lastMessage ||
      "";

    // ---------- PEGAR TELEFONE ----------
    let phone = body.phone || null;

    if (!phone && typeof body.chatId === "string" && body.chatId.includes("@")) {
      phone = body.chatId.split("@")[0];
    }

    console.log(">>> TEXTO DETECTADO:", message || "<vazio>");
    console.log(">>> TELEFONE DETECTADO:", phone || "<nenhum>");

    if (!message) {
      return res.status(200).json({ ok: true, info: "sem texto encontrado" });
    }

    const resposta = `Recebi sua mensagem: "${message}" 😊`;

    // ---------- ENVIAR PELA Z-API ----------
    const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
    const TOKEN = process.env.ZAPI_TOKEN;
    const CLIENT_TOKEN = TOKEN; // na sua versão é o mesmo

    if (!INSTANCE_ID || !TOKEN) {
      console.error("Faltando INSTANCE_ID ou TOKEN da Z-API.");
      return res.status(500).json({ error: "Configuração Z-API incompleta" });
    }

    if (!phone) {
      console.error("Telefone não encontrado no webhook.");
      return res.status(200).json({ ok: true, info: "sem telefone" });
    }

    const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;
    console.log(">>> ENVIANDO PARA Z-API:", url);

    const zapResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": CLIENT_TOKEN,
      },
      body: JSON.stringify({
        phone,
        message: resposta,
      }),
    });

    const responseText = await zapResponse.text();
    console.log(">>> STATUS Z-API:", zapResponse.status);
    console.log(">>> RESPOSTA Z-API:", responseText);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("ERRO GERAL NO WEBHOOK:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
