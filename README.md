# Volatix 📈

A stock analytics dashboard I built to learn how real-world financial apps work. You type in any stock ticker, and it pulls live data and shows you charts, indicators, and price predictions — all in one place.

---

## Why I built this

I wanted to go beyond basic ML projects and build something that actually looks and feels like a real product. Volatix pulls live stock data, handles errors gracefully, and has multiple analytical views — the kind of thing you'd actually use.

---

## What you can do with it

- Search any stock — Apple, Tesla, Infosys, Reliance, Bitcoin — it handles them all
- See price history, key metrics, and market data at a glance
- Switch between different analytical tabs (RSI, MACD, Moving Averages, etc.)
- Run a basic backtest to see how a strategy would've performed historically
- Get an AI-generated price forecast based on past patterns

---

## Tech I used

- **Next.js 15 + TypeScript** — for the frontend
- **Tailwind CSS** — for styling
- **Recharts** — for all the charts
- **Twelve Data API** — for live stock data (falls back to Yahoo Finance if it hits the rate limit)

---

## Want to run it locally?

You'll need Node.js installed and a free API key from [Twelve Data](https://twelvedata.com/).

```bash
# 1. Clone the project
git clone https://github.com/SathwikBoddula/Volatix.git
cd Volatix

# 2. Install packages
npm install

# 3. Create a .env.local file and paste this in:
# NEXT_PUBLIC_TWELVE_DATA_API_KEY=your_key_here

# 4. Start the app
npm run dev
```

Then open `http://localhost:3000` in your browser. That's it!

---

## Project structure (if you're curious)

```
src/
├── app/
│   ├── components/      # All the UI pieces (topbar, dashboard, charts)
│   │   └── tabs/        # Each tab is its own component
│   ├── data/
│   │   └── mockData.ts  # Stock ticker profiles and mock data
│   └── page.tsx         # Entry point
├── utils/
│   └── formatCurrency.ts  # Handles USD, INR, JPY, GBP, EUR automatically
└── styles/
```

---

## A few things I learned building this

- How to handle live API data and build fallback logic when it fails
- How technical indicators like RSI and MACD actually work under the hood
- How to structure a Next.js project cleanly as it grows
- That currency formatting across global stocks is way more annoying than it sounds 😅

---

Built by [Sathwik Boddula](https://github.com/SathwikBoddula) — open to feedback and contributions!

> ⚠️ This project is actively being worked on — more features coming soon!
