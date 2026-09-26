const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    // Parsing sicuro del corpo della richiesta
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { message } = body || {};

    if (!message) {
      return res.status(400).json({ error: 'Messaggio mancante' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chiave OpenAI non configurata nelle variabili d\'ambiente.' });
    }

    const openai = new OpenAI({ apiKey });

    let restaurantData = null;
    let menuItems = [];
    let promoItems = [];

    const { data: restData, error: restErr } = await supabase.from('restaurants').select('allow_takeaway, allow_delivery, allow_reservations').limit(1).maybeSingle();
    if (!restErr && restData) restaurantData = restData;

    const { data: prodData, error: prodErr } = await supabase.from('products').select('*');
    if (!prodErr && prodData) menuItems = prodData;

    const { data: promoData, error: promoErr } = await supabase.from('promotions').select('*');
    if (!promoErr && promoData) promoItems = promoData;

    const allowTakeaway = restaurantData?.allow_takeaway ?? true;
    const allowDelivery = restaurantData?.allow_delivery ?? true;

    let platformStatusContext = `STATO PIATTAFORMA ATTUALE:\n`;
    platformStatusContext += `- Ritiro d'asporto interno: ${allowTakeaway ? 'ATTIVO' : 'DISATTIVATO'}\n`;
    platformStatusContext += `- Consegna a domicilio interna: ${allowDelivery ? 'ATTIVA' : 'DISATTIVATA'}\n`;

    let menuContext = "MENU E PRODOTTI AGGIORNATI DAL DATABASE:\n";
    if (menuItems.length > 0) {
      menuItems.forEach((item) => {
        const name = item.name || 'Prodotto';
        const desc = item.description || item.ingredients || 'N/D';
        const price = item.price !== undefined ? `€${item.price}` : '';
        menuContext += `- ${name} | Descrizione: ${desc} | Prezzo: ${price}\n`;
      });
    } else {
      menuContext += "Nessun prodotto trovato nel database.\n";
    }

    let promoContext = "\nPROMOZIONI E SCONTI ATTIVI:\n";
    if (promoItems.length > 0) {
      promoItems.forEach((p) => {
        promoContext += `- ${p.title || p.name}: ${p.description || ''}\n`;
      });
    } else {
      promoContext += "Nessuna promozione speciale attiva al momento.\n";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova. Rispondi in modo breve, diretto e cortese.

INFORMAZIONI GENERALI E TARIFFE:
- All You Can Eat Pranzo: 18,90 € (Ridotto bambini fino a 1,20m: 12,90 €). Festivi/Weekend: 20,90 €.
- All You Can Eat Cena: 32,90 € (Ridotto bambini fino a 1,20m: 17,90 €).
- Formula Aperisushi (13,90 €): Include 1 Drink più la scelta tra:
  1) Combo Cucina: nuvole di drago, edamame, riso cantonese, involtini primavera, ravioli fritti, alghe wakame, spiedini di pollo.
  2) Combo Sushi: nuvole di drago, edamame, gunkan, taco pesto, nigiri misti, hosomaki, uramaki.
- Orari: Pranzo 12:00-15:00, Cena 19:00-23:30 tutti i giorni.
- Contatti: Tel. +39 010 860 0462.
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor.

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI PRUDENZA, ALLERGENI E FONTIDATI (TASSATIVO):
1. **Basati esclusivamente sui dati forniti**: Non inventare mai informazioni, non ricavare dati da internet o da fonti esterne. Usa solo ed esclusivamente le informazioni dei piatti e delle descrizioni presenti nel database fornite sopra.
2. **Zero Assolutismi**: Evita categoricamente l'uso di parole assolute come "solo", "sempre", "mai", "esclusivamente" quando parli di ingredienti, preparazioni o allergeni.
3. **Gestione Allergie**: In caso di domande su allergeni o ingredienti (es. pistacchio, glutine), segnala i piatti corrispondenti usando toni prudenti (es. "nei piatti attualmente registrati nel sistema, questo ingrediente risulta in..."). Invita sempre il cliente a verificare direttamente con il personale di sala o a chiamare il numero 0108600462 per la massima sicurezza.
4. **Dati Mancanti**: Se un piatto o un'informazione non è presente nel menu fornito, di' onestamente di non disporre del dato e invita a contattare il ristorante, senza tirare a indovinare.

REGOLE TASSATIVE PER ASPORTO E LINK ESTERNI:
- Se l'utente chiede di asporto, consegna, ordini o piattaforme (es. "fate asporto?", "avete delivery?"):
  * Controlla lo stato attuale: Asporto interno (${allowTakeaway ? 'ATTIVO' : 'DISATTIVATO'}), Consegna interna (${allowDelivery ? 'ATTIVO' : 'DISATTIVATA'}).
  * SE IL SERVIZIO RICHIESTO È DISATTIVATO: Non limitarti a dire che è chiuso. Spiega subito che il servizio interno è disattivato ma **proponi immediatamente** le piattaforme esterne partner inserendo obbligatoriamente i relativi bottoni: [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO].
- GESTIONE RISPOSTA AFFERMATIVA: Se l'utente risponde "sì", "ok" o simili dopo una domanda sui servizi esterni, mantieni il contesto e fornisci subito i bottoni [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO].

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente chiede di asporto/delivery (o i servizi interni sono disattivati): [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO]
- Se l'utente chiede il menu di pranzo: [BTN:MENU_PRANZO]
- Se l'utente chiede il menu di cena: [BTN:MENU_CENA]
- Se l'utente chiede dove siamo o indicazioni: [BTN:MAPPA]
- Se l'utente chiede di Instagram: [BTN:INSTAGRAM]
- Se l'utente chiede di Facebook: [BTN:FACEBOOK]
- Se l'utente chiede recensioni o TripAdvisor: [BTN:TRIPADVISOR]`
        },
        { role: "user", content: message }
      ],
      max_tokens: 350,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
};