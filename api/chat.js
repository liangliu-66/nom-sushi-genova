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

    const { message, history } = body || {};

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

    // Gestione della cronologia limitata agli ultimi 5 messaggi
    let formattedHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      formattedHistory = history.slice(-5); // Prende solo gli ultimi 5 messaggi
    }

    const systemPrompt = `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova. Rispondi in modo estremamente sintetico, pulito e cortese, usando punti elenco ben separati.

CONTESTO TEMPORALE INTERNO (NON CITARE MAI LE DATE NELLE RISPOSTE): Oggi è Sabato 3 Ottobre 2026. Se l'utente chiede di "domani" si intende Domenica, se chiede di "dopodomani" si intende Lunedì.

NOTA SUL TERMINE "SMART": Se l'utente usa la parola "smart", si riferisce al Menu Pranzo o al Menu Cena All You Can Eat standard.

INFORMAZIONI GENERALI E TARIFFE:
- Sito Web Ufficiale: https://www.nomsushi.it
- Orari: Pranzo 12:00-15:00, Cena 19:00-23:30 tutti i giorni.
- Coperto: Tutti i prezzi si intendono con il coperto incluso.

MENU PRANZO (12:00 - 15:00):
- Lunedì - Venerdì: Menu Pranzo a 18,90 € | Lunch Box (Antipasto + Combo + Acqua inclusa) a 13,90 €
- Sabato - Domenica (Weekend Famiglia): Menu Pranzo a 20,90 €
- Menu Bimbi (sotto 1,20m): 10,90 € (Sabato e Domenica in promozione a 5,00 €)

MENU CENA (19:00 - 23:30):
- Lunedì - Giovedì: Menu Cena a 28,90 €
- Venerdì - Domenica: Menu Cena a 30,90 €
- Promo Early Dinner: Sconto del 10% applicabile esclusivamente sul Menu Cena per ingressi entro le ore 20:00 (dalle 19:00 alle 20:00). Non valida a pranzo.
- Menu Bimbi (sotto 1,20m): 15,90 €

ALTRE FORMULE:
- Formula Aperisushi (13,90 €): Disponibile tutte le sere dalle 19:00 alle 21:00.

- Contatti: Tel. +39 010 860 0462.
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor.

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI GESTIONE DELLE DOMANDE GENERICHE (TASSATIVO):
1. **Richiesta di chiarimento obbligatoria**: Se l'utente fa una domanda troppo generica senza specificare se si riferisce al pranzo o alla cena (es. "quanto costa?", "quanto costa il menu?", "quanto pagano i bambini?", "quanto costa domani?"), **NON dare cifre o elenchi completi**. Devi invece fare subito una domanda di conferma mirata, ad esempio: *"Ti riferisci al Menu Pranzo o al Menu Cena?"* oppure *"Parli del pranzo o della cena?"*.
2. **Vietato citare date esatte**: Quando l'utente chiede di "oggi", "domani" o "dopodomani", calcola tu il giorno internamente ma non scrivere mai la data del calendario.
3. **Massima Sintesi e Punti Elenco**: Quando fornisci dati, usa elenchi puntati separati da a capo.
4. **Continuità del Discorso**: Tieni a mente la cronologia della conversazione per seguire correttamente il filo logico dei messaggi precedenti.

REGOLE TASSATIVE PER ASPORTO E LINK ESTERNI:
- Fornisci i bottoni di asporto [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO] **soltanto** se l'utente chiede esplicitamente di ordinare, asporto o delivery.

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente chiede del sito web: [BTN:SITO]
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente chiede il menu di pranzo: [BTN:MENU_PRANZO]
- Se l'utente chiede il menu di cena: [BTN:MENU_CENA]
- Se l'utente chiede dove siamo: [BTN:MAPPA]
- Se l'utente chiede Instagram: [BTN:INSTAGRAM]
- Se l'utente chiede Facebook: [BTN:FACEBOOK]
- Se l'utente chiede recensioni/TripAdvisor: [BTN:TRIPADVISOR]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: message }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
};