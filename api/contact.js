export default async function handler(req, res) {
  // Nur POST erlauben
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode nicht erlaubt." });
  }

  try {
    // Daten aus Formular
    const { name, email, service, message } = req.body ?? {};

    // Validierung
    if (!name || !email || !service || !message) {
      return res.status(400).json({
        error: "Bitte alle Felder ausfüllen."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Ungültige E-Mail-Adresse."
      });
    }

    // ENV Variablen holen (inkl. Trim!)
    const sender = (process.env.SENDER_EMAIL || "").trim();
    const recipient = (process.env.CONTACT_RECIPIENT || "").trim();
    const apiKey = (process.env.RESEND_API_KEY || "").trim();

    // Fehlende Variablen checken
    const missing = [];
    if (!sender) missing.push("SENDER_EMAIL");
    if (!recipient) missing.push("CONTACT_RECIPIENT");
    if (!apiKey) missing.push("RESEND_API_KEY");

    if (missing.length > 0) {
      return res.status(500).json({
        error: `Fehlende ENV Variablen: ${missing.join(", ")}`
      });
    }

    // Format prüfen
    if (!emailRegex.test(sender)) {
      return res.status(500).json({
        error: `SENDER_EMAIL ungültig: ${sender}`
      });
    }

    if (!emailRegex.test(recipient)) {
      return res.status(500).json({
        error: `CONTACT_RECIPIENT ungültig: ${recipient}`
      });
    }

    // Mail senden über Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Behrensstark <${sender}>`,
        to: [recipient],
        reply_to: email,
        subject: `Neue Anfrage – ${service}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h2>Neue Anfrage über das Kontaktformular</h2>
            
            <p><strong>Name:</strong><br>${escapeHtml(name)}</p>
            <p><strong>E-Mail:</strong><br>${escapeHtml(email)}</p>
            <p><strong>Leistung:</strong><br>${escapeHtml(service)}</p>

            <p><strong>Nachricht:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          </div>
        `
      })
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        error: data?.message || "Fehler beim Mailversand."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mail erfolgreich gesendet."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Interner Serverfehler."
    });
  }
}

// Sicherheit gegen HTML Injection
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}