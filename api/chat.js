export default async function handler(req, res) {
  // Permetti solo richieste POST
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
            content: "Sei l'assistente virtuale ufficiale di Nom Sushi Vibes (nomsushi.it), un ristorante di sushi a Genova. Rispondi in modo cortese, professionale e accogliente. Aiuta i clienti con informazioni sul menu (All You Can Eat e alla carta), orari, indirizzo, modalità d'asporto e prenotazioni. Non inventare informazioni: se non le sai, invita a chiamare il ristorante."
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