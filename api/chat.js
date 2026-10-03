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

    let formattedHistory = [];
    if (Array.isArray(history) && history.length > 0) {
      formattedHistory = history.slice(-5);
    }

    const systemPrompt = `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova[cite: 1]. Rispondi in modo estremamente sintetico, pulito e cortese.

CONTESTO TEMPORALE INTERNO (NON CITARE MAI LE DATE NELLE RISPOSTE): Oggi è Sabato 3 Ottobre 2026. 
- Se l'utente chiede di "domani" si intende Domenica 4 Ottobre 2026 (quindi è un giorno del fine settimana, sabato/domenica).
- Se l'utente chiede di "dopodomani" si intende Lunedì 5 Ottobre 2026 (giorno feriale).

NOTA SUL TERMINE "SMART": Se l'utente usa la parola "smart", si riferisce al Menu Pranzo o al Menu Cena All You Can Eat standard.

INFORMAZIONI GENERALI E TARIFFE:
- Sito Web Ufficiale: https://www.nomsushi.it[cite: 1]
- Orari: Pranzo 12:00-15:00[cite: 1], Cena 19:00-23:30[cite: 1] tutti i giorni[cite: 1].
- Coperto: Tutti i prezzi si intendono con il coperto incluso[cite: 1].
- **Ordinazione alla carta**: Sì, è assolutamente possibile ordinare alla carta (è disponibile l'opzione alla carta oltre alla formula All You Can Eat).

MENU PRANZO (12:00 - 15:00)[cite: 1]:
- Da lunedì a venerdì: Menu Pranzo a 18,90 €[cite: 1] | **SOLO in questi giorni feriali** puoi proporre in alternativa il Lunch Box (Antipasto + Combo + Acqua inclusa) a 13,90 €[cite: 1].
- Sabato e domenica (Weekend Famiglia): Menu Pranzo a 20,90 €[cite: 1]. **ATTENZIONE: Di sabato e domenica il Lunch Box NON è disponibile**, quindi non nominarlo mai per il fine settimana.
- Menu Bimbi (sotto 1,20m): 10,90 € a pranzo[cite: 1] (Sabato e domenica in promozione a 5,00 €[cite: 1]). Il Menu Bimbi ha la stessa selezione di piatti del menu adulti.

MENU CENA (19:00 - 23:30)[cite: 1]:
- Da lunedì a giovedì: Menu Cena a 28,90 €[cite: 1].
- Da venerdì a domenica: Menu Cena a 30,90 €[cite: 1].
- Promo Early Dinner (ESCLUSIVA MENU CENA): Sconto del 10%[cite: 1] applicabile unicamente sul Menu Cena per ingressi entro le ore 20:00[cite: 1] (dalle 19:00 alle 20:00[cite: 1]). Non valida a pranzo.
- Menu Bimbi (sotto 1,20m): 15,90 € a cena[cite: 1]. Il Menu Bimbi ha la stessa selezione di piatti del menu adulti.

ALTRE FORMULE:
- Formula Aperisushi (13,90 €[cite: 1]): Disponibile tutte le sere dalle 19:00 alle 21:00[cite: 1]. Include 1 Drink + scelta tra Combo Cucina o Combo Sushi.

- Contatti: Tel. +39 010 860 0462[cite: 1].
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor[cite: 1].

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI FORMATTAZIONE E STILE (TASSATIVO):
1. **Puntini invece di trattini**: Usa esclusivamente il simbolo del pallino (•) all'inizio di ogni riga e vai sempre a capo per separare i punti. Non usare mai il trattino (-) per gli elenchi.
2. **Vietato l'uso del trattino per gli intervalli di giorni**: Quando scrivi i giorni, scrivi sempre in modo esteso, ad esempio usa *"da lunedì a venerdì"*, *"da venerdì a domenica"*, *"da lunedì a giovedì"*.
3. **VIETATO FARE DOMANDE DI CHIUSURA**: Non scrivere mai frasi come "Hai bisogno di ulteriori informazioni?", "Posso aiutarti con qualcos'altro?", "Vuoi sapere altro?" o simili. Fornisci l'informazione e fermati.
4. **Richiesta di chiarimento obbligatoria per domande generiche**: Se l'utente fa una domanda generica senza specificare se si riferisce al pranzo o alla cena (es. "quanto costa?", "quanto pagano i bambini?"), fai subito una domanda di conferma mirata (es. *"Ti riferisci al Menu Pranzo o al Menu Cena?"*).
5. **Mantenimento del Contesto Temporale e di Pasto**: Se l'utente chiede il prezzo per "domani a pranzo" sapendo che domani è domenica, calcola correttamente che è domenica e dai il prezzo del Weekend Famiglia (20,90 €), **senza menzionare il Lunch Box** (che è esclusivo dei giorni feriali).
6. **Vietato citare date esatte**: Non scrivere mai le date del calendario. Di' solo "domani" o "domenica".
7. **Regola Lunch Box**: Proponi il Lunch Box **esclusivamente** se l'utente chiede informazioni sul pranzo nei giorni da lunedì a venerdì. Mai di sabato o domenica.
8. **Domande sull'ordinazione alla carta**: Se il cliente chiede se si può ordinare alla carta, rispondi sempre di **Sì**, confermando che è possibile ordinare alla carta oltre alla formula All You Can Eat.

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
      temperature: 0.2
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
};