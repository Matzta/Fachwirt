export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode nicht erlaubt." });
  }

  try {
    const { name, email, service, message } = req.body ?? {};

    if (!name || !email || !service || !message) {
      return res.status(400).json({ error: "Bitte alle Felder ausfüllen." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Ungültige E-Mail-Adresse." });
    }

    const sender = process.env.SENDER_EMAIL;
    const recipient = process.env.CONTACT_RECIPIENT;
    const apiKey = process.env.RESEND_API_KEY;

    if (!sender || !recipient || !apiKey) {
      return res.status(500).json({
        error: "Mail-Konfiguration unvollständig. Bitte Umgebungsvariablen in Vercel prüfen."
      });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Behrensstark Kontakt <${sender}>`,
        to: [recipient],
        reply_to: email,
        subject: `Neue Transportanfrage – ${service}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#17212f">
            <h2>Neue Anfrage über das Kontaktformular</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
            <p><strong>Leistung:</strong> ${escapeHtml(service)}</p>
            <p><strong>Nachricht:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          </div>
        `
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        error: resendData?.message || "E-Mail konnte nicht versendet werden."
      });
    }

    return res.status(200).json({ success: true, id: resendData?.id ?? null });
  } catch (error) {
    return res.status(500).json({
      error: "Interner Fehler beim Versand."
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}