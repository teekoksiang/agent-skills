---
name: expense-analysis
description: >
  Generate interactive HTML expense analysis reports from credit card statement PDFs. Use this skill whenever the user uploads a credit card statement, bank statement, or expense PDF and wants to analyze spending, categorize expenses, visualize spending patterns, or get optimization tips. Also trigger when users ask to "analyze my expenses", "review my credit card bill", "break down my spending", "where is my money going", or share any financial statement PDF wanting insights. Works with any bank or credit card issuer worldwide — OCBC, DBS, UOB, Chase, Citi, HSBC, Amex, etc. Make sure to use this skill whenever a credit card PDF is uploaded alongside questions about spending, budgeting, or saving money, even if the user doesn't explicitly say "analysis" or "report".
---

# Expense Analysis — Interactive Report Generator

## What This Skill Does

Takes a financial statement PDF (credit card, bank account, or any expense statement from any institution worldwide) and produces a polished, self-contained interactive HTML report with:

- Statement overview with key metrics and month-over-month comparisons
- Data-driven spending insights
- 8 interactive charts (Chart.js 4.4.1)
- Category breakdown table with editable budget targets
- Filterable/sortable transaction table with anomaly detection
- Actionable optimization recommendations with Quick Wins

The report is a single HTML file — no server needed, print-friendly. Charts require an internet connection on first load (Chart.js is loaded from CDN) but are cached by the browser for subsequent views.

## Critical Rule: No Hardcoded Values

This is the single most important rule in the entire skill. Every number that appears in the HTML body text — in Key Insights, Action Plan, summary cards, savings estimates, Quick Wins — must be **computed from the transaction data** or **verified against it** before being written.

The reason this matters: during iterative development, transaction data often changes (new transactions get added, categories get reassigned, amounts get corrected). If you write a number like "S$197.22" in the HTML text but the actual sum of dining transactions is S$241.82, you've introduced a discrepancy that's hard to catch. This happened repeatedly during QA of the first report built with this skill, so the lesson is burned in.

**How to avoid it:**

1. After extracting all transactions, compute every aggregate (category totals, counts, averages, top merchants, etc.) in Python first.
2. Write the HTML body text using these computed values — never type a dollar amount from memory.
3. For the Action Plan and Quick Wins, calculate savings estimates from the computed category totals, not from rough mental estimates.
4. Cross-check: after generating the complete HTML file, run a verification pass that extracts all `S$` values from the HTML body text and confirms each one matches the transaction data. This catches copy-paste errors and stale values.
5. The JavaScript `transactions` array is the source of truth. Charts and tables are computed dynamically from it. But Key Insights, Action Plan text, and summary card HTML are static — they must match the dynamic values.

## Step-by-Step Workflow

### 1. Extract Transactions from the PDF

Use `pdfplumber` (preferred) or `pypdf` to extract text from the statement PDF. Credit card statements vary wildly in format, so be adaptive:

```python
import pdfplumber

with pdfplumber.open("statement.pdf") as pdf:
    full_text = ""
    for page in pdf.pages:
        full_text += page.extract_text() + "\n"
```

After extracting raw text, parse it to identify:

- **Card name / issuer** (e.g., "OCBC Infinity Cashback", "DBS Live Fresh", "Chase Sapphire")
- **Statement period** (start date – end date)
- **Card number** (last 4 digits only)
- **Statement date**
- **Statement month** — a short human-readable label for the billing cycle, e.g. "January 2025" or "Dec 2024 – Jan 2025". Used in the sticky mini-header (`<!-- STATEMENT_MONTH -->`).
- **Total amount due** (or minimum payment, previous balance, etc.)
- **Each transaction**: date, description/merchant name, amount, and whether it's a debit (purchase) or credit (payment/refund)

Tips for parsing different statement formats:

- Look for patterns like `DD/MM/YYYY` or `MM/DD/YYYY` or `DD MMM YYYY` followed by description and amount
- Amounts are usually right-aligned or at the end of lines, often with currency symbols
- Distinguish between purchases (positive) and payments/refunds (negative/credit)
- Some statements have multi-line descriptions — join them
- Filter out summary lines, interest charges headers, and non-transaction rows
- If the statement has foreign currency transactions, note the local currency equivalent

### 2. Categorize Transactions

Assign each transaction to a spending category. Use merchant name keywords to classify. Start with these categories and adapt based on what you find in the data:

| Category | Example Keywords |
|---|---|
| Dining | restaurant, cafe, mcdonald, subway, hawker, food, bakery, kopitiam |
| Transport | bus, mrt, grab, uber, taxi, parking, fuel, petrol, causeway, transit |
| Groceries | fairprice, ntuc, giant, cold storage, sheng siong, supermarket, 7-eleven |
| Shopping | uniqlo, zara, h&m, shopee, lazada, amazon, mall stores |
| Beverages | tea, coffee, starbucks, koi, gongcha, playmade, bubble tea |
| Subscriptions | netflix, spotify, youtube, apple, google, mobile plan |
| Government/Fees | ica, tax, fine, stamp duty, government |
| Personal Care | salon, haircut, pharmacy, watsons, guardian |
| Entertainment | cinema, movie, concert, event, ticket, gym, fitness |
| Healthcare | clinic, hospital, dental, medical, doctor |
| Utilities | electricity, water, gas, internet, broadband |
| Travel | hotel, airbnb, booking, airline, flight |

These are starting points — create new categories or merge sparse ones as needed. The goal is 5–12 meaningful categories (not too many, not too few). If a category has only 1 transaction, consider merging it with a related one.

### 3. Detect the Currency

Look at the statement to determine the currency. Common patterns:

- `S$` or `SGD` → Singapore Dollar (use `S$`)
- `RM` or `MYR` → Malaysian Ringgit (use `RM`)
- `$` or `USD` → US Dollar (use `US$` or `$`)
- `£` or `GBP` → British Pound (use `£`)
- `€` or `EUR` → Euro (use `€`)
- `HK$` or `HKD` → Hong Kong Dollar (use `HK$`)

Use the detected currency symbol consistently throughout the report — in charts, tables, cards, tooltips, and action plans.

### 4. Compute All Aggregates in Python First

Before writing any HTML, compute every number you'll need in Python and store them in variables. This is the foundation of avoiding hardcoded value errors.

```python
# Category totals, counts, averages
cat_totals = {}
cat_counts = {}
for txn in transactions:
    cat = txn['category']
    cat_totals[cat] = cat_totals.get(cat, 0) + txn['amount']
    cat_counts[cat] = cat_counts.get(cat, 0) + 1

total_spend = sum(cat_totals.values())
total_txns = len(transactions)
avg_per_txn = total_spend / total_txns

# Top repeat merchant
from collections import Counter
merchant_visits = Counter(t['description'] for t in transactions)
top_merchant = merchant_visits.most_common(1)[0]  # (name, count)
top_merchant_total = sum(t['amount'] for t in transactions if t['description'] == top_merchant[0])

# Under-$10 transactions
small_txns = [t for t in transactions if t['amount'] < 10]
small_total = sum(t['amount'] for t in small_txns)

# Per-category averages
cat_avgs = {cat: cat_totals[cat] / cat_counts[cat] for cat in cat_totals}
```

Use these variables when generating the HTML text content. Never type a number from your own mental arithmetic.

### 5. Build the HTML Report

Read the reference template at `references/report-template.html` — it contains the complete CSS, HTML structure, and JavaScript patterns you should follow. The template uses placeholder comments (like `<!-- CARD_NAME -->`) to show where dynamic data goes.

The report has 6 sections. Here is what each section needs:

#### Section 1: Statement Overview (8 summary cards in a 4-column grid)

Cards to include:

1. **Total Spending** — sum of all purchase transactions (NOT the "amount due" which may differ). Red color. If previous month data is available, include a delta tag showing % change.
2. **Amount Due** — the amount due on the statement (if available). If not distinguishable from total spending, omit.
3. **Transactions** — count of purchase transactions. With delta vs previous month if available.
4. **Avg per Transaction** — total spending / transaction count. Blue color.
5. **Avg Daily Spend** — total spending / number of days in the period. Red color. Include monthly pace in subtitle.
6. **Most Expensive Day** — the date with highest combined spending. Amber color. Note what was bought.
7. **Top Repeat Merchant** — the merchant visited most often. Purple color. Show visit count and total. If there's a tie, pick the one with the higher total spend.
8. **Cash Rebate / Rewards** — estimated cashback at ~1% if the card type suggests cashback, or omit if not applicable. Green color.

For multi-month comparison: if the user provides multiple statements, or if you can extract previous month's total from the statement (some statements show this), add delta tags using these CSS classes:
- `.delta-tag.up` (red) — for increases
- `.delta-tag.down` (green) — for decreases
- `.delta-note` — for "vs X in Jan cycle" type text

#### Section 2: Key Insights (6 insight cards in a 2-column grid)

Generate 4–6 data-driven insights. Each must use numbers computed from the transaction data. Tag each with a severity:

- `insight-alert` (red) — areas of concern, highest spend categories
- `insight-warn` (amber) — patterns worth watching
- `insight-good` (green) — areas being managed well
- `insight-info` (blue) — interesting patterns, neutral observations

Good insights mention specific merchants, exact amounts, frequency patterns, and comparisons. Every dollar figure must match the computed aggregates.

#### Section 3: Spending Analysis (8 charts in a 2x4 grid)

Use Chart.js 4.4.1 from CDN. All charts must include the currency symbol in axes, tooltips, and labels, be responsive, and use consistent category colors.

Charts to include:

1. **Spending by Category** — doughnut chart with legend
2. **Category Breakdown** — horizontal bar chart
3. **Daily Spending Trend** — line chart with area fill, crosshair tooltip plugin
4. **Top 10 Merchants** — horizontal bar chart
5. **Spending by Day of Week** — bar chart (total + avg per transaction, dual datasets)
6. **Transaction Size Distribution** — histogram with bins (0–5, 5–10, 10–20, 20–50, 50+), dual axes (count + total amount)
7. **Cumulative Spending Over Cycle** — line chart showing actual cumulative spend vs even-pace line. Helps visualize spending bursts.
8. **Fixed vs Variable Spending** — doughnut chart splitting categories into fixed (Transport, Subscriptions, Gov/Fees) and variable (Dining, Shopping, Beverages, etc.). Include a breakdown detail list below.

**Crosshair Tooltip Plugin**: For line charts and some bar charts, add a custom Chart.js plugin that draws a vertical dashed line at the hovered point. This makes it easier to read data on charts with many points:

```javascript
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (chart.tooltip && chart.tooltip._active && chart.tooltip._active.length) {
      const ctx = chart.ctx;
      const x = chart.tooltip._active[0].element.x;
      const topY = chart.scales.y ? chart.scales.y.top : chart.chartArea.top;
      const bottomY = chart.scales.y ? chart.scales.y.bottom : chart.chartArea.bottom;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.setLineDash([4, 3]);
      ctx.stroke(); ctx.restore();
    }
  }
};
```

Use `interaction: {mode:'index', intersect:false}` on charts that benefit from crosshair behavior.

#### Section 4: Expense Breakdown by Category (table + budget targets)

**Table columns**: Category (with color dot), Items count, Amount, % of Total, Avg per transaction. Include a bold totals row.

**Budget Targets**: Below the category table, add editable budget progress bars for each category. Each row shows:
- Category name with color dot
- Progress bar (green under 80%, amber 80-100%, red over 100%)
- Actual vs target with an editable `<input type="number">` for the target
- Auto-suggested initial targets (round up the actual by ~20%)

The budget bars re-render when the user changes a target value. This is done with a `renderBudgetBars()` function.

#### Section 5: All Transactions (filterable, sortable table with anomaly detection)

Interactive features:

- **Category filter buttons** — pill-shaped toggle buttons for each category + "All"
- **Merchant dropdown** — contextual (updates based on selected category), showing visit count and total per merchant
- **Search box** — filters by description or category text
- **Anomaly toggle button** — filters to show only anomalous transactions
- **Reset All button** — clears all filters
- **Sortable columns** — Date and Amount, with ascending/descending toggle and visual arrow indicators
- **Transaction count display** — "Showing X of Y"
- **Totals row** — shows filtered count and sum

**Anomaly Detection**: Flag transactions that are significantly above normal for their category using statistical deviation:

```javascript
function isAnomaly(t) {
  const cs = catStats[t.cat];
  if (!cs || cs.count < 3) return null;
  const threshold = cs.avg + 1.5 * cs.stddev;
  if (t.amt > threshold && t.amt > 15) {
    const ratio = (t.amt / cs.avg).toFixed(1);
    return { level: t.amt > cs.avg + 2.5 * cs.stddev ? 'high' : 'normal', ratio };
  }
  return null;
}
```

Anomalous transactions get a warning badge with a hover tooltip explaining why they were flagged (shows ratio vs average, threshold used). The S$15 minimum prevents flagging cheap items.

#### Section 6: Action Plan

This is the most valuable section — make it genuinely useful, not generic. Based on the actual spending data:

- **Savings header** — green banner showing estimated total monthly savings range. This must equal the sum of all individual action card savings, not be independently estimated.
- **Action cards** (2-column grid) with 4 priority levels:
  - `high` (red) — biggest savings opportunities
  - `med` (amber) — moderate savings
  - `low` / Smart Move (blue) — financial best practices
  - `good` / Keep It Up (green) — areas already well-managed
- Each card has: priority badge, specific title with numbers, current spend figure, 3–4 checkbox-style action steps, and potential savings amount
- **Quick Wins table** — actionable items sorted by effort (easy first), with effort level and estimated monthly saving. The total row must equal the sum of individual quick wins.

The action steps should reference specific merchants and amounts from the data. Avoid generic advice like "spend less" — instead say "Replace 2 Subway visits/month with homemade sandwiches (saves ~$10)".

**Savings math must be consistent**: The savings header total should be the sum of all action card savings. The Quick Wins total should be the sum of just the quick win items (which is a subset of all actions). These are different numbers and should be labeled differently.

### 6. Navigation & UX Features

The report includes several UX enhancements (all in the template):

- **Sticky navigation bar** with anchor links to each section, with active state highlighting on scroll
- **Collapsible mini header** — when the user scrolls past the main header, a compact bar appears showing card name + key stats (total spent, amount due, transaction count)
- **"Overview" nav link** scrolls to the very top (showing full header) instead of using anchor offset
- **Scroll-to-top button** — appears after scrolling 400px
- **Scroll-margin-top** on all sections — so anchor clicks don't hide section titles behind the sticky nav
- **Print-friendly CSS** — hides nav, filters, and interactive elements
- **Responsive design** — 4→2→1 column grids at breakpoints (900px, 768px, 500px)

### 7. Data Accuracy Checklist

Before finalizing the report, verify every item on this list:

- [ ] Total spending = sum of all individual transactions (NOT the "amount due")
- [ ] Transaction count matches actual number of purchase transactions
- [ ] If "amount due" differs from total spending, show both with clear labels
- [ ] All currency symbols are consistent throughout (charts, cards, tables, tooltips, action plan)
- [ ] Category percentages sum to 100%
- [ ] Average per transaction = total / count
- [ ] No transactions were missed during PDF extraction — compare your count against the statement
- [ ] Dates are parsed correctly (watch for DD/MM vs MM/DD formats)
- [ ] Action plan savings estimates are reasonable and based on actual data
- [ ] Key Insights S$ amounts match computed category totals exactly
- [ ] Top Repeat Merchant is actually the most-visited (check for ties, pick highest total)
- [ ] Quick Wins total = sum of individual quick win items
- [ ] Savings header total = sum of all action card savings (may differ from Quick Wins total)
- [ ] All rankings (e.g., "2nd largest", "3rd highest") are correct — verify the sort order
- [ ] Under-$X transaction counts and totals match filtered sum

### 8. Post-Generation Verification Script

After writing the HTML file, run a Python verification script that:

1. Reads the HTML file
2. Extracts the transactions array from the JavaScript
3. Computes all aggregates independently
4. Extracts all currency-formatted numbers from the HTML body text (Key Insights, Action Plan, summary cards)
5. Cross-checks each extracted value against the computed truth
6. Reports any mismatches

This catches the most common class of bugs: values in prose text that don't match the actual transaction data.
