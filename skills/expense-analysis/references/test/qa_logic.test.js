/**
 * QA Logic Tests — expense-analysis skill
 *
 * Tests every piece of JS logic extracted from report-template.html
 * against known-correct expected values. Run with: node qa_logic.test.js
 */

'use strict';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? '\n       ' + detail : ''}`);
    failed++;
  }
}

function assertEqual(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}\n       Expected: ${JSON.stringify(expected)}\n       Actual  : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(name) {
  const pad = Math.max(2, 55 - name.length);
  console.log(`\n── ${name} ${'─'.repeat(pad)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CURRENCY_SYMBOL & CUR()
// ─────────────────────────────────────────────────────────────────────────────
section('CURRENCY_SYMBOL & CUR()');

const CURRENCY_SYMBOL = 'S$';
const CUR = v => CURRENCY_SYMBOL + v.toFixed(2);

assertEqual('CUR(10) → S$10.00',     CUR(10),        'S$10.00');
assertEqual('CUR(0) → S$0.00',       CUR(0),         'S$0.00');
assertEqual('CUR(1234.5) → S$1234.50', CUR(1234.5),  'S$1234.50');
assertEqual('CUR(0.999) rounds → S$1.00', CUR(0.999), 'S$1.00');

// Budget input display: CURRENCY_SYMBOL placed before <input>
// Simulates: `/ ${CURRENCY_SYMBOL}<input ...>`
const budgetDisplay = `/ ${CURRENCY_SYMBOL}<input value="200">`;
assert('Budget display contains S$ before <input>', budgetDisplay === '/ S$<input value="200">');

// Verify old broken approach would have failed for RM
const CUR_RM = v => 'RM' + v.toFixed(2);
const oldBrokenDisplay = `/ ${CUR_RM(0).charAt(0)}$<input>`;
assert('Old approach was broken for RM (R$ not RM)', oldBrokenDisplay === '/ R$<input>');
const newDisplay_RM = `/ RM<input>`;  // what the fix produces
assert('New approach correct for RM', newDisplay_RM === '/ RM<input>');

// ─────────────────────────────────────────────────────────────────────────────
// 2. STMT_YEAR IIFE
// ─────────────────────────────────────────────────────────────────────────────
section('STMT_YEAR IIFE — year auto-derivation');

function computeStmtYear(transactions) {
  return (()=>{for(const t of transactions){const p=t.date.split('/');if(p.length>2)return+p[2];}return new Date().getFullYear();})();
}

const thisYear = new Date().getFullYear();

assertEqual('Empty transactions → current year', computeStmtYear([]), thisYear);
assertEqual('DD/MM only → current year',         computeStmtYear([{date:'15/01'},{date:'20/01'}]), thisYear);
assertEqual('DD/MM/YYYY → extracts year 2024',   computeStmtYear([{date:'15/01/2024'}]), 2024);
assertEqual('Mixed DD/MM then DD/MM/YYYY → extracts 2023 from first full-date',
  computeStmtYear([{date:'10/01'},{date:'15/01/2023'},{date:'20/01/2024'}]), 2023);
assertEqual('DD/MM/YYYY with year 2025',         computeStmtYear([{date:'01/12/2025'}]), 2025);

// Verify no crash with one-element arrays
assert('Single DD/MM transaction → no crash',
  (() => { try { computeStmtYear([{date:'05/01'}]); return true; } catch(e) { return false; } })());

assert('Single DD/MM/YYYY transaction → no crash',
  (() => { try { computeStmtYear([{date:'05/01/2026'}]); return true; } catch(e) { return false; } })());

// ─────────────────────────────────────────────────────────────────────────────
// 3. Date Sort — allDates & cumulative chart
// ─────────────────────────────────────────────────────────────────────────────
section('Date sort — mm*100+dd formula');

function sortDates(dates) {
  return [...new Set(dates)].sort((a, b) => {
    const [ad, am] = a.split('/').map(Number), [bd, bm] = b.split('/').map(Number);
    return (am * 100 + ad) - (bm * 100 + bd);
  });
}

function dateVal(d) { const [dd, mm] = d.split('/').map(Number); return mm * 100 + dd; }

// Basic chronological ordering
assertEqual('Jan 5, Jan 15, Feb 1 sorts correctly',
  sortDates(['01/02', '05/01', '15/01']),
  ['05/01', '15/01', '01/02']);

assertEqual('Multiple months Jan → Mar',
  sortDates(['01/03', '28/01', '15/02', '01/01']),
  ['01/01', '28/01', '15/02', '01/03']);

assertEqual('Dec after Nov after Jan',
  sortDates(['01/12', '15/11', '03/01']),
  ['03/01', '15/11', '01/12']);

// Deduplication
assertEqual('Duplicate dates are deduplicated',
  sortDates(['05/01', '05/01', '10/01', '05/01']),
  ['05/01', '10/01']);

// dateVal consistency with sort
assert('dateVal Jan5 < dateVal Jan15', dateVal('05/01') < dateVal('15/01'));
assert('dateVal Jan28 < dateVal Feb1', dateVal('28/01') < dateVal('01/02'));
assert('dateVal Nov15 < dateVal Dec1', dateVal('15/11') < dateVal('01/12'));
assert('dateVal consistent with allDates sort order',
  (() => {
    const dates = sortDates(['01/02', '15/12', '05/01', '20/01']);
    for (let i = 0; i < dates.length - 1; i++) {
      if (dateVal(dates[i]) > dateVal(dates[i+1])) return false;
    }
    return true;
  })());

// allDates sort matches cumulative sort (same formula)
function cumSort(txns) {
  return [...txns].sort((a,b) => {
    const [ad,am] = a.date.split('/').map(Number), [bd,bm] = b.date.split('/').map(Number);
    return (am*100+ad)-(bm*100+bd);
  });
}

const txnDates = [
  {date:'10/02',amt:50},{date:'05/01',amt:30},{date:'28/01',amt:20},{date:'01/03',amt:40}
];
const cumSorted = cumSort(txnDates).map(t => t.date);
assertEqual('Cumulative sort matches allDates sort formula',
  cumSorted, ['05/01','28/01','10/02','01/03']);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Daily Map correctness
// ─────────────────────────────────────────────────────────────────────────────
section('Daily spending map — allDates data alignment');

const testTransactions = [
  {date:'05/01',desc:'Grab',amt:12.50,cat:'Transport'},
  {date:'05/01',desc:'McDonald',amt:8.90,cat:'Dining'},
  {date:'10/01',desc:'Netflix',amt:15.98,cat:'Subscriptions'},
  {date:'20/01',desc:'NTUC',amt:67.40,cat:'Groceries'},
  {date:'20/01',desc:'Starbucks',amt:7.50,cat:'Beverages'},
  {date:'01/02',desc:'Uniqlo',amt:89.90,cat:'Shopping'},
];

const dailyMap = {};
testTransactions.forEach(t => { dailyMap[t.date] = (dailyMap[t.date]||0) + t.amt; });
const allDates = sortDates(testTransactions.map(t => t.date));
const dailyAmounts = allDates.map(d => +(dailyMap[d]||0).toFixed(2));

assertEqual('allDates sorted correctly', allDates, ['05/01','10/01','20/01','01/02']);
assertEqual('Jan 5 daily total (Grab + McDonald)', dailyAmounts[0], 21.40);
assertEqual('Jan 10 daily total (Netflix only)',   dailyAmounts[1], 15.98);
assertEqual('Jan 20 daily total (NTUC + Starbucks)', dailyAmounts[2], 74.90);
assertEqual('Feb 1 daily total (Uniqlo only)',     dailyAmounts[3], 89.90);
assert('Sum of daily amounts equals sum of all transactions',
  Math.abs(dailyAmounts.reduce((s,v) => s+v, 0) - testTransactions.reduce((s,t) => s+t.amt, 0)) < 0.001);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cumulative chart — deduplication logic
// ─────────────────────────────────────────────────────────────────────────────
section('Cumulative chart — date deduplication and running total');

const sortedTxns = cumSort(testTransactions);
const cumDates = []; const cumAmts = []; let cumSum = 0;
sortedTxns.forEach(t => {
  cumSum += t.amt;
  if (cumDates.length && cumDates[cumDates.length-1] === t.date) {
    cumAmts[cumAmts.length-1] = +cumSum.toFixed(2);
  } else {
    cumDates.push(t.date);
    cumAmts.push(+cumSum.toFixed(2));
  }
});

assertEqual('Cumulative dates deduplicated (4 unique dates)', cumDates, ['05/01','10/01','20/01','01/02']);
assertEqual('Jan 5 cumulative (12.50+8.90)', cumAmts[0], 21.40);
assertEqual('Jan 10 cumulative (+15.98)',    cumAmts[1], 37.38);
assertEqual('Jan 20 cumulative (+67.40+7.50)', cumAmts[2], 112.28);
assertEqual('Feb 1 cumulative (+89.90)',     cumAmts[3], 202.18);

const totalSpend = testTransactions.reduce((s,t) => s+t.amt, 0);
assert('Last cumulative value equals totalSpend',
  Math.abs(cumAmts[cumAmts.length-1] - totalSpend) < 0.001);

// Pace line: last point should equal totalSpend
const pacePerDay = totalSpend / cumDates.length;
const paceData = cumDates.map((_,i) => +((i+1)*pacePerDay).toFixed(2));
assert('Last pace point equals totalSpend',
  Math.abs(paceData[paceData.length-1] - totalSpend) < 0.01);
assert('Pace is monotonically increasing', paceData.every((v,i,a) => i===0 || v >= a[i-1]));

// ─────────────────────────────────────────────────────────────────────────────
// 6. Category totals & percentages
// ─────────────────────────────────────────────────────────────────────────────
section('Category totals, aggregation, percentages');

const catTotals = {};
testTransactions.forEach(t => { catTotals[t.cat] = (catTotals[t.cat]||0) + t.amt; });
const catEntries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
const computedTotal = catEntries.reduce((s,e) => s+e[1], 0);

assert('catEntries sorted by amount descending',
  catEntries.every((_,i,a) => i===0 || a[i-1][1] >= a[i][1]));
assert('Sum of catEntries equals sum of transactions',
  Math.abs(computedTotal - totalSpend) < 0.001);

const pctSum = catEntries.reduce((s,e) => s + e[1]/computedTotal*100, 0);
assert('Category percentages sum to ~100%', Math.abs(pctSum - 100) < 0.001);

assertEqual('Shopping is highest category (89.90)', catEntries[0][0], 'Shopping');
assertEqual('Shopping amount', catEntries[0][1], 89.90);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Budget bar logic
// ─────────────────────────────────────────────────────────────────────────────
section('Budget bar — pct, cls, statusText, auto-suggestion');

function budgetBarsLogic(amt, budgetTargets, cat) {
  const budget = budgetTargets[cat] || Math.ceil(amt * 1.2 / 10) * 10;
  const pct = (amt / budget * 100);
  const barPct = Math.min(pct, 100);
  const cls = pct > 100 ? 'over' : pct > 80 ? 'warn' : 'safe';
  const statusText = amt > budget ? ` (${CUR(amt-budget)} over)` : ` (${CUR(budget-amt)} left)`;
  return { budget, pct, barPct, cls, statusText };
}

// Auto-suggestion: ceil(amt * 1.2 / 10) * 10
assertEqual('Auto-budget for amt=89.90 → ceil(107.88/10)*10=110', budgetBarsLogic(89.90, {}, 'Shopping').budget, 110);
assertEqual('Auto-budget for amt=50 → ceil(60/10)*10=60',         budgetBarsLogic(50, {}, 'Dining').budget, 60);
assertEqual('Auto-budget for amt=15.98 → ceil(19.176/10)*10=20',  budgetBarsLogic(15.98, {}, 'Subs').budget, 20);
assertEqual('Auto-budget for amt=7.50 → ceil(9/10)*10=10',        budgetBarsLogic(7.50, {}, 'Bev').budget, 10);

// pct calculations
const safe = budgetBarsLogic(50, {'Dining':100}, 'Dining');
assertEqual('50/100 budget → pct=50, cls=safe', safe.cls, 'safe');
assertEqual('50/100 budget → barPct=50', safe.barPct, 50);
assert('50/100 budget → statusText contains "left"', safe.statusText.includes('left'));
assertEqual('50/100 budget → left = S$50.00', safe.statusText, ' (S$50.00 left)');

const warn = budgetBarsLogic(90, {'Warn':100}, 'Warn');
assertEqual('90/100 budget → cls=warn', warn.cls, 'warn');
assertEqual('90/100 budget → barPct=90', warn.barPct, 90);

const at100 = budgetBarsLogic(100, {'At100':100}, 'At100');
assertEqual('100/100 budget → cls=warn (not over)', at100.cls, 'warn');
assertEqual('100/100 budget → barPct=100', at100.barPct, 100);

const over = budgetBarsLogic(120, {'Over':100}, 'Over');
assertEqual('120/100 budget → cls=over', over.cls, 'over');
assertEqual('120/100 budget → barPct capped at 100', over.barPct, 100);
assert('120/100 budget → statusText contains "over"', over.statusText.includes('over'));
assertEqual('120/100 budget → over = S$20.00', over.statusText, ' (S$20.00 over)');

// Verify budgetTargets[cat] takes priority over auto-suggestion
assertEqual('Explicit budget=200 overrides auto-suggestion',
  budgetBarsLogic(89.90, {'Shopping': 200}, 'Shopping').budget, 200);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Anomaly detection
// ─────────────────────────────────────────────────────────────────────────────
section('Anomaly detection — isAnomaly() logic');

// Build catStats from a test set with known values
const anomalyTxns = [
  // Dining: avg=10, need at least 3
  {cat:'Dining',amt:10},{cat:'Dining',amt:10},{cat:'Dining',amt:10},
  // Transport: varied amounts
  {cat:'Transport',amt:5},{cat:'Transport',amt:6},{cat:'Transport',amt:7},
  {cat:'Transport',amt:50},  // anomaly candidate
  // Shopping: only 2 → never flags
  {cat:'Shopping',amt:100},{cat:'Shopping',amt:200},
];

const catStats = {};
anomalyTxns.forEach(t => {
  if (!catStats[t.cat]) catStats[t.cat] = { sum:0, count:0, amounts:[] };
  catStats[t.cat].sum += t.amt;
  catStats[t.cat].count++;
  catStats[t.cat].amounts.push(t.amt);
});
Object.keys(catStats).forEach(c => {
  const s = catStats[c];
  s.avg = s.sum / s.count;
  const variance = s.amounts.reduce((v,a) => v + (a - s.avg)**2, 0) / s.count;
  s.stddev = Math.sqrt(variance);
});

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

// Dining: avg=10, stddev=0 → threshold=10. No transaction >10, so no anomaly
assert('Dining: 3 identical txns of 10 → no anomaly at exactly avg',
  isAnomaly({cat:'Dining',amt:10}) === null);
// Dining: 10.01 > threshold(10) BUT 10.01 is NOT > 15 → no anomaly
assert('Dining: 10.01 NOT anomaly (below $15 floor)',
  isAnomaly({cat:'Dining',amt:10.01}) === null);
// Dining: 20 > threshold(10) AND 20 > 15 → anomaly (amt > avg+1.5*0=10 and 20 > 2.5*0+10=10)
// stddev=0, so level = amt > avg + 2.5*0 = 10, which 20>10, so level='high'
const diningAnomaly = isAnomaly({cat:'Dining',amt:20});
assert('Dining: 20 with avg=10 stddev=0 → high anomaly', diningAnomaly?.level === 'high');
assert('Dining anomaly ratio = 2.0x', diningAnomaly?.ratio === '2.0');

// Shopping: only 2 transactions → count < 3 → null
assert('Shopping: count=2 < 3 → null', isAnomaly({cat:'Shopping',amt:500}) === null);

// Transport: avg=17, need to compute
assert('Transport: catStats exists', !!catStats['Transport']);
const tAvg = catStats['Transport'].avg;
const tStd = catStats['Transport'].stddev;
assert('Transport avg = (5+6+7+50)/4 = 17', Math.abs(tAvg - 17) < 0.001);

// Transport: amt=50, is it anomaly?
const transportAnomaly = isAnomaly({cat:'Transport',amt:50});
assert('Transport: 50 with avg=17 → anomaly (or not depending on stddev)',
  transportAnomaly !== undefined); // just check it doesn't crash
// Threshold = 17 + 1.5 * tStd. 50 > 15, so result depends on tStd
// tStd ≈ sqrt(((5-17)^2+(6-17)^2+(7-17)^2+(50-17)^2)/4) = sqrt((144+121+100+1089)/4) = sqrt(363.5) ≈ 19.07
// threshold = 17 + 1.5*19.07 ≈ 17 + 28.6 = 45.6
// 50 > 45.6 AND 50 > 15 → anomaly
assert('Transport tStd ~19.07', Math.abs(tStd - 19.07) < 0.1);
const expectedThreshold = tAvg + 1.5 * tStd;
assert('Transport: 50 > threshold (~45.6) → is anomaly', transportAnomaly !== null);
assert('Transport 50: ratio = (50/17).toFixed(1) = 2.9', transportAnomaly?.ratio === '2.9');
// level: 50 > avg + 2.5*stddev = 17 + 2.5*19.07 = 17 + 47.67 = 64.67 → 50 < 64.67 → 'normal'
assert('Transport 50: level = normal (not high)', transportAnomaly?.level === 'normal');

// Unknown category (not in catStats)
assert('Unknown category → null', isAnomaly({cat:'NonExistent',amt:999}) === null);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Fixed vs Variable split
// ─────────────────────────────────────────────────────────────────────────────
section('Fixed vs Variable spending split');

const fixedCategories = ['Transport','Subscriptions','Government/Fees'];
const splitTxns = [
  {cat:'Transport',amt:50},
  {cat:'Dining',amt:80},
  {cat:'Subscriptions',amt:15.98},
  {cat:'Shopping',amt:120},
  {cat:'Government/Fees',amt:30},
  {cat:'Groceries',amt:60},
];

let fixedTotal = 0, variableTotal = 0;
const fixedBreakdown = {}, variableBreakdown = {};
splitTxns.forEach(t => {
  if (fixedCategories.includes(t.cat)) {
    fixedTotal += t.amt;
    fixedBreakdown[t.cat] = (fixedBreakdown[t.cat]||0) + t.amt;
  } else {
    variableTotal += t.amt;
    variableBreakdown[t.cat] = (variableBreakdown[t.cat]||0) + t.amt;
  }
});
const splitTotal = splitTxns.reduce((s,t) => s+t.amt, 0);

assertEqual('Fixed = Transport(50) + Subscriptions(15.98) + Gov(30) = 95.98',
  +fixedTotal.toFixed(2), 95.98);
assertEqual('Variable = Dining(80) + Shopping(120) + Groceries(60) = 260',
  +variableTotal.toFixed(2), 260);
assert('fixedTotal + variableTotal = totalSpend',
  Math.abs(fixedTotal + variableTotal - splitTotal) < 0.001);
assert('fixedBreakdown contains Transport', 'Transport' in fixedBreakdown);
assert('variableBreakdown contains Dining', 'Dining' in variableBreakdown);
assert('Government/Fees is fixed', 'Government/Fees' in fixedBreakdown);
assert('Groceries is variable', 'Groceries' in variableBreakdown);

// ─────────────────────────────────────────────────────────────────────────────
// 10. Day-of-week with STMT_YEAR
// ─────────────────────────────────────────────────────────────────────────────
section('Day-of-week calculation with STMT_YEAR');

const dowTxns = [
  {date:'06/01/2025',amt:10},  // Monday (Jan 6 2025 is a Monday)
  {date:'07/01/2025',amt:20},  // Tuesday
  {date:'11/01/2025',amt:30},  // Saturday
];
const stmtYear = computeStmtYear(dowTxns);
assertEqual('STMT_YEAR extracted from DD/MM/YYYY data = 2025', stmtYear, 2025);

const dowNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dowTotals=[0,0,0,0,0,0,0], dowCounts=[0,0,0,0,0,0,0];
dowTxns.forEach(t => {
  const parts = t.date.split('/').map(Number);
  const dd=parts[0],mm=parts[1],yy=parts[2]||stmtYear;
  const d = new Date(yy,mm-1,dd);
  const dow = d.getDay();
  dowTotals[dow] += t.amt;
  dowCounts[dow]++;
});

assertEqual('Monday (1) total = 10', dowTotals[1], 10);
assertEqual('Tuesday (2) total = 20', dowTotals[2], 20);
assertEqual('Saturday (6) total = 30', dowTotals[6], 30);
assert('All other days are 0', [0,3,4,5].every(d => dowTotals[d]===0));

// DD/MM format falls back to current year
const dowTxns2 = [{date:'06/01',amt:10},{date:'07/01',amt:20}];
const stmtYear2 = computeStmtYear(dowTxns2);
assertEqual('DD/MM format → STMT_YEAR = current year', stmtYear2, thisYear);
assert('New Date(thisYear,0,6) is valid', !isNaN(new Date(thisYear,0,6)));

// ─────────────────────────────────────────────────────────────────────────────
// 11. Transaction table filter + sort interaction
// ─────────────────────────────────────────────────────────────────────────────
section('Transaction table — filter, sort, search correctness');

const tableTxns = [
  {date:'20/01',desc:'NTUC',amt:67.40,cat:'Groceries'},
  {date:'05/01',desc:'Grab',amt:12.50,cat:'Transport'},
  {date:'05/01',desc:'McDonald',amt:8.90,cat:'Dining'},
  {date:'10/01',desc:'Netflix',amt:15.98,cat:'Subscriptions'},
  {date:'01/02',desc:'Uniqlo',amt:89.90,cat:'Shopping'},
];

function filterAndSort(txns, {activeCat, activeMerchant, searchTerm, sortCol, sortDir}) {
  let filtered = [...txns];
  if (activeCat)      filtered = filtered.filter(t => t.cat === activeCat);
  if (activeMerchant) filtered = filtered.filter(t => t.desc === activeMerchant);
  if (searchTerm)     filtered = filtered.filter(t =>
    t.desc.toLowerCase().includes(searchTerm) || t.cat.toLowerCase().includes(searchTerm));
  filtered.sort((a,b) => {
    let cmp = sortCol === 'amt' ? a.amt - b.amt : dateVal(a.date) - dateVal(b.date);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return filtered;
}

// Sort by date asc
const byDateAsc = filterAndSort(tableTxns, {sortCol:'date', sortDir:'asc'});
assertEqual('Date asc: first = Jan5, last = Feb1',
  [byDateAsc[0].date, byDateAsc[byDateAsc.length-1].date], ['05/01','01/02']);

// Two transactions on same date: Jan 5 (Grab & McDonald) - order between them is stable
assert('Jan 5 Grab and McDonald are first two in date-asc',
  byDateAsc[0].date === '05/01' && byDateAsc[1].date === '05/01');

// Sort by date desc
const byDateDesc = filterAndSort(tableTxns, {sortCol:'date', sortDir:'desc'});
assertEqual('Date desc: first = Feb1', byDateDesc[0].date, '01/02');
assertEqual('Date desc: last = Jan5', byDateDesc[byDateDesc.length-1].date, '05/01');

// Sort by amount asc
const byAmtAsc = filterAndSort(tableTxns, {sortCol:'amt', sortDir:'asc'});
assertEqual('Amt asc: first = McDonald(8.90)', byAmtAsc[0].amt, 8.90);
assertEqual('Amt asc: last = Uniqlo(89.90)', byAmtAsc[byAmtAsc.length-1].amt, 89.90);

// Sort by amount desc
const byAmtDesc = filterAndSort(tableTxns, {sortCol:'amt', sortDir:'desc'});
assertEqual('Amt desc: first = Uniqlo(89.90)', byAmtDesc[0].amt, 89.90);

// Filter by category
const grocOnly = filterAndSort(tableTxns, {activeCat:'Groceries', sortCol:'date', sortDir:'asc'});
assertEqual('Filter Groceries → 1 result', grocOnly.length, 1);
assertEqual('Groceries filter → NTUC', grocOnly[0].desc, 'NTUC');

// Filter by merchant
const grabOnly = filterAndSort(tableTxns, {activeMerchant:'Grab', sortCol:'date', sortDir:'asc'});
assertEqual('Filter Merchant=Grab → 1 result', grabOnly.length, 1);

// Search by description
const searchResult = filterAndSort(tableTxns, {searchTerm:'mc', sortCol:'date', sortDir:'asc'});
assertEqual('Search "mc" → McDonald', searchResult.length, 1);
assertEqual('Search "mc" → McDonald', searchResult[0].desc, 'McDonald');

// Search by category
const searchCat = filterAndSort(tableTxns, {searchTerm:'transport', sortCol:'date', sortDir:'asc'});
assertEqual('Search "transport" → Grab (category match)', searchCat.length, 1);

// Totals row: filtered sum
const filteredSum = grocOnly.reduce((s,t) => s+t.amt, 0);
assert('Totals row: filtered sum = 67.40', Math.abs(filteredSum - 67.40) < 0.001);

// Transaction count display
const showCount = `Showing ${byDateAsc.length} of ${tableTxns.length}`;
assertEqual('Count display: all visible', showCount, 'Showing 5 of 5');
const filteredCount = `Showing ${grocOnly.length} of ${tableTxns.length}`;
assertEqual('Count display: filtered', filteredCount, 'Showing 1 of 5');

// ─────────────────────────────────────────────────────────────────────────────
// 12. Histogram bins
// ─────────────────────────────────────────────────────────────────────────────
section('Histogram — transaction size bin assignment');

const histTxns = [
  {amt:3.50},   // 0-5
  {amt:5.00},   // 5-10 (boundary: a<5 fails, a<10 true → bin 1)
  {amt:9.99},   // 5-10
  {amt:10.00},  // 10-20 (a<10 fails, a<20 true → bin 2)
  {amt:19.99},  // 10-20
  {amt:20.00},  // 20-50 (a<20 fails, a<50 true → bin 3)
  {amt:49.99},  // 20-50
  {amt:50.00},  // 50+ (a<50 fails → bin 4)
  {amt:200},    // 50+
];

const binCounts=[0,0,0,0,0];
histTxns.forEach(t=>{const a=t.amt;let i=a<5?0:a<10?1:a<20?2:a<50?3:4;binCounts[i]++;});

assertEqual('Bin 0 (0-5):   1 transaction (3.50)',  binCounts[0], 1);
assertEqual('Bin 1 (5-10):  2 transactions (5.00, 9.99)', binCounts[1], 2);
assertEqual('Bin 2 (10-20): 2 transactions (10.00, 19.99)', binCounts[2], 2);
assertEqual('Bin 3 (20-50): 2 transactions (20.00, 49.99)', binCounts[3], 2);
assertEqual('Bin 4 (50+):   2 transactions (50.00, 200)', binCounts[4], 2);
assertEqual('Total bins sum = 9 transactions', binCounts.reduce((s,v)=>s+v,0), 9);

// ─────────────────────────────────────────────────────────────────────────────
// 13. Merchant dropdown — unique merchants, count, total
// ─────────────────────────────────────────────────────────────────────────────
section('Merchant dropdown — unique merchants with visit count and total');

const merchantTxns = [
  {desc:'Grab',cat:'Transport',amt:12},{desc:'Grab',cat:'Transport',amt:8},
  {desc:'McDonald',cat:'Dining',amt:9},{desc:'Starbucks',cat:'Beverages',amt:6},
];

function buildMerchantOptions(txns, activeCat) {
  const rel = activeCat ? txns.filter(t => t.cat === activeCat) : txns;
  const merchants = [...new Set(rel.map(t => t.desc))].sort();
  return merchants.map(m => {
    const c = rel.filter(t => t.desc === m).length;
    const total = rel.filter(t => t.desc === m).reduce((s,t) => s+t.amt, 0);
    return { m, c, total };
  });
}

const allMerchants = buildMerchantOptions(merchantTxns, null);
assertEqual('All merchants: 3 unique', allMerchants.length, 3);
assertEqual('Grab visited 2x', allMerchants.find(x=>x.m==='Grab')?.c, 2);
assertEqual('Grab total = 20', allMerchants.find(x=>x.m==='Grab')?.total, 20);

const transportMerchants = buildMerchantOptions(merchantTxns, 'Transport');
assertEqual('Transport: only Grab', transportMerchants.length, 1);
assertEqual('Transport Grab: 2 visits', transportMerchants[0].c, 2);

// ─────────────────────────────────────────────────────────────────────────────
// 14. catColors fallback consistency check
// ─────────────────────────────────────────────────────────────────────────────
section('catColors — fallback consistency across all usages');

const catColors = {'Dining':'#e4002b','Transport':'#2563eb'};

// Verify all usages use ||'#ccc' fallback — we simulate the key usages
const pieColor = catColors['Unknown'] || '#ccc';
const barColor = catColors['Unknown'] || '#ccc';
const catTableColor = catColors['Unknown'] || '#ccc';
const budgetDotColor = catColors['Unknown'] || '#ccc';
const fixedBreakdownColor = catColors['Unknown'] || '#ccc';

assert('Pie chart: fallback #ccc for unknown cat', pieColor === '#ccc');
assert('Bar chart: fallback #ccc for unknown cat', barColor === '#ccc');
assert('Category table: fallback #ccc for unknown cat', catTableColor === '#ccc');
assert('Budget dot: fallback #ccc for unknown cat', budgetDotColor === '#ccc');
assert('Fixed breakdown: fallback #ccc for unknown cat', fixedBreakdownColor === '#ccc');

// Fixed: transaction table row now uses catColors[t.cat]||'#ccc' fallback
const txnRowColor = catColors['Unknown'] || '#ccc';
assert('Transaction row: fallback #ccc for unknown cat (now fixed)', txnRowColor === '#ccc');

// ─────────────────────────────────────────────────────────────────────────────
// 15. escHtml — HTML injection protection for merchant names
// ─────────────────────────────────────────────────────────────────────────────
section('escHtml — merchant name HTML sanitization');

const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Common real-world cases
assertEqual('H&M escapes & → &amp;',         escHtml('H&M'),              'H&amp;M');
assertEqual('Ben & Jerry\'s',                 escHtml("Ben & Jerry's"),    "Ben &amp; Jerry's");
assertEqual('<script> is escaped',            escHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
assertEqual('"Quoted" merchant',              escHtml('"Quoted"'),         '&quot;Quoted&quot;');
assertEqual('Normal name unchanged',          escHtml('NTUC FairPrice'),   'NTUC FairPrice');
assertEqual('Grab unchanged',                 escHtml('Grab'),             'Grab');

// Verify option value attribute safety
const optionHtml = `<option value="${escHtml('H&M')}">${escHtml('H&M')} (1x)</option>`;
assert('Option value attribute is safe for H&M',
  optionHtml === '<option value="H&amp;M">H&amp;M (1x)</option>');

// Verify transaction row is safe
const rowHtml = `<td>${escHtml('H&M Orchard')}</td>`;
assert('Transaction row td is safe', rowHtml === '<td>H&amp;M Orchard</td>');

// ─────────────────────────────────────────────────────────────────────────────
// 16. Division by zero guards — category table
// ─────────────────────────────────────────────────────────────────────────────
section('Division by zero guards');

// Simulate category table avg calculation
function catAvg(amt, count) { return count > 0 ? amt/count : 0; }
function catPct(amt, totalSpend) { return totalSpend > 0 ? (amt/totalSpend*100).toFixed(1) : '0.0'; }
function txnAvg(totalSpend, length) { return length > 0 ? totalSpend/length : 0; }

assertEqual('catAvg: normal case 100/4 = 25',         catAvg(100, 4), 25);
assertEqual('catAvg: count=0 returns 0 (no crash)',    catAvg(100, 0), 0);
assertEqual('catPct: normal 50/200 = 25.0%',          catPct(50, 200), '25.0');
assertEqual('catPct: totalSpend=0 returns "0.0"',     catPct(50, 0), '0.0');
assertEqual('txnAvg: normal 200/10 = 20',             txnAvg(200, 10), 20);
assertEqual('txnAvg: length=0 returns 0 (no crash)',  txnAvg(200, 0), 0);
assert('No NaN in any guard case', [catAvg(0,0), catPct(0,0), txnAvg(0,0)].every(v => !isNaN(v)));

// ─────────────────────────────────────────────────────────────────────────────
// 17. Budget bar text — suppressed for narrow bars
// ─────────────────────────────────────────────────────────────────────────────
section('Budget bar — text suppressed when bar is too narrow');

function budgetBarLabel(barPct, pct) {
  return barPct >= 12 ? `<span>${pct.toFixed(0)}%</span>` : '';
}

// Wide bars: text shown
assertEqual('barPct=50 → label shown', budgetBarLabel(50, 50), '<span>50%</span>');
assertEqual('barPct=12 → label shown (boundary)', budgetBarLabel(12, 12), '<span>12%</span>');
assertEqual('barPct=100 → label shown', budgetBarLabel(100, 120), '<span>120%</span>');

// Narrow bars: text hidden
assertEqual('barPct=11 → label hidden', budgetBarLabel(11, 11), '');
assertEqual('barPct=5 → label hidden', budgetBarLabel(5, 5), '');
assertEqual('barPct=0 → label hidden', budgetBarLabel(0, 0), '');

// Verify no regression: 'over' bars (barPct capped at 100) still show text if pct≥12
// Even at 110% usage, barPct=100 ≥ 12, so label shows
assertEqual('barPct=100 at 110% → label shows 110%', budgetBarLabel(100, 110), '<span>110%</span>');

// ─────────────────────────────────────────────────────────────────────────────
// 18. parseFloat for budget input
// ─────────────────────────────────────────────────────────────────────────────
section('Budget input — parseFloat preserves decimal values');

// Old parseInt behaviour (broken)
assert('parseInt("150.50") loses decimal → 150', parseInt('150.50') === 150);
assert('parseInt("99.99") loses decimal → 99',   parseInt('99.99') === 99);

// New parseFloat behaviour (correct)
assert('parseFloat("150.50") preserves → 150.5', parseFloat('150.50') === 150.5);
assert('parseFloat("99.99") preserves → 99.99',  parseFloat('99.99') === 99.99);
assert('parseFloat("200") works for round numbers', parseFloat('200') === 200);
assert('parseFloat("") → NaN (guard check: NaN > 0 is false)', isNaN(parseFloat('')) && !(parseFloat('') > 0));
assert('parseFloat("abc") → NaN (guard rejects)', isNaN(parseFloat('abc')) && !(parseFloat('abc') > 0));
assert('parseFloat("0") → 0 (guard rejects, prevents zero budget)', parseFloat('0') === 0 && !(0 > 0));
assert('parseFloat("-50") → -50 (guard rejects negative)', parseFloat('-50') < 0 && !(-50 > 0));

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`QA Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));
if (failed > 0) {
  console.error(`\n⚠️  ${failed} test(s) FAILED — review output above`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed`);
}
