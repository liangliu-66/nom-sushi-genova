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
- Orari: Pranzo 12:00-15:00[cite: 1], Cena 19:00-23:30 tutti i giorni[cite: 1].
- Coperto: Tutti i prezzi si intendono con il coperto incluso[cite: 1].

MENU PRANZO (12:00 - 15:00):
- Da Lunedì a Venerdì: Menu Smart Pranzo a 18,90 €[cite: 1]. Lunch Box (Antipasto + Combo + Acqua inclusa) a 13,90 €[cite: 1]. Menu Bimbi (sotto 1,20m) a 10,90 €[cite: 1].
- Sabato e Domenica (Weekend Famiglia): Menu Smart Pranzo a 20,90 €[cite: 1]. Menu Bimbi (sotto 1,20m) in promozione a 5,00 €[cite: 1].

MENU CENA (19:00 - 23:30):
- Da Lunedì a Giovedì: Menu Smart Cena a 28,90 €[cite: 1]. Menu Bimbi (sotto 1,20m) a 15,90 €[cite: 1].
- Da Venerdì a Domenica: Menu Smart Cena a 30,90 €[cite: 1]. Menu Bimbi (sotto 1,20m) a 15,90 €[cite: 1]. Promo "Early Dinner": Sconto del 10% entrando tra le 19:00 e le 20:00[cite: 1].

ALTRE FORMULE:
- Formula Aperisushi (13,90 €): Disponibile tutte le sere dalle 19:00 alle 21:00[cite: 1]. Include 1 Drink più la scelta tra:
  1) Combo Cucina: nuvole di drago, edamame, riso cantonese, involtini primavera, ravioli fritti, alghe wakame, spiedini di pollo.
  2) Combo Sushi: nuvole di drago, edamame, gunkan, taco pesto, nigiri misti, hosomaki, uramaki.

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
- Se l'utente chiede del sito web, del sito ufficiale o di visitare il sito: DEVI RISPONDERE inserendo obbligatoriamente il tag [BTN:SITO].
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente chiede di asporto/delivery (o i servizi interni sono disattivati): [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO]
- Se l'utente chiede il menu di pranzo: [BTN:MENU_PRANZO]
- Se l'utente chiede il menu di cena: [BTN:MENU_CENA]
- Se l'utente chiede dove siamo o indicazioni: [BTN:MAPPA]
- Se l'utente chiede di Instagram o foto: DEVI RISPONDERE inserendo obbligatoriamente il tag [BTN:INSTAGRAM].
- Se l'utente chiede di Facebook: DEVI RISPONDERE inserendo obbligatoriamente il tag [BTN:FACEBOOK].
- Se l'utente chiede recensioni o TripAdvisor: DEVI RISPONDERE inserendo obbligatoriamente il tag [BTN:TRIPADVISOR].`
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