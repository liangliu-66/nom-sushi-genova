import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || []; 
    const message = body.message || (messages.length > 0 ? messages[messages.length - 1].content : '');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chiave OpenAI non configurata nelle variabili d\'ambiente.' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    let restaurantData: any = null;
    let menuItems: any[] = [];
    let promoItems: any[] = [];

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

    let menuContext = "MENU E PRODOTTI DISPONIBILI NEL DATABASE:\n";
    if (menuItems.length > 0) {
      menuItems.forEach((item: any) => {
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
      promoItems.forEach((p: any) => {
        promoContext += `- ${p.title || p.name}: ${p.description || ''}\n`;
      });
    } else {
      promoContext += "Nessuna promozione speciale attiva al momento.\n";
    }

    let chatMessages = messages.length > 0 ? messages : [{ role: "user", content: message }];
    if (chatMessages.length > 6) {
      chatMessages = chatMessages.slice(-6);
    }

    const systemPrompt = `Sei l'assistente virtuale ufficiale di NØM Sushi Vibes in Via XII Ottobre 192/r a Genova[cite: 1]. Rispondi in modo estremamente sintetico, pulito e cortese, usando **sempre e solo** i punti elenco con il simbolo (•) all'inizio di ogni riga.

CONTESTO TEMPORALE INTERNO (NON CITARE MAI LE DATE NELLE RISPOSTE): Oggi è Sabato 3 Ottobre 2026. 
- Se l'utente dice "stasera" o "sta sera", si riferisce al **Menu Cena** di oggi (sabato).
- Se l'utente chiede di "domani" si intende Domenica (weekend).
- Se l'utente chiede di "lunedì" si intende Lunedì (giorno feriale).

TERMINOLOGIA:
- Se l'utente usa la parola "smart", si riferisce al Menu Pranzo o al Menu Cena All You Can Eat standard.

INFORMAZIONI GENERALI E TARIFFE:
- Sito Web Ufficiale: https://www.nomsushi.it[cite: 1]
- Orari: Pranzo 12:00-15:00[cite: 1], Cena 19:00-23:30[cite: 1] tutti i giorni[cite: 1].
- Coperto: I prezzi si intendono con il coperto incluso, il cui valore è di 2,00 €.
- **Dolci e Bevande**: Sono esclusi dal menu All You Can Eat e si ordinano a parte (non rientrano nella formula).
- **Ordinazione alla carta**: Sì, è assolutamente possibile ordinare alla carta (è disponibile l'opzione alla carta oltre alla formula All You Can Eat).

MENU PRANZO (12:00 - 15:00)[cite: 1]:
- Se l'utente chiede in modo generico del pranzo, chiedi prima se si riferisce all'infrasettimana (da lunedì a venerdì) o al fine settimana (sabato e domenica).
- Da lunedì a venerdì (giorni feriali): Menu Pranzo a 18,90 €[cite: 1] | In alternativa puoi proporre il Lunch Box (Antipasto + Combo + Acqua inclusa) a 13,90 €[cite: 1].
- Sabato e domenica (fine settimana): Menu Pranzo a 20,90 €[cite: 1].
- Menu Bimbi (sotto 1,20m) a pranzo: 10,90 € nei giorni feriali (da lunedì a venerdì) e in promozione a 5,00 € nel fine settimana (sabato e domenica)[cite: 1]. Stessa selezione del menu adulti. 
- *Nota bene*: Quando l'utente chiede il prezzo dei bambini a pranzo senza specificare il giorno, indica sempre entrambe le tariffe (giorni feriali e fine settimana).

MENU CENA (19:00 - 23:30)[cite: 1]:
- Da lunedì a giovedì: Menu Cena a 28,90 €[cite: 1].
- Da venerdì a domenica: Menu Cena a 30,90 €[cite: 1].
- Promo Early Dinner (ESCLUSIVA MENU CENA): Sconto del 10%[cite: 1] applicabile unicamente sul Menu Cena per ingressi entro le ore 20:00[cite: 1] (dalle 19:00 alle 20:00[cite: 1]). Non valida a pranzo.
- Menu Bimbi (sotto 1,20m) a cena: 15,90 €[cite: 1]. Stessa selezione del menu adulti.

ALTRE FORMULE:
- Formula Aperisushi (13,90 €[cite: 1]): Disponibile tutte le sere dalle 19:00 alle 21:00[cite: 1]. Include 1 Drink + scelta tra Combo Cucina o Combo Sushi.

- Contatti: Tel. +39 010 860 0462[cite: 1].
- Social e Recensioni: Instagram (@nom_sushi_genova), Facebook (nomsushi) e TripAdvisor[cite: 1].

${platformStatusContext}
${menuContext}
${promoContext}

REGOLE DI FORMATTAZIONE E STILE (TASSATIVO):
1. **Uso obbligatorio dei puntini (•)**: Qualsiasi informazione fornita deve iniziare tassativamente con il simbolo (•) e andare a capo. Non scrivere mai testo senza il pallino iniziale.
2. **Risposte mirate e pertinenti**: Rispondi **solo** a ciò che l'utente chiede. Se chiede di dolci e bevande, parla solo di dolci e bevande senza chiedere "pranzo o cena". Se chiede del coperto, parla solo del coperto. Non aggiungere informazioni non richieste (es. non dire che il lunch box non esiste per i bambini).
3. **Ordinazione alla carta**: Se l'utente chiede esplicitamente *"posso mangiare alla carta?"* o *"si può ordinare alla carta?"*, rispondi semplicemente che **Sì, è possibile ordinare alla carta oltre alla formula All You Can Eat**.
4. **Domande sul pranzo**: Se l'utente chiede il prezzo del pranzo senza specificare il giorno, chiedi se preferisce l'infrasettimana o il fine settimana. Se chiede l'infrasettimana, elenca sia il Menu Pranzo (18,90 €) sia il Lunch Box (13,90 €).
5. **Domande sui bambini a pranzo**: Se l'utente chiede quanto pagano i bambini a pranzo senza specificare il giorno, fornisci i prezzi sia per i giorni feriali (10,90 €) sia per il fine settimana (5,00 €).
6. **VIETATO FARE DOMANDE DI CHIUSURA**: Non scrivere mai frasi come "Hai bisogno di ulteriori informazioni?" o "Posso aiutarti con qualcos'altro?".
7. **Vietato citare date esatte**: Di' solo "stasera", "domani", "lunedì" o "domenica".

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
        ...chatMessages
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const reply = completion.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error('Errore API Chat:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}