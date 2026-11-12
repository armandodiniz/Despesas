/* Despesas da Casa - lógica pura (sem DOM), usada pelo app e pelos testes */
(function (root) {
  const L = {};

  // ---------- números e datas ----------
  L.parseNum = function (v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    let s = String(v).replace(/R\$|\s/g, '').trim();
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return isNaN(n) ? NaN : n;
  };
  L.round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Datas internas sempre como texto "AAAA-MM-DD"
  L.serialToYmd = function (serial) {
    const ms = Math.round((serial - 25569) * 86400000);
    return new Date(ms).toISOString().slice(0, 10);
  };
  L.toYmd = function (v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return L.serialToYmd(v);
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return '';
  };
  L.todayYmd = function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  L.monthOf = (ymd) => (ymd || '').slice(0, 7);
  L.addMonths = function (ym, k) {
    let [y, m] = ym.split('-').map(Number);
    m += k;
    while (m > 12) { m -= 12; y++; }
    while (m < 1) { m += 12; y--; }
    return `${y}-${String(m).padStart(2, '0')}`;
  };
  L.daysBetween = function (a, b) {
    return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
  };
  L.monthLabel = function (ym, short) {
    const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const [y, m] = ym.split('-').map(Number);
    const n = nomes[m - 1] || '?';
    return short ? `${n.slice(0, 3)}/${String(y).slice(2)}` : `${n} de ${y}`;
  };
  L.norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------- linhas da planilha <-> objetos ----------
  // Despesas: ID | Data | Descrição | Categoria | Valor | Pago por | Estabelecimento | Forma | Parte P1 | Origem | Comprovante | Obs | Registrado por | Registrado em
  L.rowToExpense = function (r, rowNum) {
    r = r || [];
    let share = L.parseNum(r[8]);
    if (!isNaN(share) && share > 1) share = share / 100;
    if (typeof r[8] === 'string' && r[8].includes('%')) share = L.parseNum(r[8].replace('%', '')) / 100;
    return {
      row: rowNum,
      id: String(r[0] ?? '').trim(),
      date: L.toYmd(r[1]),
      desc: String(r[2] ?? '').trim(),
      cat: String(r[3] ?? '').trim() || 'Outros',
      value: L.parseNum(r[4]),
      payer: String(r[5] ?? '').trim(),
      store: String(r[6] ?? '').trim(),
      method: String(r[7] ?? '').trim(),
      share: isNaN(share) ? null : share,
      origin: String(r[9] ?? '').trim() || 'Planilha',
      receipt: String(r[10] ?? '').trim(),
      notes: String(r[11] ?? '').trim(),
      by: String(r[12] ?? '').trim(),
      at: r[13] ?? '',
      _raw: r,
    };
  };
  L.expenseToRow = function (e) {
    return [e.id, e.date, e.desc, e.cat, L.round2(e.value), e.payer, e.store || '', e.method || '',
      e.share === null || e.share === undefined ? '' : e.share, e.origin || 'Formulário', e.receipt || '', e.notes || '', e.by || '', e.at || ''];
  };
  // Itens: ID item | ID despesa | Data | Estabelecimento | Descrição no cupom | Produto | Classe | Marca | Qtd | Unidade | Preço unit | Preço total
  L.rowToItem = function (r, rowNum) {
    r = r || [];
    const qty = L.parseNum(r[8]);
    const unitPrice = L.parseNum(r[10]);
    const total = L.parseNum(r[11]);
    return {
      row: rowNum, id: String(r[0] ?? ''), expenseId: String(r[1] ?? ''), date: L.toYmd(r[2]),
      store: String(r[3] ?? '').trim(), raw: String(r[4] ?? ''), product: String(r[5] ?? '').trim(),
      cls: String(r[6] ?? '').trim() || 'Outros', brand: String(r[7] ?? '').trim(),
      qty: isNaN(qty) ? 1 : qty, unit: String(r[9] ?? 'un').trim() || 'un',
      unitPrice: isNaN(unitPrice) ? (isNaN(total) ? NaN : total / (isNaN(qty) || !qty ? 1 : qty)) : unitPrice,
      total: isNaN(total) ? (isNaN(unitPrice) ? NaN : unitPrice * (isNaN(qty) ? 1 : qty)) : total,
    };
  };
  L.itemToRow = (i) => [i.id, i.expenseId, i.date, i.store, i.raw || '', i.product, i.cls, i.brand || '', i.qty, i.unit, L.round2(i.unitPrice), L.round2(i.total)];
  // Acertos: ID | Mês | De | Para | Valor | Data | Obs
  L.rowToTransfer = function (r, rowNum) {
    r = r || [];
    let month = r[1];
    if (typeof month === 'number') month = L.serialToYmd(month).slice(0, 7);
    return { row: rowNum, id: String(r[0] ?? ''), month: String(month ?? '').trim().slice(0, 7), from: String(r[2] ?? '').trim(), to: String(r[3] ?? '').trim(), value: L.parseNum(r[4]), date: L.toYmd(r[5]), notes: String(r[6] ?? '') };
  };
  L.transferToRow = (t) => [t.id, "'" + t.month, t.from, t.to, L.round2(t.value), t.date, t.notes || ''];

  L.parseConfig = function (rows) {
    rows = rows || [];
    const col = (c) => rows.map((r) => (r && r[c] !== undefined ? String(r[c]).trim() : '')).filter(Boolean);
    const v = (i) => (rows[i] && rows[i][1] !== undefined ? rows[i][1] : '');
    let share = L.parseNum(v(4));
    if (isNaN(share)) share = 0.5;
    if (share > 1) share = share / 100;
    return {
      p1: String(v(0) || 'Pessoa 1').trim(), p1Email: String(v(1) || '').trim().toLowerCase(),
      p2: String(v(2) || 'Pessoa 2').trim(), p2Email: String(v(3) || '').trim().toLowerCase(),
      share1: share,
      itemCats: String(v(5) || 'Supermercado;Padaria').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
      categories: col(3), classes: col(5), methods: col(7),
    };
  };

  L.newId = (prefix) => prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  // ---------- acerto mensal ----------
  L.samePerson = (a, b) => L.norm(a) === L.norm(b) && L.norm(a) !== '';

  L.settle = function (expenses, transfers, cfg, month) {
    const exps = expenses.filter((e) => L.monthOf(e.date) === month && !isNaN(e.value));
    const out = { month, total: 0, count: exps.length, unassigned: [], p: [
      { name: cfg.p1, paid: 0, should: 0, sent: 0, received: 0 },
      { name: cfg.p2, paid: 0, should: 0, sent: 0, received: 0 }] };
    for (const e of exps) {
      out.total += e.value;
      const s1 = e.share === null || e.share === undefined ? cfg.share1 : e.share;
      out.p[0].should += e.value * s1;
      out.p[1].should += e.value * (1 - s1);
      if (L.samePerson(e.payer, cfg.p1)) out.p[0].paid += e.value;
      else if (L.samePerson(e.payer, cfg.p2)) out.p[1].paid += e.value;
      else out.unassigned.push(e);
    }
    for (const t of transfers.filter((t) => t.month === month && !isNaN(t.value))) {
      out.p.forEach((p) => {
        if (L.samePerson(t.from, p.name)) p.sent += t.value;
        if (L.samePerson(t.to, p.name)) p.received += t.value;
      });
    }
    out.p.forEach((p) => {
      p.diff = p.paid - p.should;
      p.balance = L.round2(p.diff + p.sent - p.received);
      p.paid = L.round2(p.paid); p.should = L.round2(p.should);
    });
    // sem despesas sem dono, os saldos são exatamente opostos (evita diferença de 1 centavo)
    if (!out.unassigned.length) out.p[1].balance = L.round2(-out.p[0].balance + 0);
    out.total = L.round2(out.total);
    const b1 = out.p[0].balance;
    if (Math.abs(b1) < 0.01) out.transfer = null;
    else if (b1 < 0) out.transfer = { from: cfg.p1, to: cfg.p2, value: L.round2(-b1) };
    else out.transfer = { from: cfg.p2, to: cfg.p1, value: L.round2(b1) };
    return out;
  };

  // ---------- análises de despesas ----------
  L.monthsRange = function (from, to) {
    const out = [];
    let m = from;
    while (m <= to && out.length < 240) { out.push(m); m = L.addMonths(m, 1); }
    return out;
  };
  L.byMonthCategory = function (expenses, months) {
    const set = new Set(months);
    const res = {};
    for (const e of expenses) {
      const m = L.monthOf(e.date);
      if (!set.has(m) || isNaN(e.value)) continue;
      res[e.cat] = res[e.cat] || Object.fromEntries(months.map((x) => [x, 0]));
      res[e.cat][m] += e.value;
    }
    return res;
  };

  // ---------- análises de itens ----------
  L.productKey = (p) => L.norm(p).replace(/\s+/g, ' ');

  // Índice de preço por mercado dentro de uma classe:
  // para cada produto comprado em 2+ mercados, compara o preço médio de cada mercado com a média do produto.
  L.storeIndexByClass = function (items, sinceYmd) {
    const pool = items.filter((i) => !isNaN(i.unitPrice) && i.unitPrice > 0 && i.store && (!sinceYmd || i.date >= sinceYmd));
    const byProd = {};
    for (const i of pool) {
      const k = L.productKey(i.product);
      byProd[k] = byProd[k] || { cls: i.cls, name: i.product, stores: {} };
      const s = (byProd[k].stores[i.store] = byProd[k].stores[i.store] || { sum: 0, n: 0 });
      s.sum += i.unitPrice; s.n++;
    }
    const acc = {}; // cls -> store -> {ratios:[], products}
    for (const k in byProd) {
      const p = byProd[k];
      const stores = Object.keys(p.stores);
      if (stores.length < 2) continue;
      const avgs = stores.map((s) => p.stores[s].sum / p.stores[s].n);
      const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      stores.forEach((s, ix) => {
        acc[p.cls] = acc[p.cls] || {};
        const a = (acc[p.cls][s] = acc[p.cls][s] || { ratios: [], products: 0 });
        a.ratios.push(avgs[ix] / mean); a.products++;
      });
    }
    const out = [];
    for (const cls in acc) for (const s in acc[cls]) {
      const r = acc[cls][s].ratios;
      out.push({ cls, store: s, index: r.reduce((a, b) => a + b, 0) / r.length, products: acc[cls][s].products });
    }
    return out;
  };

  L.productStats = function (items) {
    const map = {};
    for (const i of items) {
      if (!i.product) continue;
      const k = L.productKey(i.product);
      const p = (map[k] = map[k] || { key: k, name: i.product, cls: i.cls, unit: i.unit, spend: 0, qty: 0, purchases: {}, stores: {}, history: [] });
      if (!isNaN(i.total)) p.spend += i.total;
      p.qty += i.qty || 0;
      const pk = i.expenseId || i.date;
      p.purchases[pk] = p.purchases[pk] || { date: i.date, qty: 0, store: i.store };
      p.purchases[pk].qty += i.qty || 0;
      if (!isNaN(i.unitPrice) && i.unitPrice > 0) {
        const s = (p.stores[i.store] = p.stores[i.store] || { sum: 0, n: 0, last: 0, lastDate: '' });
        s.sum += i.unitPrice; s.n++;
        if (i.date >= s.lastDate) { s.last = i.unitPrice; s.lastDate = i.date; }
        p.history.push({ date: i.date, store: i.store, price: i.unitPrice });
      }
    }
    return Object.values(map);
  };

  // Lista de compras semanal baseada no histórico
  L.shoppingList = function (items, today, horizonDays) {
    horizonDays = horizonDays || 7;
    const stats = L.productStats(items);
    const list = [];
    for (const p of stats) {
      const purchases = Object.values(p.purchases).sort((a, b) => (a.date < b.date ? -1 : 1));
      const dates = [...new Set(purchases.map((x) => x.date))];
      if (dates.length < 2) continue;
      const gaps = [];
      for (let k = 1; k < dates.length; k++) gaps.push(L.daysBetween(dates[k - 1], dates[k]));
      const recentGaps = gaps.slice(-6);
      const interval = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;
      const last = dates[dates.length - 1];
      const since = L.daysBetween(last, today);
      if (interval <= 0) continue;
      const due = since + horizonDays >= interval;
      const abandoned = since > Math.max(interval * 3, 45);
      if (!due || abandoned) continue;
      const qtys = purchases.slice(-6).map((x) => x.qty).sort((a, b) => a - b);
      const qty = qtys[Math.floor(qtys.length / 2)] || 1;
      let best = null;
      for (const s in p.stores) {
        const avg = p.stores[s].sum / p.stores[s].n;
        if (!best || avg < best.price) best = { store: s, price: avg };
      }
      list.push({
        name: p.name, cls: p.cls, unit: p.unit, qty: L.round2(qty), interval: Math.round(interval), since,
        bestStore: best ? best.store : '', bestPrice: best ? best.price : NaN,
        estimate: best ? L.round2(best.price * qty) : NaN, times: dates.length,
      });
    }
    list.sort((a, b) => (a.cls === b.cls ? a.name.localeCompare(b.name) : a.cls.localeCompare(b.cls)));
    return list;
  };

  // Extrai JSON da resposta da IA
  L.extractJson = function (text) {
    if (!text) throw new Error('Resposta vazia');
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    let s = fence ? fence[1] : text;
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('A resposta não contém JSON');
    return JSON.parse(s.slice(a, b + 1));
  };

  root.Logic = L;
  if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
