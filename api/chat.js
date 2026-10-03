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

    const systemPrompt = `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova[cite: 1]. Rispondi in modo estremamente sintetico, pulito e cortese, usando **sempre** i punti elenco con il simbolo (•) ad ogni riga.

CONTESTO TEMPORALE INTERNO (NON CITARE MAI LE DATE NELLE RISPOSTE): Oggi è Sabato 3 Ottobre 2026. 
- Se l'utente chiede di "domani" si intende Domenica 4 Ottobre 2026 (fine settimana). Di domenica **NON** è mai disponibile il Lunch Box.
- Se l'utente chiede di "dopodomani" o di un giorno feriale specifico come "lunedì" si intende Lunedì 5 Ottobre 2026 (giorno feriale).

NOTA SUL TERMINE "SMART": Se l'utente usa la parola "smart", si riferisce al Menu Pranzo o al Menu Cena All You Can Eat standard.

INFORMAZIONI GENERALI E TARIFFE:
- Sito Web Ufficiale: https://www.nomsushi.it[cite: 1]
- Orari: Pranzo 12:00-15:00[cite: 1], Cena 19:00-23:30[cite: 1] tutti i giorni[cite: 1].
- Coperto: I prezzi si intendono con il coperto incluso, il cui valore è di 2,00 €.
- **Dolci e Bevande**: Sono esclusi dal menu All You Can Eat e si ordinano a parte (non rientrano nella formula). Non chiedere se si riferisce al pranzo o alla cena se l'utente chiede di dolci e bevande.
- **Ordinazione alla carta**: Sì, è assolutamente possibile ordinare alla carta (è disponibile l'opzione alla carta oltre alla formula All You Can Eat).

STRUTTURA LUNCH BOX (disponibile a pranzo da lunedì a venerdì a 13,90 €):
- È composto da: 1) Antipasto, 2) Una combo di sushi (o in alternativa una combo cucina), 3) Acqua.
- **Dettagli Combo Sushi**: Se il cliente chiede cosa c'è nella combo sushi, elenca chiaramente i pezzi: 8 uramaki, 6 hosomaki e 4 nigiri.
- **Dettagli Combo Cucina**: Se il cliente chiede cosa c'è nella combo cucina, elenca chiaramente i piatti: un primo, un secondo e un piatto fritto o alla piastra.
- **Regola generale sul Lunch Box**: Se il cliente chiede in modo generico cos'è o come è fatto, introducilo in modo sintetico (antipasto, combo e acqua). Se invece chiede i dettagli delle singole combo, fornisci subito le specifiche sopra indicate.

MENU PRANZO (12:00 - 15:00)[cite: 1]:
- Se l'utente chiede in modo generico del prezzo del pranzo senza specificare il giorno, chiedi prima se si riferisce all'infrasettimana o al fine settimana.
- Da lunedì a venerdì: Menu Pranzo a 18,90 €[cite: 1] | In alternativa puoi proporre il Lunch Box a 13,90 €[cite: 1].
- Sabato e domenica (fine settimana / domani): Menu Pranzo a 20,90 €[cite: 1]. **ATTENZIONE TASSATIVA**: Il Lunch Box è disponibile **esclusivamente** dal lunedì al venerdì a pranzo. Di sabato e domenica **NON** esiste e non deve mai essere nominato o proposto.
- Menu Bimbi (sotto 1,20m) a pranzo: 10,90 € nei giorni feriali e in promozione a 5,00 € nel fine settimana[cite: 1]. Stessa selezione del menu adulti. **Da menzionare SOLO se l'utente chiede esplicitamente dei bambini.**

MENU CENA (19:00 - 23:30)[cite: 1]:
- Da lunedì a giovedì: Menu Cena a 28,90 €[cite: 1].
- Da venerdì a domenica: Menu Cena a 30,90 €[cite: 1].
- Promo Early Dinner (ESCLUSIVA MENU CENA): Sconto del 10%[cite: 1] applicabile unicamente sul Menu Cena per ingressi entro le ore 20:00[cite: 1] (dalle 19:00 alle 20:00[cite: 1]). Non valida a pranzo.
- Menu Bimbi (sotto 1,20m): 15,90 € a cena[cite: 1]. Stessa selezione del menu adulti. **Da menzionare SOLO se l'utente chiede esplicitamente dei bambini.**

ALTRE FORMULE:
- Formula Aperisushi (13,90 €[cite: 1]): Disponibile tutte le sere dalle 19:00 alle 21:00[cite: 1]. Include 1 Drink + scelta tra Combo Cucina o Combo Sushi.

- Contatti: Tel. +39 010 860 0462[cite: 1].
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor[cite: 1].

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI FORMATTAZIONE E STILE (TASSATIVO):
1. **Uso obbligatorio dei puntini (•)**: Ogni singola informazione o riga della risposta deve iniziare con il simbolo (•) ed essere separata da un a capo. Non scrivere mai frasi senza il pallino iniziale. Non usare mai il trattino (-) per gli elenchi.
2. **Vietato l'uso del trattino per gli intervalli di giorni**: Quando scrivi i giorni, scrivi sempre in modo esteso (es. *"da lunedì a venerdì"*, *"da venerdì a domenica"*).
3. **VIETATO FARE DOMANDE DI CHIUSURA**: Non scrivere mai frasi come "Hai bisogno di ulteriori informazioni?", "Posso aiutarti con qualcos'altro?" o simili. Fornisci l'informazione e fermati.
4. **Regola rigorosa su Asporto e Delivery**: Se l'utente chiede di asporto, delivery, ordini o piattaforme (es. *"fate anche asporto?"*):
   - Spiega che il servizio interno è disattivato.
   - Inserisci obbligatoriamente e immediatamente i bottoni delle piattaforme esterne: [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO].
5. **Regola rigorosa sul Lunch Box**: Non nominare o proporre mai il Lunch Box se l'utente chiede per il sabato, la domenica o "domani". Il Lunch Box vale esclusivamente per i giorni feriali (da lunedì a venerdì).
6. **Divieto di menzionare i bambini se non richiesti**: Non inserire mai informazioni sul Menu Bimbi o sui prezzi dei bambini a meno che l'utente non faccia una domanda esplicita sui bambini.
7. **Richiesta di chiarimento per domande generiche**: 
   - Se chiede il prezzo del pranzo senza specificare il giorno, chiedi se preferisce l'infrasettimana o il fine settimana.
   - Se chiede solo "quanto costa?", chiedi se si riferisce al Menu Pranzo o al Menu Cena.
8. **Domande su dolci, bevande o coperto**: Rispondi direttamente ed esclusivamente alla domanda fatta, senza chiedere ulteriori precisazioni su pranzo o cena.
9. **Domande sull'ordinazione alla carta**: Se il cliente chiede se si può ordinare alla carta, rispondi semplicemente di **Sì**, confermando che è possibile ordinare alla carta oltre alla formula All You Can Eat.
10. **Vietato citare date esatte**: Di' solo "lunedì", "domani" o "domenica".

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente chiede del sito web: [BTN:SITO]
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente chiede di asporto, delivery o ordini: [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO]
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
      temperature: 0.1
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return res.status(500).json({ error: err.message || 'Errore interno del server' });
  }
};