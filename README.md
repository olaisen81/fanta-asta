# ⚽ FantaAsta Live - Gestione Asta Fantacalcio a 10 Giocatori

Applicazione web moderna, fluida e reattiva progettata specificamente per il giorno dell'asta del Fantacalcio per una lega a **10 partecipanti** con massimale di **500 fanta-milioni**.

Costruita con **Next.js (App Router)**, **Supabase** (PostgreSQL, Realtime WebSockets, Autenticazione Google + Email), **Tailwind CSS** e deployabile con un click su **Vercel**.

---

## 🌟 Funzionalità Principali

### 1. Cockpit Asta in Tempo Reale
- **Chiamata Calciatore:** Il Banditore (Admin) seleziona il calciatore dal listone o lo inserisce manualmente.
- **Rilancio Rapido:** Pulsanti istantanei per step di prezzo (`-10`, `-1`, `+1`, `+5`) o inserimento diretto.
- **Assegnazione Immediata:** Seleziona la squadra vincente tra le 10 disponibili e clicca "Aggiudica".
- **Realtime WebSockets:** Appena un calciatore viene assegnato, tutti i 10 dispositivi (smartphone, tablet o PC) si aggiornano istantaneamente senza dover ricaricare la pagina.
- **Effetto Celebrazione:** Coriandoli a schermo all'assegnazione e aggiornamento immediato del budget.
- **Annullamento Rapido (Undo):** In caso di errore di prezzo o di squadra, l'Admin può annullare istantaneamente l'ultima assegnazione con un click ripristinando il budget precedente.

### 2. Controlli Finanziari & Regolamento
- **Budget Iniziale:** 500 Fanta-Milioni per ciascuna delle 10 squadre.
- **Composizione Rosa Standard:** 25 calciatori (3 Portieri, 8 Difensori, 8 Centrocampisti, 6 Attaccanti).
- **Calcolo Offerta Massima (Max Bid):** Formula automatica che garantisce sempre la riserva di almeno 1 credito per ogni slot rimanente:
  $$\text{Max Bid} = \text{Crediti Residui} - (\text{Slot Rimanenti} - 1)$$
- **Protezione da Errori:** Il sistema blocca tentativi di acquisto che violerebbero il massimale o gli slot disponibili per ruolo (es. 4° portiere o offerta superiore al Max Bid).

### 3. Autenticazione & Gestione Accessi
- **Accesso con Google OAuth:** I partecipanti con account Google possono accedere in 1 click.
- **Invito via Email per chi non ha Google:** L'Admin può generare un link di invito personalizzato per ciascuna squadra (`/invite?teamId=...`). Il partecipante accede al link, imposta la propria password ed entra direttamente con la sua squadra associata.
- **Ruoli:**
  - **Banditore (Admin):** Pieni permessi di scrittura (chiamata calciatori, modifica prezzi, assegnazione alle squadre, annullamento, gestione squadre).
  - **Partecipanti (9 Giocatori):** Accesso in sola lettura con visualizzazione live di rose, crediti residui, calciatori liberi e classifiche.
  - **Selettore Rapido di Simulazione:** Durante i test o la presentazione locale, è possibile passare istantaneamente tra vista Admin e qualsiasi delle 10 squadre tramite il menu a tendina in alto a destra.

### 4. Gestione Calciatori Serie A & Importazione
- **Listone Pre-popolato:** Oltre 130 calciatori aggiornati della Serie A suddivisi per ruolo (P, D, C, A), squadra reale e quotazione iniziale.
- **Importatore Excel (.xlsx) / CSV:** L'Admin può caricare direttamente dalla pagina `/listone` il file Excel ufficiale scaricato da Fantacalcio.it. Il sistema mappa automaticamente colonne `R/Ruolo`, `Nome/Calciatore`, `Squadra` e `Quotazione`.
- **Inserimento Manuale Rapido:** Modale istantanea "+ Calciatore Manuale" per inserire al volo primavera aggregati o nuovi acquisti last-minute non presenti nel listone.

---

## 📱 Esperienza Mobile-First e Desktop

- **Mobile:** Interfaccia ottimizzata per l'uso con una sola mano durante l'asta, con barra di navigazione inferiore (Bottom Bar) per spostarsi rapidamente tra *Asta Live*, *Rose*, *Listone* e *Gestione*.
- **Desktop:** Layout widescreen a più colonne con visualizzazione simultanea del cockpit di battuta, tabella delle 10 squadre e feed delle ultime assegnazioni.
- **Tema Scuro Moderno:** UI Dark sportiva ad alto contrasto con indicatori colorati per i ruoli:
  - 🟡 **P** - Portiere (Ambra)
  - 🟢 **D** - Difensore (Smeraldo)
  - 🔵 **C** - Centrocampista (Azzurro)
  - 🔴 **A** - Attaccante (Rosso)

---

## 🚀 Avvio Rapido Locale

L'applicazione è pronta all'uso anche in modalità dimostrativa locale (senza bisogno di configurare subito un database esterno):

```bash
cd fanta-asta
npm run dev
```

Apri `http://localhost:3000` nel browser.

Per testare la sincronizzazione in tempo reale in locale, apri due finestre affiancate del browser (o due schede): una come **Admin** e una come **Partecipante**. Ogni modifica apportata dall'Admin si rifletterà istantaneamente nella scheda del Partecipante grazie al canale di broadcast locale!

---

## 🛠️ Configurazione Supabase (Opzionale per Produzione)

1. Crea un progetto gratuito su [Supabase](https://supabase.com).
2. Vai su **SQL Editor** del tuo progetto Supabase e incolla il contenuto del file:
   ```
   supabase/schema.sql
   ```
   Questo creerà tutte le tabelle (`leagues`, `teams`, `players`, `roster_players`, `auction_state`, `invitations`), abiliterà le politiche RLS e attiverà il Realtime WebSockets.
3. Vai in **Project Settings -> API** e copia le credenziali nel file `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-chiave-anon
   NEXT_PUBLIC_ADMIN_EMAIL=tua-email-admin@gmail.com
   ```
4. Per abilitare l'accesso Google:
   - Vai in **Authentication -> Providers -> Google** su Supabase.
   - Attiva il provider e inserisci il *Client ID* e *Client Secret* della Google Cloud Console.

---

## 🚢 Deploy su Vercel

Puoi distribuire l'applicazione su Vercel in 2 minuti:

1. Fai il push del progetto su una repository GitHub (o importa la cartella).
2. Collega la repository su [Vercel](https://vercel.com).
3. Aggiungi le variabili d'ambiente di Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_EMAIL`).
4. Clicca **Deploy**!

---

## 🧪 Esecuzione dei Test della Logica di Budget

Per verificare la correttezza matematica del calcolo crediti, slot e formule di puntata massima consentita:

```bash
node scripts/test-calculator.mjs
```
