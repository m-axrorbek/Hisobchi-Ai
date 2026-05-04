# Hisobchi Ai

Hisobchi Ai is a mobile-first Uzbek money notebook. The app focuses on one core flow:

`voice -> UzbekVoice STT -> text cleanup -> AI/local parse -> expense/debt record -> offline analytics + exports`

The MVP is frontend-first and stores records locally for offline reliability.

## What It Does

- records expenses, debt taken, debt given, income, and debt payments
- accepts Uzbek voice input and manual entry
- keeps data in local storage for offline access
- tracks partial debt payments and remaining balances
- asks for clarification when debt direction or amount is unclear
- shows useful analytics for today, week, month, and debt state
- exports CSV and printable PDF-style reports

## Main Pages

### Home

- voice capture and transcript review
- manual add composer
- small calculator card
- last 3 records

### Xarajatlar

- all records by date and time
- filters for expenses and debt states
- edit, archive, restore, delete
- mark debt as paid
- add partial payment
- CSV and PDF export

### Analiz

- today / week / month expense totals
- active and paid debt totals
- who I owe money to
- who owes me money
- most expensive category
- daily / weekly / monthly charts
- short AI-like summary

## Data Model

Each record follows this shape:

```json
{
  "id": "uuid",
  "type": "expense | debt_taken | debt_given | income | debt_payment",
  "item": "string",
  "quantity": 1,
  "unit_price": 0,
  "amount": 0,
  "category": "oziq-ovqat",
  "person": "",
  "store": "",
  "currency": "UZS",
  "payment_status": "paid | unpaid | partial",
  "paid_amount": 0,
  "remaining_amount": 0,
  "date": "yyyy-MM-dd",
  "time": "HH:mm",
  "note": "",
  "archived": false
}
```

## AI Parsing

The parser supports:

- `expense`
- `debt_taken`
- `debt_given`
- `debt_payment`
- `income`
- `clarify`

Examples:

- `bugun 45 ming ovqatga ketdi`
- `Shuxrat akadan 2 ta silyos oldim 36 ming qarzga`
- `Ali akaga 100 ming qarz berdim`
- `Shuxrat akaga 20 ming qarzimni to'ladim`

The app uses:

- local cleaner for number normalization and STT cleanup
- local parser for stable fallback
- OpenAI serverless analyze route for better structured extraction

Time and amount are intentionally kept conservative so the app does not silently invent wrong values.

## Debt Logic

- active debts are `debt_taken` and `debt_given` with `unpaid` or `partial` status
- partial payment increases `paid_amount` and reduces `remaining_amount`
- full payment marks the debt as `paid`
- a separate `debt_payment` history record is stored
- if one person has multiple active debts, the user chooses which one to close
- if payment is larger than the remaining debt, the app warns instead of saving silently

## Project Structure

```text
api/
  assistant/analyze.js
  uzbekvoice/stt.js
server/
  src/
    app.js
    modules/assistant/
src/
  components/
    CalculatorCard.jsx
    DebtResolutionSheet.jsx
    ManualRecordSheet.jsx
    RecordList.jsx
    SettingsSheet.jsx
    VoiceInput.jsx
  lib/
    assistant/
      clean.js
      openAiPrompt.js
      parse.js
    money/
      analytics.js
      categories.js
      debts.js
      export.js
      format.js
      records.js
      resolve.js
    cleaner.js
    uzbekVoice.js
  pages/
    Home.jsx
    Records.jsx
    Analytics.jsx
  store/
    useMoneyStore.js
```

## Local Setup

1. Install root dependencies:
   `npm install`
2. Install local dev API dependencies:
   `cd server && npm install`
3. Create env files:
   `.env.example -> .env`
   `server/.env.example -> server/.env`
4. Start the app:
   `npm run dev`

`npm run dev` starts:

- Vite frontend
- local Express analyze proxy on `http://localhost:4000`

The MVP remains frontend-first. If the local API is down, the app still falls back to local parsing.

## Environment Variables

### Root `.env`

- `VITE_UZBEKVOICE_STT_URL`
- `UZBEKVOICE_API_KEY`

### `server/.env`

- `PORT`
- `CLIENT_ORIGIN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Vercel

Set these in the Vercel project:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `UZBEKVOICE_API_KEY`
- `VITE_UZBEKVOICE_STT_URL=/api/uzbekvoice/stt`

## Notes

- local storage powers offline records
- voice and AI still need internet
- exported PDF is a printable report window for family-friendly sharing
- PWA-ready structure is enabled through `vite-plugin-pwa`
