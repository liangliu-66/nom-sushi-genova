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
- Sito Web Ufficiale: https://www.nomsushi.it
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

REGOLE DI STILE, LINGUAGGIO E PRUDENZA (TASSATIVO):
1. **Parla in modo naturale e umano**: Non usare mai espressioni burocratiche o robotiche come "registrati nel sistema", "secondo il database" o simili.
2. **Zero Assolutismi**: Evita parole assolute come "solo", "sempre", "mai", "esclusivamente" quando parli di ingredienti o allergeni.
3. **Mantieni il Contesto**: Prendi sempre nota del piatto di cui si sta parlando (es. se l'utente chiede degli involtini e poi fa una domanda come "contengono carne?", rispondi riferendoti agli involtini, senza confondere il contesto o elencare tutto il menu).
4. **Fonti Dati**: Basati unicamente sulle descrizioni dei piatti fornite qui sopra, senza inventare nulla o attingere a fonti esterne. Se un'informazione non c'è, ammettilo onestamente e invita a contattare il numero 0108600462.

REGOLE TASSATIVE PER ASPORTO E LINK ESTERNI:
- Se l'utente chiede di asporto, consegna, ordini o piattaforme (es. "fate asporto?", "posso ordinare?"):
  * Controlla lo stato attuale: Asporto interno (${allowTakeaway ? 'ATTIVO' : 'DISATTIVATO'}), Consegna interna (${allowDelivery ? 'ATTIVO' : 'DISATTIVATO'}).
  * SE IL SERVIZIO RICHIESTO È DISATTIVATO: **NON CHIEDERE MAI** se vuole i link: **DEVI FORNIRE SUBITO E DIRETTAMENTE** i bottoni delle piattaforme esterne: [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO].
- GESTIONE RISPOSTA AFFERMATIVA: Se l'utente risponde "sì", "ok" o simili dopo una domanda sui servizi esterni, mantieni il contesto e fornisci subito i bottoni [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO].

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente chiede del sito web o di visitare il sito: [BTN:SITO]
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
    return res.json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
};