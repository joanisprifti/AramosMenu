# Aramos — digital menu

A fast, mobile-first, bilingual (EL/EN) menu you can scan at the table.
It has live search, a sticky category nav, and an optional **order basket**
(tap + to build a selection and see a running total).
It's fully **data-driven**: one config file controls the brand and look, one
file holds the menu. No build step, no framework — just open `index.html` or
drop the folder on any static host.

```
index.html -> markup shell
style.css -> layout + design tokens
script.js -> the engine (render, search, navigation)
config.json -> branding, colours, languages, links
menu.json -> the menu content
aramosLogo.png -> the logo
```

---

## Rebrand for a new venue in ~5 minutes

Everything below lives in **`config.json`** — no code changes needed.

1. **Logo** — drop the new file in the folder and point `brand.logo` at it.
   The header sits on a dark band, so a logo with a transparent or dark
   background looks best. If the logo has no wordmark of its own, set
   `"showWordmark": true` to print the name + tagline beneath it.
2. **Name & tagline** — `brand.name`, `brand.tagline`.
3. **Colours** — edit the `theme` block. These values are written onto the
   page as CSS variables at load, so changing the six core colours
   (`brand`, `surf`, `sand`, `shell`, `ink`, `coral`) re-skins the whole site.
4. **Currency** — `brand.currency` (`"€"`, `"$"`, …) and `currencyPosition`
   (`"after"` → `2.50€`, `"before"` → `$2.50`).
5. **Links** — the `social` array. Each entry is `{ "net": …, "url": … }`.
   Supported `net` icons: `instagram`, `facebook`, `map`, `tripadvisor`,
   `whatsapp`, `tiktok`, `x`, `phone` (anything else gets a generic link icon).
6. **Menu** — replace `menu.json` (schema below).

> Changing the **font** also means swapping the Google Fonts `<link>` in
> `index.html` to load the new family. Keep a face that includes Greek glyphs
> (the defaults, Alegreya / Alegreya Sans, do).

---

## `menu.json` schema

```jsonc
{
  "menu": [
    {
      "id": "coffee",                      // unique, url-safe (used for nav)
      "name": { "en": "COFFEE", "el": "ΚΑΦΕΔΕΣ" },
      "items": [
        {
          "name": { "en": "Latte", "el": "Λάτε" },
          "description": { "en": "hot, cold", "el": "ζεστό, κρύο" }, // optional
          "price": 3.50,
          "featured": true,                // optional → shows a ★
          "tags": [                        // optional → small pills
            { "en": "Vegan", "el": "Νηστίσιμο" }
          ]
        }
      ]
    }
  ]
}
```

- **Add a category** → add an object to `menu`. It appears in the menu *and*
  the sticky category nav automatically.
- **No price yet?** Use `0` (or omit `price`). It renders as the
  `brand.marketPriceLabel` dash (`—`) instead of `0.00€`.
- **Dietary / allergen tags** are *not* auto-detected — add them per item via
  `tags` so they're accurate. Only staff who know the recipes should set these.

---

## `config.json` quick reference

| Key | What it does |
|---|---|
| `brand` | name, tagline, logo, currency, market-price label |
| `languages` | list of `{ code, label }`; the toggle cycles through them |
| `defaultLanguage` / `autoDetectLanguage` | starting language (auto uses the visitor's browser language when it matches) |
| `features` | turn `search`, `categoryNav`, `backToTop`, `basket` on/off |
| `notice` / `searchPlaceholder` / `emptyState` | UI strings, per language |
| `basket` | order-basket labels, per language (see *Order basket* below) |
| `social` | footer links |
| `theme` | colours, radius, fonts (applied as CSS variables) |

Adding a third language is just another entry in `languages` plus the matching
`el`/`en`/… keys throughout `menu.json` and the string blocks in `config.json`.

---

## Order basket

Each item gets a **+** button. Tapping it adds the item and turns the button
into a **− / quantity / +** stepper (at quantity 1 the minus becomes a remove).
A floating bar shows the item count and running total; tapping it opens a
slide-up sheet listing the selection, line totals, the grand total, and a
**Clear** button.

> **It is not a checkout.** There's no payment or order-sending backend — the
> basket is a selection the guest builds and *shows to staff*. That framing is
> the `basket.note` string, so you can reword it (or point it at a phone number,
> table-service instruction, etc.).

**Turn it off** — set `features.basket` to `false`. The menu becomes
view-only: no buttons, no bar, no sheet.

**Customise the wording** — edit the `basket` block in `config.json`. Every key
is per-language:

| Key | Where it shows |
|---|---|
| `title` | sheet header (a `· {n} items` count is appended automatically) |
| `open` | label on the floating bar |
| `empty` | message when the basket is empty |
| `total` / `clear` | totals row label and the clear button |
| `note` | the small print under the total (the "show staff" line) |
| `marketNote` | shown when the basket mixes priced and market-price items |
| `itemsOne` / `itemsMany` | the count text; `{n}` is replaced by the number |
| `add` / `remove` | accessibility labels for the buttons |

**Prices & currency** — totals use `brand.currency` and `currencyPosition`,
exactly like the item prices. Market-price items (`price: 0` or omitted) can
still be added; they show the `—` dash, are left out of the numeric total, and
trigger the `marketNote` line so nothing looks mis-summed.

**Persistence** — the basket is saved in the visitor's browser per venue
(`localStorage`), so it survives a page refresh and is namespaced by
`brand.name` (two venues won't collide). If storage is blocked — e.g. a preview
sandbox or private mode — it silently falls back to keeping the basket in memory
for that session.

---

## Content notes worth a look

While wiring this up, a few items had **mismatched EN/EL descriptions** or
prices that need a human decision — I left the data as-is rather than guess:

- **ARAMOS** cocktail: EN says *cinnamon*, EL says *κυδώνι* (quince).
- **MELLOTINI**: EN says *melon liqueur*, EL says *λικέρ μέλι* (honey); EN also
  reads "liqueur mellon" (→ melon).
- A few English typos in descriptions: "almont" → almond, "bitetr orange" →
  bitter orange, "coctail" → cocktail, "Stratsiatela" → Stracciatella.
- `price: 0` on Chocolate soufflé, Kataifi, Banoffi, Fruit salad — currently
  shown as `—`. Set real prices when ready.
