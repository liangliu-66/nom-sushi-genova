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
    content: `Sei l'assistente virtuale di NØM Sushi Vibes a Genova. Rispondi in modo estremamente breve, diretto e cortese. Non fare elenchi lunghi. 

Informazioni di riferimento:
- All You Can Eat Pranzo: 18,90 € (Ridotto 12,90 €). Festivi/Weekend: 20,90 €.
- All You Can Eat Cena: 32,90 € (Ridotto 17,90 €). Ridotto per bambini fino a 1,20m.
- Aperisushi: 13,90 € (1 drink + combo cucina o sushi).
- Orari: Pranzo 12:00-15:00, Cena 19:00-23:30 tutti i giorni.
- Indirizzo: Via XII Ottobre 192/r, Genova. Tel: 0108600462.

REGOLE PER I BOTTONI E I MENU:
- Se l'utente chiede di prenotare, rispondi brevemente e aggiungi: [BTN:PRENOTA]
- Se l'utente chiede di asporto o delivery, rispondi brevemente e aggiungi: [BTN:DELIVERY]
- Se l'utente chiede il menu di pranzo o cosa c'è a pranzo, rispondi brevemente e aggiungi: [BTN:MENU_PRANZO]
- Se l'utente chiede il menu di cena o cosa c'è a cena, rispondi brevemente e aggiungi: [BTN:MENU_CENA]`
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