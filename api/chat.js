import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const { message } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chiave OpenAI non configurata nelle variabili d\'ambiente.' }, { status: 500 });
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

REGOLE DI LINGUA E COMPORTAMENTO:
1. Rileva la lingua dell'utente e rispondi nella stessa lingua.
2. Usa rigorosamente i dati del database sopra per descrivere i piatti e i prezzi precisi.
3. Se un'informazione non è presente né nelle tariffe generali né nel database, invita l'utente a chiamare il numero 0108600462.

REGOLE PER I BOTTONI E LE AZIONI:
- Se l'utente vuole prenotare un tavolo: [ACTION:RESERVE] [BTN:PRENOTA]
- Se l'utente vuole ordinare con Ordelivery: [BTN:ORDELIVERY]
- Se l'utente vuole ordinare con Just Eat: [BTN:JUSTEAT]
- Se l'utente vuole ordinare con Deliveroo: [BTN:DELIVEROO]
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
    return NextResponse.json({ reply });

  } catch (err) {
    console.error('Errore API Chat:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}