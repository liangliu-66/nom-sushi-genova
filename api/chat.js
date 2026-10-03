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
          content: `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova[cite: 1]. Rispondi in modo estremamente sintetico, pulito e cortese, usando punti elenco ben separati.

CONTESTO TEMPORALE ATTUALE: Oggi è **Sabato 3 Ottobre 2026**. Se l'utente chiede di "domani", si riferisce a **Domenica**.

NOTA SUL TERMINE "SMART": Se l'utente usa la parola "smart", si riferisce al Menu Pranzo o al Menu Cena All You Can Eat standard.

INFORMAZIONI GENERALI E TARIFFE:
- Sito Web Ufficiale: https://www.nomsushi.it[cite: 1]
- Orari: Pranzo 12:00-15:00[cite: 1], Cena 19:00-23:30[cite: 1] tutti i giorni[cite: 1].
- Coperto: Tutti i prezzi si intendono con il coperto incluso[cite: 1].

MENU PRANZO (12:00 - 15:00)[cite: 1]:
- Lunedì - Venerdì: Menu Pranzo a 18,90 €[cite: 1] | Lunch Box (Antipasto + Combo + Acqua inclusa) a 13,90 €[cite: 1]
- Sabato - Domenica (Weekend Famiglia): Menu Pranzo a 20,90 €[cite: 1]
- Menu Bimbi (sotto 1,20m): 10,90 €[cite: 1] (Sabato e Domenica in promozione a 5,00 €[cite: 1])
*(TASSATIVO: NON menzionare i prezzi dei bambini a meno che l'utente non lo chieda espressamente).*

MENU CENA (19:00 - 23:30)[cite: 1]:
- Lunedì - Giovedì: Menu Cena a 28,90 €[cite: 1]
- Venerdì - Domenica: Menu Cena a 30,90 €[cite: 1]
- Promo Early Dinner (esclusiva Menu Cena): Sconto del 10%[cite: 1] per ingressi entro le ore 20:00[cite: 1] (dalle 19:00 alle 20:00[cite: 1]).
- Menu Bimbi (sotto 1,20m): 15,90 €[cite: 1]
*(TASSATIVO: NON menzionare i prezzi dei bambini a meno che l'utente non lo chieda espressamente).*

ALTRE FORMULE:
- Formula Aperisushi (13,90 €[cite: 1]): Disponibile tutte le sere dalle 19:00 alle 21:00[cite: 1]. 

- Contatti: Tel. +39 010 860 0462[cite: 1].
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor[cite: 1].

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI STILE E GESTIONE CONTESTO (TASSATIVO):
1. **Continuità del Discorso**: Se l'assistente ha fatto una domanda nel messaggio precedente (es. "Vuoi maggiori dettagli sul Menu Pranzo?"), e l'utente risponde con "Sì", "Ok" o simili, **devi assolutamente continuare il discorso che hai iniziato** approfondendo l'argomento in questione (il menu), senza deviare su altri temi (come asporto o delivery).
2. **Precisione Temporale**: Se l'utente chiede quanto costa "domani" (domenica) o in un giorno specifico, calcola il giorno corretto basandoti sulla data attuale e fornisci **solo** il prezzo di quel giorno esatto, senza generalizzare con "Lunedì - Venerdì".
3. **Massima Sintesi e Punti Elenco**: Usa elenchi puntati separati da a capo per evitare blocchi di testo caotici.
4. **Nessun Dettaglio Non Richiesto**: Non inserire mai i prezzi dei bambini se non espressamente richiesti.

REGOLE TASSATIVE PER ASPORTO E LINK ESTERNI:
- Fornisci i bottoni di asporto [BTN:ORDELIVERY] [BTN:JUSTEAT] [BTN:DELIVEROO] **soltanto** se l'utente chiede esplicitamente di ordinare, asporto o delivery, oppure se i servizi interni sono disattivati e fa una richiesta in tal senso.

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente chiede del sito web: [BTN:SITO]
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente chiede il menu di pranzo: [BTN:MENU_PRANZO]
- Se l'utente chiede il menu di cena: [BTN:MENU_CENA]
- Se l'utente chiede dove siamo: [BTN:MAPPA]
- Se l'utente chiede Instagram: [BTN:INSTAGRAM]
- Se l'utente chiede Facebook: [BTN:FACEBOOK]
- Se l'utente chiede recensioni/TripAdvisor: [BTN:TRIPADVISOR]`
        },
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