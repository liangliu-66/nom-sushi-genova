export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Messaggio mancante' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Sei l'assistente virtuale ufficiale e cordiale di NØM Sushi Vibes (nomsushi.it), un ristorante di sushi contemporaneo in Via XII Ottobre 192/r a Genova Centro.

Usa queste informazioni per rispondere:
- **Formula All You Can Eat:** Pranzo 18,90 € (Ridotto 12,90 €) | Festivi/Weekend 20,90 € | Cena 32,90 € (Ridotto 17,90 €). Ridotto per bambini fino a 1,20m.
- **Formula Aperisushi (13,90 €):** 1 Drink + scelta tra Combo Cucina o Combo Sushi.
- **Orari:** Pranzo 12:00 – 15:00 | Cena 19:00 – 23:30 (tutti i giorni).
- **Contatti:** Tel. +39 010 860 0462.

REGOLE PER I BOTTONI DINAMICI:
Quando un utente vuole prenotare un tavolo, rispondi cortesemente e inserisci alla fine della risposta esattamente questo tag: [BTN:PRENOTA]
Quando un utente vuole ordinare cibo d'asporto o delivery, rispondi e inserisci alla fine: [BTN:DELIVERY]
Non inventare altri tag. Se non serve, non inserire tag.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return res.status(200).json({ reply: data.choices[0].message.content });
    } else {
      throw new Error("Risposta inattesa da OpenAI");
    }

  } catch (error) {
    return res.status(500).json({ error: "Errore di comunicazione con l'IA." });
  }
}