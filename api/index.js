// api/index.js — Nova versão compatível com ZENTRO AI + WhatsApp (Z-API)

export default async function handler(req, res) {
  // ---------------------------
  // TESTE RÁPIDO VIA GET (navegador)
  // ---------------------------
  if (req.method === "GET") {
    return res.status(200).json({ status: "online", message: "ZENTRO AI Webhook OK" });
  }

  // ---------------------------
  // PROCESSAMENTO DE MENSAGEM (POST)
  // ---------------------------
  if (req.method === "POST") {
    try {
      console.log("Webhook recebido:", req.body);

      // ---------------------------
      // PEGAR TEXTO + TELEFONE (tanto da Z-API quanto do site)
      // ---------------------------
      const message =
        req.body?.message?.body || // WhatsApp (Z-API)
        req.body?.body ||          // Outro formato da Z-API
        req.body?.message ||       // Caso venha do site
        "";

      const phone =
        req.body?.message?.phone || // WhatsApp
        req.body?.phone ||           // Outro formato
        null;

      if (!message) {
        return res.status(200).json({ info: "Sem mensagem recebida." });
      }

      // ---------------------------
      // CONFIGURAR OPENAI
      // ---------------------------
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OPENAI_API_KEY faltando" });
      }

      const systemPrompt = `
Você é a ZENTRO AI, uma assistente de vendas e atendimento do Felipe Coronado.
Fale sempre de forma amigável, rápida e clara.
Não mencione que é uma IA da OpenAI. Responda como se fosse do sistema ZENTRO.
      `;

      // ---------------------------
      // GERAR RESPOSTA COM OPENAI
      // ---------------------------
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      });

      const data = await openaiResponse.json();
      const resposta = data.choices?.[0]?.message?.content || "Desculpe, não entendi.";

      // ---------------------------
      // SE TIVER TELEFONE → RESPONDER PELO WHATSAPP
      // ---------------------------
      if (phone) {
        const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
        const TOKEN = process.env.ZAPI_TOKEN;

        const url = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`;

        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone,
            message: resposta
          })
        });

        return res.status(200).json({ status: "sent to WhatsApp" });
      }

      // ---------------------------
      // SE NÃO TIVER TELEFONE → RESPOSTA PARA O SITE
      // ---------------------------
      return res.status(200).json({
        reply: resposta,
        via: "site"
      });

    } catch (err) {
      console.error("Erro no webhook:", err);
      return res.status(500).json({ error: "Erro interno no Webhook" });
    }
  }

  // ---------------------------
  // MÉTODO ERRADO
  // ---------------------------
  return res.status(405).json({ error: "Método não permitido" });
}
