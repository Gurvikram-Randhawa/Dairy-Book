/* ═══════════════════════════════════════
   DairyTrack — App Logic (Minimal)
   ═══════════════════════════════════════ */

// ——— DATA LAYER ———
const STORE = {
  COWS: 'dt_cows',
  ENTRIES: 'dt_entries',
  VACCINES: 'dt_vaccines',
  FEED: 'dt_feed',
  HEALTH: 'dt_health',
  STOCK: 'dt_feed_stock'
};

function getCows() {
  return JSON.parse(localStorage.getItem(STORE.COWS) || '[]');
}
function saveCows(cows) {
  localStorage.setItem(STORE.COWS, JSON.stringify(cows));
}
function getEntries() {
  return JSON.parse(localStorage.getItem(STORE.ENTRIES) || '[]');
}
function saveEntries(entries) {
  localStorage.setItem(STORE.ENTRIES, JSON.stringify(entries));
}
function getVaccines() {
  return JSON.parse(localStorage.getItem(STORE.VACCINES) || '[]');
}
function saveVaccines(vaccines) {
  localStorage.setItem(STORE.VACCINES, JSON.stringify(vaccines));
}
function getFeed() {
  return JSON.parse(localStorage.getItem(STORE.FEED) || '[]');
}
function saveFeed(feed) {
  localStorage.setItem(STORE.FEED, JSON.stringify(feed));
}
function getHealth() {
  return JSON.parse(localStorage.getItem(STORE.HEALTH) || '[]');
}
function saveHealth(health) {
  localStorage.setItem(STORE.HEALTH, JSON.stringify(health));
}
function getStock() {
  const defaultStock = [
    { feedType: 'Concentrates', currentStock: 120.0, maxStock: 250.0, minThreshold: 40.0 },
    { feedType: 'Green Fodder', currentStock: 300.0, maxStock: 500.0, minThreshold: 100.0 },
    { feedType: 'Dry Fodder', currentStock: 180.0, maxStock: 300.0, minThreshold: 60.0 },
    { feedType: 'Silage', currentStock: 250.0, maxStock: 400.0, minThreshold: 80.0 },
    { feedType: 'Supplements', currentStock: 15.0, maxStock: 30.0, minThreshold: 8.0 }
  ];
  const stored = localStorage.getItem(STORE.STOCK);
  if (!stored) {
    localStorage.setItem(STORE.STOCK, JSON.stringify(defaultStock));
    return defaultStock;
  }
  return JSON.parse(stored);
}
function saveStock(stock) {
  localStorage.setItem(STORE.STOCK, JSON.stringify(stock));
}

// ——— HELPERS ———
// ——— UNIT STATE & CONVERSIONS ———
const DENSITY = 1.03; // 1 Litre of milk = 1.03 kg

function getGlobalUnit() {
  return localStorage.getItem('dt_global_unit') || 'L';
}

function setGlobalUnit(unit) {
  localStorage.setItem('dt_global_unit', unit);
  updateGlobalUnitUI();

  // Refresh the currently active page dynamically
  const activePage = document.querySelector('.page.active');
  if (activePage) {
    const pageId = activePage.id;
    if (pageId === 'page-home') refreshHome();
    if (pageId === 'page-report') refreshReport();
    if (pageId === 'page-herd') refreshHerd();
    if (pageId === 'page-scan') {
      updateTodayMilkSummary();
      renderCowSelectList(document.getElementById('milk-search-input').value);
      if (selectedCowTag) {
        setEntryUnit(unit);
      }
    }
  }
}

function updateGlobalUnitUI() {
  const currentUnit = getGlobalUnit();
  const btnL = document.getElementById('global-unit-l');
  const btnKg = document.getElementById('global-unit-kg');
  if (btnL && btnKg) {
    btnL.classList.toggle('active', currentUnit === 'L');
    btnKg.classList.toggle('active', currentUnit === 'kg');
  }
  const btnSingle = document.getElementById('milk-unit-toggle-btn');
  if (btnSingle) {
    btnSingle.innerHTML = `Unit: <strong>${currentUnit}</strong>`;
  }
}

function toggleGlobalUnitSystem() {
  const current = getGlobalUnit();
  const next = current === 'L' ? 'kg' : 'L';
  setGlobalUnit(next);
}

// Convert stored litres value to active unit value
function convertLitresToActive(litres) {
  const activeUnit = getGlobalUnit();
  if (activeUnit === 'kg') {
    return litres * DENSITY;
  }
  return litres;
}

// Format the converted milk value
function formatMilkValue(litres, fixed = 1) {
  return convertLitresToActive(litres).toFixed(fixed);
}

// Returns L or kg
function getMilkUnitLabel() {
  return getGlobalUnit() === 'kg' ? 'kg' : 'L';
}

// Returns Litres or Kilograms
function getMilkUnitFullLabel() {
  return getGlobalUnit() === 'kg' ? 'Kilograms' : 'Litres';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getWeekDates(refDateStr) {
  const today = refDateStr ? new Date(refDateStr + 'T00:00:00') : new Date();
  const dow = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ——— NAVIGATION ———
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.page === pageId);
  });

  if (pageId === 'page-home') refreshHome();
  if (pageId === 'page-report') refreshReport();
  if (pageId === 'page-herd') refreshHerd();
  if (pageId === 'page-scan') resetMilkPage();
  if (pageId === 'page-vaccine') refreshVaccinePage();
  if (pageId === 'page-feed') refreshFeedPage();
  if (pageId === 'page-health') refreshHealthPage();

  // Toggle floating action button visibility programmatically to support root-level positioning
  const feedFab = document.getElementById('feed-fab');
  const healthFab = document.getElementById('health-fab');
  if (feedFab) feedFab.style.display = (pageId === 'page-feed') ? 'flex' : 'none';
  if (healthFab) healthFab.style.display = (pageId === 'page-health') ? 'flex' : 'none';

  stopAllScanners();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ——— HOME ———
function refreshHome() {
  const cows = getCows();
  const entries = getEntries();
  const vaccines = getVaccines();
  const today = todayStr();
  const todayEntries = entries.filter(e => e.date === today);
  const todayMilk = todayEntries.reduce((s, e) => s + e.litres, 0);

  // Basic stats
  document.getElementById('stat-total-cows').textContent = cows.length;
  document.getElementById('stat-today-milk').textContent = formatMilkValue(todayMilk, 1);
  const milkLabelEl = document.querySelector('#stat-today-milk ~ .stat-label');
  if (milkLabelEl) {
    milkLabelEl.textContent = getGlobalUnit() === 'kg' ? 'KG TODAY' : 'LITRES TODAY';
  }
  document.getElementById('stat-today-entries').textContent = todayEntries.length;

  // Milk change vs yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayMilk = entries.filter(e => e.date === yesterdayStr).reduce((s, e) => s + e.litres, 0);
  const changeEl = document.getElementById('stat-milk-change');
  if (yesterdayMilk > 0) {
    const pct = ((todayMilk - yesterdayMilk) / yesterdayMilk * 100).toFixed(0);
    const sign = pct >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${pct}% vs yesterday`;
    changeEl.className = 'stat-sub ' + (pct >= 0 ? 'green' : 'red');
  } else {
    changeEl.textContent = 'No data yesterday';
    changeEl.className = 'stat-sub';
  }

  // Vaccine due count
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().slice(0, 10);
  const dueSoon = vaccines.filter(v => v.date <= next7Str && v.date >= today);
  const overdue = vaccines.filter(v => v.date < today);
  const vaccineCount = dueSoon.length + overdue.length;
  document.getElementById('stat-vaccine-due').textContent = vaccineCount;
  const vacSubEl = document.getElementById('stat-vaccine-sub');
  if (overdue.length > 0) {
    vacSubEl.textContent = `${overdue.length} Overdue`;
    vacSubEl.className = 'stat-sub red';
  } else if (dueSoon.length > 0) {
    vacSubEl.textContent = 'Due Soon';
    vacSubEl.className = 'stat-sub orange';
  } else {
    vacSubEl.textContent = 'All Clear';
    vacSubEl.className = 'stat-sub green';
  }

  // Draw chart
  drawMilkChart(entries);

  // Herd health ring (wrapped in try-catch so alerts always render)
  try { updateHealthRing(cows, todayEntries); } catch (e) { console.warn('updateHealthRing error:', e); }

  // Herd alerts on home (vaccine, checkup, sick, low stock, milk drop)
  renderHomeAlerts();
}

// ——— REGISTER ———
let registerScanner = null;

function startRegisterScan() {
  const reader = document.getElementById('register-reader');
  const btn = document.getElementById('btn-start-register-scan');

  if (registerScanner) { stopRegisterScanner(); return; }

  reader.classList.add('active');
  btn.querySelector('span:last-child').textContent = 'Stop Scanner';

  registerScanner = new Html5Qrcode('register-reader');
  registerScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (text) => {
      document.getElementById('register-tag-input').value = text.trim();
      stopRegisterScanner();
      showFeedback('register-feedback', `Scanned: ${text}`, 'success');
    },
    () => { }
  ).catch(() => {
    showFeedback('register-feedback', 'Camera not available. Please type the tag.', 'error');
    stopRegisterScanner();
  });
}

function stopRegisterScanner() {
  const reader = document.getElementById('register-reader');
  const btn = document.getElementById('btn-start-register-scan');
  if (registerScanner) {
    registerScanner.stop().catch(() => { });
    registerScanner.clear();
    registerScanner = null;
  }
  reader.classList.remove('active');
  btn.querySelector('span:last-child').textContent = 'Scan Ear-Tag';
}

function registerCow() {
  const tagEl = document.getElementById('register-tag-input');
  const nameEl = document.getElementById('register-name-input');
  const breedEl = document.getElementById('register-breed-input');
  const tag = tagEl.value.trim().toUpperCase();
  const name = nameEl.value.trim();
  const breed = breedEl.value;

  if (!tag) {
    showFeedback('register-feedback', 'Please enter an ear-tag number.', 'error');
    return;
  }

  if (!breed) {
    showFeedback('register-feedback', 'Please select a breed type.', 'error');
    return;
  }

  const cows = getCows();
  if (cows.find(c => c.tag === tag)) {
    showFeedback('register-feedback', `"${tag}" is already registered!`, 'warning');
    return;
  }

  cows.push({ tag, name: name || '', breed, registeredAt: new Date().toISOString() });
  saveCows(cows);
  tagEl.value = '';
  nameEl.value = '';
  breedEl.selectedIndex = 0;
  showFeedback('register-feedback', `✅ "${tag}" (${breed}) registered!`, 'success');
}

// ——— MILK ENTRY ———
let milkScanner = null;
let selectedCowTag = null;
let selectedSession = 'morning';
let selectedEntryUnit = 'L';

function setEntryUnit(unit) {
  selectedEntryUnit = unit;
  updateEntryUnitUI();
  const unitLabelEl = document.querySelector('#milk-slider-card .slider-big-unit');
  if (unitLabelEl) {
    unitLabelEl.textContent = (unit === 'kg' ? 'Kilograms (kg)' : 'Litres (L)');
  }
  if (selectedCowTag) {
    const entries = getEntries();
    const today = todayStr();
    const existing = entries.find(e => e.tag === selectedCowTag && e.date === today && e.session === selectedSession);
    if (existing) {
      const val = existing.value !== undefined ? existing.value : existing.litres;
      const unitLabel = existing.unit || 'L';
      showFeedback('milk-feedback', `⚠️ ${selectedSession} entry exists (${val.toFixed(1)}${unitLabel}). Will overwrite.`, 'warning');
    } else {
      hideFeedback('milk-feedback');
    }
  }
}

function updateEntryUnitUI() {
  const btnL = document.getElementById('entry-unit-l');
  const btnKg = document.getElementById('entry-unit-kg');
  if (btnL && btnKg) {
    btnL.classList.toggle('active', selectedEntryUnit === 'L');
    btnKg.classList.toggle('active', selectedEntryUnit === 'kg');
  }
}

function resetMilkPage() {
  document.getElementById('milk-search-input').value = '';
  document.getElementById('milk-slider-card').classList.add('hidden');
  hideFeedback('milk-feedback');
  selectedCowTag = null;
  selectedSession = new Date().getHours() < 14 ? 'morning' : 'evening';
  updateSessionUI();
  selectedEntryUnit = getGlobalUnit();
  updateEntryUnitUI();
  document.getElementById('milk-slider').value = 0;
  document.getElementById('milk-value').textContent = '0.0';
  renderCowSelectList('');
  updateTodayMilkSummary();
}

function updateTodayMilkSummary() {
  const entries = getEntries();
  const today = todayStr();
  const todayEntries = entries.filter(e => e.date === today);

  const total = todayEntries.reduce((sum, e) => sum + e.litres, 0);
  const morningTotal = todayEntries.filter(e => e.session === 'morning').reduce((sum, e) => sum + e.litres, 0);
  const eveningTotal = todayEntries.filter(e => e.session === 'evening').reduce((sum, e) => sum + e.litres, 0);

  const uniqueCows = new Set(todayEntries.map(e => e.tag)).size;

  const totalEl = document.getElementById('milk-today-total');
  const sessionsEl = document.getElementById('milk-today-sessions');
  const activeCowsEl = document.getElementById('milk-today-active-cows');

  const unitLabel = getMilkUnitLabel();
  const unitFullLabel = getMilkUnitFullLabel();

  if (totalEl) totalEl.textContent = `${formatMilkValue(total, 1)} ${unitFullLabel}`;
  if (sessionsEl) sessionsEl.textContent = `Morning: ${formatMilkValue(morningTotal, 1)}${unitLabel} · Evening: ${formatMilkValue(eveningTotal, 1)}${unitLabel}`;
  if (activeCowsEl) activeCowsEl.textContent = `${uniqueCows} ${uniqueCows === 1 ? 'cow' : 'cows'} recorded`;
}

function renderCowSelectList(query) {
  const cows = getCows();
  const entries = getEntries();
  const today = todayStr();
  const listEl = document.getElementById('cow-select-list');
  const q = query.trim().toLowerCase();

  // Filter cows by tag or name
  const filtered = cows.filter(cow => {
    if (!q) return true;
    return cow.tag.toLowerCase().includes(q) || (cow.name && cow.name.toLowerCase().includes(q));
  });

  listEl.innerHTML = '';

  if (cows.length === 0) {
    listEl.innerHTML = '<div class="cow-select-empty">No cows registered yet.<br>Register a cow first!</div>';
    return;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="cow-select-empty">No cows match your search.</div>';
    return;
  }

  filtered.forEach(cow => {
    const todayEntries = entries.filter(e => e.tag === cow.tag && e.date === today);
    const morningDone = todayEntries.some(e => e.session === 'morning');
    const eveningDone = todayEntries.some(e => e.session === 'evening');
    const todayMilk = todayEntries.reduce((s, e) => s + e.litres, 0);
    const breedLabel = cow.breed || '';
    const icon = breedLabel.includes('Buffalo') ? '🐃' : '🐄';

    let statusText = '';
    if (morningDone && eveningDone) {
      statusText = `<span style="color:var(--green)">✓ Both done</span> · ${formatMilkValue(todayMilk, 1)}${getMilkUnitLabel()}`;
    } else if (morningDone) {
      statusText = `<span style="color:var(--green)">✓ Morning</span> · <span style="color:var(--orange)">Evening pending</span>`;
    } else if (eveningDone) {
      statusText = `<span style="color:var(--orange)">Morning pending</span> · <span style="color:var(--green)">✓ Evening</span>`;
    } else {
      statusText = '<span style="color:var(--red)">No entry today</span>';
    }

    const item = document.createElement('div');
    item.className = 'cow-select-item';
    item.onclick = () => selectCowForMilk(cow.tag);
    item.innerHTML = `
      <span class="cs-icon">${icon}</span>
      <div class="cs-info">
        <div class="cs-tag">${cow.tag}</div>
        <div class="cs-name">${cow.name || 'Unnamed'}${breedLabel ? ' · ' + breedLabel : ''}</div>
        <div class="cs-breed">${statusText}</div>
      </div>
      <span class="cs-arrow">›</span>
    `;
    listEl.appendChild(item);
  });
}

function filterCowList() {
  const query = document.getElementById('milk-search-input').value;
  renderCowSelectList(query);
  // Hide slider when searching again
  document.getElementById('milk-slider-card').classList.add('hidden');
  selectedCowTag = null;
  hideFeedback('milk-feedback');
}

function selectCowForMilk(tag) {
  const cow = getCows().find(c => c.tag === tag);
  if (!cow) return;

  selectedSession = new Date().getHours() < 14 ? 'morning' : 'evening';

  selectedEntryUnit = getGlobalUnit();
  updateEntryUnitUI();
  const unitLabelEl = document.querySelector('#milk-slider-card .slider-big-unit');
  if (unitLabelEl) {
    unitLabelEl.textContent = (selectedEntryUnit === 'kg' ? 'Kilograms (kg)' : 'Litres (L)');
  }

  // Check for existing entry
  const entries = getEntries();
  const today = todayStr();
  const existing = entries.find(e => e.tag === tag && e.date === today && e.session === selectedSession);
  if (existing) {
    const val = existing.value !== undefined ? existing.value : existing.litres;
    const unitLabel = existing.unit || 'L';
    showFeedback('milk-feedback', `⚠️ ${selectedSession} entry exists (${val.toFixed(1)}${unitLabel}). Will overwrite.`, 'warning');
  } else {
    hideFeedback('milk-feedback');
  }

  selectedCowTag = tag;
  document.getElementById('found-cow-tag').textContent = tag;
  document.getElementById('found-cow-name').textContent = cow.name ? `${cow.name}${cow.breed ? ' · ' + cow.breed : ''}` : (cow.breed || '');
  document.getElementById('milk-slider-card').classList.remove('hidden');

  updateSessionUI();

  document.getElementById('milk-slider').value = 0;
  document.getElementById('milk-value').textContent = '0.0';

  setTimeout(() => {
    document.getElementById('milk-slider-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function startMilkScan() {
  const reader = document.getElementById('milk-reader');
  const btn = document.getElementById('btn-start-milk-scan');

  if (milkScanner) { stopMilkScanner(); return; }

  reader.classList.add('active');
  btn.querySelector('span:last-child').textContent = 'Stop Scanner';

  milkScanner = new Html5Qrcode('milk-reader');
  milkScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (text) => {
      const tag = text.trim().toUpperCase();
      stopMilkScanner();
      document.getElementById('milk-search-input').value = tag;
      const cow = getCows().find(c => c.tag === tag);
      if (cow) {
        selectCowForMilk(tag);
      } else {
        showFeedback('milk-feedback', `"${tag}" not found. Register it first.`, 'error');
      }
    },
    () => { }
  ).catch(() => {
    showFeedback('milk-feedback', 'Camera not available. Search or tap a cow below.', 'error');
    stopMilkScanner();
  });
}

function stopMilkScanner() {
  const reader = document.getElementById('milk-reader');
  const btn = document.getElementById('btn-start-milk-scan');
  if (milkScanner) {
    milkScanner.stop().catch(() => { });
    milkScanner.clear();
    milkScanner = null;
  }
  reader.classList.remove('active');
  btn.querySelector('span:last-child').textContent = 'Scan Ear-Tag';
}

function stopAllScanners() {
  stopRegisterScanner();
  stopMilkScanner();
}

function setSession(s) {
  selectedSession = s;
  updateSessionUI();

  if (selectedCowTag) {
    const existing = getEntries().find(e => e.tag === selectedCowTag && e.date === todayStr() && e.session === s);
    if (existing) {
      const val = existing.value !== undefined ? existing.value : existing.litres;
      const unitLabel = existing.unit || 'L';
      showFeedback('milk-feedback', `⚠️ ${s} entry exists (${val.toFixed(1)}${unitLabel}). Will overwrite.`, 'warning');
    } else {
      hideFeedback('milk-feedback');
    }
  }
}

function updateSessionUI() {
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.session === selectedSession);
  });
}

function updateSliderValue(val) {
  document.getElementById('milk-value').textContent = (val / 10).toFixed(1);
}

function saveMilkEntry() {
  if (!selectedCowTag) return;

  const value = parseFloat((document.getElementById('milk-slider').value / 10).toFixed(1));
  const today = todayStr();

  // Convert to standard litres for storage compatibility
  let litres;
  if (selectedEntryUnit === 'kg') {
    litres = parseFloat((value / DENSITY).toFixed(3));
  } else {
    litres = value;
  }

  let entries = getEntries();
  entries = entries.filter(e => !(e.tag === selectedCowTag && e.date === today && e.session === selectedSession));
  entries.push({
    tag: selectedCowTag,
    date: today,
    session: selectedSession,
    litres,
    value,
    unit: selectedEntryUnit,
    savedAt: new Date().toISOString(),
  });
  saveEntries(entries);

  showFeedback('milk-feedback', `✅ Saved ${value}${selectedEntryUnit} for "${selectedCowTag}" (${selectedSession})`, 'success');
  document.getElementById('milk-slider-card').classList.add('hidden');
  selectedCowTag = null;

  // Refresh the cow list to show updated status
  renderCowSelectList(document.getElementById('milk-search-input').value);
  updateTodayMilkSummary();
}

// ——— REPORTS (Daily / Weekly / Monthly) ———
let currentReportPeriod = 'daily';
let selectedReportDate = todayStr();

function onReportDateChange() {
  const dateInput = document.getElementById('report-selected-date');
  if (dateInput && dateInput.value) {
    selectedReportDate = dateInput.value;
    refreshReport();
  }
}

function switchReportPeriod(period) {
  currentReportPeriod = period;
  document.querySelectorAll('.report-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.period === period);
  });
  // Only show date picker for daily report
  const dateInput = document.getElementById('report-selected-date');
  if (dateInput) dateInput.style.display = (period === 'daily') ? 'block' : 'none';
  refreshReport();
}

function refreshReport() {
  if (currentReportPeriod === 'daily') {
    const dateInput = document.getElementById('report-selected-date');
    if (dateInput && !dateInput.value) dateInput.value = selectedReportDate;
  }
  if (currentReportPeriod === 'daily') refreshDailyReport();
  else if (currentReportPeriod === 'weekly') refreshWeeklyReport();
  else refreshMonthlyReport();
}

// --- DAILY REPORT ---
function refreshDailyReport() {
  const cows = getCows();
  const entries = getEntries();
  const today = selectedReportDate;

  const isToday = (today === todayStr());
  document.getElementById('report-date-range').textContent = isToday ? `Today — ${formatDate(today)}` : `${formatDate(today)}`;
  document.getElementById('rpt-avg-label').textContent = 'Avg/Cow';
  document.getElementById('rpt-table-title').textContent = "Today's Milking";
  document.getElementById('rpt-col-total').textContent = `Total (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-detail').textContent = `Morning (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-extra').textContent = `Evening (${getMilkUnitLabel()})`;

  const todayEntries = entries.filter(e => e.date === today);
  const totalMilk = todayEntries.reduce((s, e) => s + e.litres, 0);

  // Per cow
  const cowData = [];
  cows.forEach(cow => {
    const morning = todayEntries.find(e => e.tag === cow.tag && e.session === 'morning');
    const evening = todayEntries.find(e => e.tag === cow.tag && e.session === 'evening');
    const mL = morning ? morning.litres : 0;
    const eL = evening ? evening.litres : 0;
    cowData.push({ tag: cow.tag, name: cow.name, morning: mL, evening: eL, total: mL + eL });
  });
  cowData.sort((a, b) => b.total - a.total);

  const active = cowData.filter(c => c.total > 0);
  const avg = active.length > 0 ? active.reduce((s, c) => s + c.total, 0) / active.length : 0;
  const best = active.length > 0 ? active[0] : null;

  document.getElementById('rpt-total-milk').textContent = formatMilkValue(totalMilk, 1);
  document.getElementById('rpt-avg-milk').textContent = formatMilkValue(avg, 1);
  document.getElementById('rpt-best-cow').textContent = best ? (best.name || best.tag) : '—';

  // Table
  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '';

  if (cows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px;">No cows registered.</td></tr>';
    document.getElementById('alerts-list').innerHTML = '<li>Register cows first.</li>';
    return;
  }

  cowData.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:800;color:var(--primary)">${c.tag}</td>
      <td>${c.name || '—'}</td>
      <td style="font-weight:800">${formatMilkValue(c.total, 1)}</td>
      <td>${c.morning > 0 ? formatMilkValue(c.morning, 1) : '<span style="color:var(--red)">—</span>'}</td>
      <td>${c.evening > 0 ? formatMilkValue(c.evening, 1) : '<span style="color:var(--orange)">—</span>'}</td>
    `;
    tbody.appendChild(tr);
  });

  // Alerts
  const alerts = [];
  if (best) {
    alerts.push({ type: 'top', text: `<strong>${best.name || best.tag}</strong> leads today with <strong>${formatMilkValue(best.total, 1)}${getMilkUnitLabel()}</strong>.` });
  }

  const hour = new Date().getHours();
  cows.forEach(cow => {
    const has = todayEntries.filter(e => e.tag === cow.tag);
    if (has.length === 0 && hour >= 10) {
      alerts.push({ type: 'missing', text: `No entry today for <strong>${cow.name || cow.tag}</strong>.` });
    } else if (has.length === 1 && hour >= 16) {
      const done = has[0].session;
      const pending = done === 'morning' ? 'evening' : 'morning';
      alerts.push({ type: 'info', text: `<strong>${cow.name || cow.tag}</strong> — ${pending} entry still pending.` });
    }
  });

  if (alerts.length === 0) {
    alerts.push({ type: 'info', text: 'All good today! Keep logging.' });
  }

  renderAlerts(alerts);
}

// --- WEEKLY REPORT ---
function refreshWeeklyReport() {
  const cows = getCows();
  const entries = getEntries();
  const week = getWeekDates();

  document.getElementById('report-date-range').textContent = `${formatDate(week[0])} — ${formatDate(week[6])}`;
  document.getElementById('rpt-avg-label').textContent = 'Avg/Cow/Day';
  document.getElementById('rpt-table-title').textContent = 'Weekly Performance';
  document.getElementById('rpt-col-total').textContent = `Total (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-detail').textContent = `Avg/Day (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-extra').textContent = 'Trend';

  const weekEntries = entries.filter(e => e.date >= week[0] && e.date <= week[6]);
  const totalMilk = weekEntries.reduce((s, e) => s + e.litres, 0);

  const stats = {};
  cows.forEach(c => {
    stats[c.tag] = { tag: c.tag, name: c.name, total: 0, daily: {}, count: 0 };
  });

  weekEntries.forEach(e => {
    if (!stats[e.tag]) return;
    stats[e.tag].total += e.litres;
    stats[e.tag].count++;
    stats[e.tag].daily[e.date] = (stats[e.tag].daily[e.date] || 0) + e.litres;
  });

  const list = Object.values(stats);
  list.forEach(s => {
    const days = Object.keys(s.daily).length;
    s.avg = days > 0 ? s.total / days : 0;
  });
  list.sort((a, b) => b.total - a.total);

  const active = list.filter(c => c.total > 0);
  const overallAvg = active.length > 0 ? active.reduce((s, c) => s + c.avg, 0) / active.length : 0;
  const best = active.length > 0 ? active[0] : null;

  document.getElementById('rpt-total-milk').textContent = formatMilkValue(totalMilk, 1);
  document.getElementById('rpt-avg-milk').textContent = formatMilkValue(overallAvg, 1);
  document.getElementById('rpt-best-cow').textContent = best ? (best.name || best.tag) : '—';

  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px;">No cows yet.</td></tr>';
    document.getElementById('alerts-list').innerHTML = '<li>Register cows to see reports.</li>';
    return;
  }

  list.forEach(s => {
    const first = week.slice(0, 3).reduce((sum, d) => sum + (s.daily[d] || 0), 0);
    const second = week.slice(4, 7).reduce((sum, d) => sum + (s.daily[d] || 0), 0);

    let icon, cls;
    if (first === 0 && second === 0) { icon = '—'; cls = 'trend-stable'; }
    else if (second > first * 1.05) { icon = '↑ Up'; cls = 'trend-up'; }
    else if (second < first * 0.95) { icon = '↓ Down'; cls = 'trend-down'; }
    else { icon = '→ Same'; cls = 'trend-stable'; }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:800;color:var(--primary)">${s.tag}</td>
      <td>${s.name || '—'}</td>
      <td style="font-weight:800">${formatMilkValue(s.total, 1)}</td>
      <td>${formatMilkValue(s.avg, 1)}</td>
      <td class="${cls}">${icon}</td>
    `;
    tbody.appendChild(tr);
  });

  // Alerts
  const alerts = [];
  if (best) {
    alerts.push({ type: 'top', text: `<strong>${best.name || best.tag}</strong> is the top performer — <strong>${formatMilkValue(best.total, 1)}${getMilkUnitLabel()}</strong> this week.` });
  }

  list.forEach(s => {
    const first = week.slice(0, 3).reduce((sum, d) => sum + (s.daily[d] || 0), 0);
    const second = week.slice(4, 7).reduce((sum, d) => sum + (s.daily[d] || 0), 0);
    if (first > 0 && second < first * 0.75) {
      const drop = ((1 - second / first) * 100).toFixed(0);
      alerts.push({ type: 'drop', text: `<strong>${s.name || s.tag}</strong> dropped <strong>${drop}%</strong>. Check health.` });
    }
  });

  const today = todayStr();
  cows.forEach(cow => {
    const has = weekEntries.filter(e => e.tag === cow.tag && e.date === today);
    if (has.length === 0 && new Date().getHours() >= 10) {
      alerts.push({ type: 'missing', text: `No entry today for <strong>${cow.name || cow.tag}</strong>.` });
    }
  });

  if (active.length >= 2) {
    const avg = active.reduce((s, c) => s + c.avg, 0) / active.length;
    active.forEach(s => {
      if (s.avg < avg * 0.5 && s.avg > 0) {
        alerts.push({ type: 'info', text: `<strong>${s.name || s.tag}</strong> producing <strong>${formatMilkValue(s.avg, 1)}${getMilkUnitLabel()}/day</strong> — below herd average of <strong>${formatMilkValue(avg, 1)}${getMilkUnitLabel()}</strong>.` });
      }
    });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'info', text: 'No alerts this week.' });
  }
  renderAlerts(alerts);
}

// --- MONTHLY REPORT ---
function refreshMonthlyReport() {
  const cows = getCows();
  const entries = getEntries();

  // Current month range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
  const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassed = now.getDate();

  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('report-date-range').textContent = `${monthName} (${daysPassed}/${daysInMonth} days)`;
  document.getElementById('rpt-avg-label').textContent = 'Avg/Cow/Day';
  document.getElementById('rpt-table-title').textContent = 'Monthly Performance';
  document.getElementById('rpt-col-total').textContent = `Total (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-detail').textContent = `Avg/Day (${getMilkUnitLabel()})`;
  document.getElementById('rpt-col-extra').textContent = `Best Day (${getMilkUnitLabel()})`;

  const monthEntries = entries.filter(e => e.date >= firstDay && e.date <= lastDay);
  const totalMilk = monthEntries.reduce((s, e) => s + e.litres, 0);

  const stats = {};
  cows.forEach(c => {
    stats[c.tag] = { tag: c.tag, name: c.name, total: 0, daily: {}, count: 0 };
  });

  monthEntries.forEach(e => {
    if (!stats[e.tag]) return;
    stats[e.tag].total += e.litres;
    stats[e.tag].count++;
    stats[e.tag].daily[e.date] = (stats[e.tag].daily[e.date] || 0) + e.litres;
  });

  const list = Object.values(stats);
  list.forEach(s => {
    const days = Object.keys(s.daily).length;
    s.avg = days > 0 ? s.total / days : 0;
    // Best day
    const dailyValues = Object.values(s.daily);
    s.bestDay = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;
  });
  list.sort((a, b) => b.total - a.total);

  const active = list.filter(c => c.total > 0);
  const overallAvg = active.length > 0 ? active.reduce((s, c) => s + c.avg, 0) / active.length : 0;
  const best = active.length > 0 ? active[0] : null;

  document.getElementById('rpt-total-milk').textContent = formatMilkValue(totalMilk, 1);
  document.getElementById('rpt-avg-milk').textContent = formatMilkValue(overallAvg, 1);
  document.getElementById('rpt-best-cow').textContent = best ? (best.name || best.tag) : '—';

  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px;">No cows yet.</td></tr>';
    document.getElementById('alerts-list').innerHTML = '<li>Register cows to see reports.</li>';
    return;
  }

  list.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:800;color:var(--primary)">${s.tag}</td>
      <td>${s.name || '—'}</td>
      <td style="font-weight:800">${formatMilkValue(s.total, 1)}</td>
      <td>${formatMilkValue(s.avg, 1)}</td>
      <td style="color:var(--blue);font-weight:700">${formatMilkValue(s.bestDay, 1)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Alerts
  const alerts = [];
  if (best) {
    alerts.push({ type: 'top', text: `<strong>${best.name || best.tag}</strong> leads this month with <strong>${formatMilkValue(best.total, 1)}${getMilkUnitLabel()}</strong> total.` });
  }

  // Compare first half vs second half of month
  const midDay = Math.floor(daysPassed / 2);
  const midDate = new Date(year, month, midDay).toISOString().slice(0, 10);
  list.forEach(s => {
    const firstHalf = Object.entries(s.daily).filter(([d]) => d <= midDate).reduce((sum, [, v]) => sum + v, 0);
    const secondHalf = Object.entries(s.daily).filter(([d]) => d > midDate).reduce((sum, [, v]) => sum + v, 0);
    if (firstHalf > 0 && secondHalf < firstHalf * 0.7) {
      const drop = ((1 - secondHalf / firstHalf) * 100).toFixed(0);
      alerts.push({ type: 'drop', text: `<strong>${s.name || s.tag}</strong> production dropped <strong>${drop}%</strong> in the second half of the month.` });
    }
  });

  if (active.length >= 2) {
    const avg = active.reduce((s, c) => s + c.avg, 0) / active.length;
    active.forEach(s => {
      if (s.avg < avg * 0.5 && s.avg > 0) {
        alerts.push({ type: 'info', text: `<strong>${s.name || s.tag}</strong> at <strong>${formatMilkValue(s.avg, 1)}${getMilkUnitLabel()}/day</strong> — below herd avg of <strong>${formatMilkValue(avg, 1)}${getMilkUnitLabel()}</strong>.` });
      }
    });
  }

  // Projected month total
  if (totalMilk > 0 && daysPassed < daysInMonth) {
    const projected = (totalMilk / daysPassed) * daysInMonth;
    alerts.push({ type: 'info', text: `Projected month total: <strong>${formatMilkValue(projected, 0)}${getMilkUnitLabel()}</strong> (based on ${daysPassed} days).` });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'info', text: 'No alerts this month.' });
  }
  renderAlerts(alerts);
}

function renderAlerts(alerts) {
  const el = document.getElementById('alerts-list');
  el.innerHTML = '';
  alerts.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="alert-tag ${a.type}">${a.type}</span> ${a.text}`;
    el.appendChild(li);
  });
}

// ——— HERD ———
function refreshHerd() {
  const cows = getCows();
  const entries = getEntries();
  const list = document.getElementById('herd-list');
  document.getElementById('herd-count-desc').textContent = `${cows.length} cow${cows.length !== 1 ? 's' : ''} registered`;
  list.innerHTML = '';

  if (cows.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🐄</span>
        <span class="empty-state-text">No cows registered yet.</span>
      </div>`;
    return;
  }

  const today = todayStr();
  cows.forEach(cow => {
    const todayMilk = entries.filter(e => e.tag === cow.tag && e.date === today).reduce((s, e) => s + e.litres, 0);
    const breedLabel = cow.breed || 'Unknown breed';

    const item = document.createElement('div');
    item.className = 'herd-item';
    item.innerHTML = `
      <span class="herd-item-icon">${breedLabel.includes('Buffalo') ? '🐃' : '🐄'}</span>
      <div class="herd-item-info">
        <div class="herd-item-tag">${cow.tag}</div>
        <div class="herd-item-name">${cow.name || 'Unnamed'} · ${breedLabel}</div>
        <div class="herd-item-date">Today: ${formatMilkValue(todayMilk, 1)}${getMilkUnitLabel()} · Since ${formatDate(cow.registeredAt.slice(0, 10))}</div>
      </div>
      <button class="herd-delete-btn" onclick="deleteCow('${cow.tag}')">Remove</button>
    `;
    list.appendChild(item);
  });
}

function deleteCow(tag) {
  if (!confirm(`Remove "${tag}"? All milk data will be deleted.`)) return;
  saveCows(getCows().filter(c => c.tag !== tag));
  saveEntries(getEntries().filter(e => e.tag !== tag));
  refreshHerd();
}

// ——— FEEDBACK ———
function showFeedback(id, msg, type) {
  const el = document.getElementById(id);
  el.innerHTML = msg;
  el.className = `feedback ${type}`;
  if (type === 'success') setTimeout(() => el.classList.add('hidden'), 4000);
}

function hideFeedback(id) {
  document.getElementById(id).classList.add('hidden');
}

// ——— 7-DAY MILK CHART ———
function drawMilkChart(entries) {
  const canvas = document.getElementById('milk-chart');
  if (!canvas) return;

  // Defer rendering to next frame so the DOM layout is settled
  requestAnimationFrame(() => {
    _renderMilkChart(canvas, entries);
  });
}

function _renderMilkChart(canvas, entries) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  if (W < 1 || H < 1) return;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // CSS variables
  const cs = getComputedStyle(document.documentElement);
  const greenColor = cs.getPropertyValue('--green').trim() || '#22c55e';
  const primaryColor = cs.getPropertyValue('--primary').trim() || '#1b723a';
  const textColor = cs.getPropertyValue('--text').trim() || '#091e11';
  const textLightColor = cs.getPropertyValue('--text-light').trim() || '#828c86';
  const borderLightColor = cs.getPropertyValue('--border-light').trim() || '#eef2f0';

  // Build 7-day data
  const daysData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    daysData.push({ dateStr, label: weekdays[d.getDay()] });
  }

  const values = daysData.map(item => entries.filter(e => e.date === item.dateStr).reduce((s, e) => s + e.litres, 0));
  const valuesInActive = values.map(v => convertLitresToActive(v));
  const maxVal = Math.max(...valuesInActive, 1) * 1.15; // 15% headroom

  // Update stat elements
  const todayVal = values[6];
  const yesterdayVal = values[5];
  document.getElementById('chart-today-val').textContent = formatMilkValue(todayVal, 1);
  document.getElementById('chart-yesterday-val').textContent = formatMilkValue(yesterdayVal, 1);
  document.querySelectorAll('.chart-stat-unit').forEach(el => {
    el.textContent = getMilkUnitLabel();
  });
  const growthEl = document.getElementById('chart-growth');
  if (yesterdayVal > 0) {
    const g = ((todayVal - yesterdayVal) / yesterdayVal * 100).toFixed(0);
    growthEl.textContent = (g >= 0 ? '+' : '') + g + '%';
    growthEl.style.color = g >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    growthEl.textContent = '—';
    growthEl.style.color = 'var(--text-light)';
  }

  // Chart dimensions
  const pad = { top: 14, bottom: 30, left: 12, right: 12 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const stepX = chartW / 6; // 7 points, 6 gaps

  // Calculate point positions
  const points = valuesInActive.map((v, i) => ({
    x: pad.left + stepX * i,
    y: pad.top + chartH - (v / maxVal) * chartH
  }));

  // --- Draw subtle horizontal grid lines ---
  ctx.strokeStyle = borderLightColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // --- Helper: smooth bezier path through points ---
  function buildSmoothPath(pts) {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpx = (curr.x + next.x) / 2;
      ctx.bezierCurveTo(cpx, curr.y, cpx, next.y, next.x, next.y);
    }
  }

  // --- Draw gradient fill under curve ---
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, H);
  areaGrad.addColorStop(0, 'hsla(142, 60%, 50%, 0.28)');
  areaGrad.addColorStop(0.6, 'hsla(142, 60%, 50%, 0.08)');
  areaGrad.addColorStop(1, 'hsla(142, 60%, 50%, 0.0)');

  ctx.beginPath();
  buildSmoothPath(points);
  // Close path to bottom
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
  ctx.lineTo(points[0].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // --- Draw the line ---
  const lineGrad = ctx.createLinearGradient(pad.left, 0, W - pad.right, 0);
  lineGrad.addColorStop(0, 'hsl(142, 40%, 72%)');
  lineGrad.addColorStop(0.7, greenColor);
  lineGrad.addColorStop(1, primaryColor);

  ctx.beginPath();
  buildSmoothPath(points);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // --- Draw data dots ---
  points.forEach((p, i) => {
    const isToday = (i === 6);

    if (isToday) {
      // Glow effect for today
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(142, 60%, 45%, 0.18)';
      ctx.fill();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, isToday ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = isToday ? greenColor : 'hsl(142, 30%, 72%)';
    ctx.lineWidth = isToday ? 2.5 : 1.8;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, isToday ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isToday ? greenColor : 'hsl(142, 30%, 72%)';
    ctx.fill();

    // Value label above today's dot
    if (isToday && valuesInActive[i] > 0) {
      ctx.fillStyle = primaryColor;
      ctx.font = '700 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(valuesInActive[i].toFixed(1), p.x, p.y - 12);
    }
  });

  // --- Day labels ---
  points.forEach((p, i) => {
    ctx.fillStyle = i === 6 ? textColor : textLightColor;
    ctx.font = `${i === 6 ? '700' : '600'} 10px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(daysData[i].label, p.x, H - 8);
  });
}

// ——— HERD HEALTH RING ———
function updateHealthRing(cows, todayEntries) {
  const total = cows.length;
  let healthyCount = 0;

  const pctEl = document.getElementById('health-pct');
  const msgEl = document.getElementById('health-msg');
  const ring = document.getElementById('health-ring-fill');

  // Bail out safely if DOM elements don't exist
  if (!pctEl || !msgEl || !ring) return;

  if (total === 0) {
    pctEl.textContent = '—';
    msgEl.textContent = 'Register cows to track health.';
    ring.setAttribute('stroke-dashoffset', '314');
    return;
  }

  cows.forEach(cow => {
    const cowEntries = todayEntries.filter(e => e.tag === cow.tag);
    if (cowEntries.length >= 2) healthyCount += 1;
    else if (cowEntries.length === 1) healthyCount += 0.5;
  });

  const pct = Math.round((healthyCount / total) * 100);
  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;

  ring.setAttribute('stroke-dashoffset', offset.toString());

  let color = 'var(--green)';
  if (pct < 50) color = 'var(--red)';
  else if (pct < 75) color = 'var(--orange)';
  ring.setAttribute('stroke', color);

  pctEl.textContent = pct + '%';
  pctEl.style.color = color;

  if (pct >= 90) msgEl.textContent = 'Your herd is in great health!';
  else if (pct >= 70) msgEl.textContent = 'Most cows logged today.';
  else if (pct >= 50) msgEl.textContent = 'Several entries missing.';
  else msgEl.textContent = 'Many cows need logging today.';
}

// ——— UNIFIED HERD ALERTS & REMINDERS FOR HOME PAGE ———
function renderHomeAlerts() {
  const el = document.getElementById('home-alerts-list');
  if (!el) { console.warn('renderHomeAlerts: #home-alerts-list not found'); return; }

  try {
    const today = todayStr();
    const now = new Date();
    const hour = now.getHours();
    const cows = getCows();
    const health = getHealth();
    const entries = getEntries();
    const vaccines = getVaccines();
    const stocks = getStock();
    const todayEntries = entries.filter(e => e.date === today);

    const alerts = [];

    // 0. DAILY MILK LOGGING REMINDERS (always visible when cows registered)
    if (cows.length > 0) {
      const notLoggedAtAll = cows.filter(cow => !todayEntries.some(e => e.tag === cow.tag));
      const missingEvening = cows.filter(cow =>
        todayEntries.some(e => e.tag === cow.tag && e.session === 'morning') &&
        !todayEntries.some(e => e.tag === cow.tag && e.session === 'evening')
      );
      const missingMorning = cows.filter(cow =>
        todayEntries.some(e => e.tag === cow.tag && e.session === 'evening') &&
        !todayEntries.some(e => e.tag === cow.tag && e.session === 'morning')
      );
      const bothDone = cows.filter(cow =>
        todayEntries.some(e => e.tag === cow.tag && e.session === 'morning') &&
        todayEntries.some(e => e.tag === cow.tag && e.session === 'evening')
      );

      if (notLoggedAtAll.length > 0) {
        alerts.push({
          type: 'milk-reminder',
          severity: hour >= 10 ? 'high' : 'mid',
          icon: '🥛',
          title: 'Milk Not Logged Today',
          text: `<strong>${notLoggedAtAll.length} cow${notLoggedAtAll.length > 1 ? 's' : ''}</strong> (${notLoggedAtAll.slice(0, 3).map(c => c.name || c.tag).join(', ')}${notLoggedAtAll.length > 3 ? '…' : ''}) have no milk entry today.`,
          linkPage: 'page-scan'
        });
      }
      if (missingEvening.length > 0 && hour >= 14) {
        alerts.push({
          type: 'milk-session',
          severity: 'mid',
          icon: '🌇',
          title: 'Evening Milk Pending',
          text: `<strong>${missingEvening.length} cow${missingEvening.length > 1 ? 's' : ''}</strong> still need their evening milk entry.`,
          linkPage: 'page-scan'
        });
      }
      if (missingMorning.length > 0 && hour < 12) {
        alerts.push({
          type: 'milk-session',
          severity: 'mid',
          icon: '🌅',
          title: 'Morning Milk Pending',
          text: `<strong>${missingMorning.length} cow${missingMorning.length > 1 ? 's' : ''}</strong> still need their morning milk entry.`,
          linkPage: 'page-scan'
        });
      }
      if (bothDone.length === cows.length && cows.length > 0) {
        alerts.push({
          type: 'all-done',
          severity: 'mid',
          icon: '✅',
          title: 'All Logged Today',
          text: `Great job! All <strong>${cows.length} cow${cows.length > 1 ? 's' : ''}</strong> have both morning and evening milk entries for today.`,
          linkPage: 'page-scan'
        });
      }
    } else {
      // No cows registered yet
      alerts.push({
        type: 'no-cows',
        severity: 'mid',
        icon: '🐄',
        title: 'No Cows Registered',
        text: 'Register your first cow to start tracking milk, feed, and health records.',
        linkPage: 'page-register'
      });
    }

    // 1. FEED RUNNING OUT ALERTS (Low Stock Inventory)
    stocks.forEach(s => {
      if (s.currentStock <= s.minThreshold) {
        alerts.push({
          type: 'feed-low',
          severity: 'high',
          icon: '🌾',
          title: `Low Stock: ${s.feedType}`,
          text: `Feed stock is critical! Only <strong>${s.currentStock.toFixed(1)} kg</strong> left (Min: ${s.minThreshold} kg).`,
          linkPage: 'page-feed'
        });
      }
    });

    // 2. SICK ANIMAL ALERTS
    cows.forEach(cow => {
      const cowHistory = health.filter(h => h.cowTag === cow.tag).sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      if (cowHistory.length > 0 && cowHistory[0].status === 'Sick') {
        alerts.push({
          type: 'sick',
          severity: 'high',
          icon: '🤒',
          title: 'Sick Animal',
          text: `Cow <strong>${cow.name || cow.tag}</strong> (${cow.tag}) is marked <strong>Sick</strong>! Needs immediate attention.`,
          linkPage: 'page-health'
        });
      }
    });

    // 3. HIGH TEMPERATURE (FEVER) ALERTS (last 5 days)
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const limitDate = fiveDaysAgo.toISOString().slice(0, 10);
      const recentFever = health.filter(h => h.date >= limitDate && h.temperature >= 103.0);
      const uniqueFeverCows = [];
      recentFever.forEach(h => {
        if (!uniqueFeverCows.includes(h.cowTag)) {
          uniqueFeverCows.push(h.cowTag);
          const cowObj = cows.find(c => c.tag === h.cowTag);
          alerts.push({
            type: 'fever',
            severity: 'high',
            icon: '🔥',
            title: 'Fever Warning',
            text: `<strong>${cowObj ? cowObj.name || h.cowTag : h.cowTag}</strong> recorded high temp of <strong>${h.temperature.toFixed(1)}°F</strong> on ${formatDate(h.date)}.`,
            linkPage: 'page-health'
          });
        }
      });
    } catch (e) { console.warn('Fever alerts error:', e); }

    // 4. SMART LOW MILK YIELD WARNINGS
    try {
      cows.forEach(cow => {
        const cowMilkEntries = entries.filter(e => e.tag === cow.tag).sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
        if (cowMilkEntries.length >= 3) {
          const latestEntry = cowMilkEntries[0];
          const historyEntries = cowMilkEntries.slice(1, 6);
          const sum = historyEntries.reduce((s, e) => s + e.litres, 0);
          const avg = sum / historyEntries.length;
          if (avg > 2.0) {
            const pctDrop = ((avg - latestEntry.litres) / avg) * 100;
            if (pctDrop >= 25.0) {
              alerts.push({
                type: 'milk-drop',
                severity: 'high',
                icon: '⚠️',
                title: 'Milk Drop Alert',
                text: `<strong>${cow.name || cow.tag}</strong>'s yield dropped <strong>${pctDrop.toFixed(0)}%</strong> (${formatMilkValue(latestEntry.litres, 1)}${getMilkUnitLabel()} vs avg ${formatMilkValue(avg, 1)}${getMilkUnitLabel()}).`,
                linkPage: 'page-health'
              });
            }
          }
        }
      });
    } catch (e) { console.warn('Milk drop alerts error:', e); }

    // 5. VACCINATION REMINDERS
    try {
      const next14 = new Date();
      next14.setDate(next14.getDate() + 14);
      const next14Str = next14.toISOString().slice(0, 10);
      const dueVaccines = vaccines.filter(v => v.date && v.date <= next14Str);
      dueVaccines.forEach(v => {
        const isOverdue = v.date < today;
        const isToday = v.date === today;
        const severity = (isOverdue || isToday) ? 'high' : 'mid';
        const dateLabel = isOverdue ? 'OVERDUE' : isToday ? 'TODAY' : formatDate(v.date);
        alerts.push({
          type: 'vaccine',
          severity,
          icon: '💉',
          title: `Vaccine ${isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Due Soon'}`,
          text: `<strong>${v.vaccineName}</strong> for <strong>${v.cowTag}</strong> — <strong>${dateLabel}</strong>.`,
          linkPage: 'page-vaccine'
        });
      });
    } catch (e) { console.warn('Vaccine alerts error:', e); }

    // Sort: high severity first, then mid
    alerts.sort((a, b) => {
      const rank = { high: 0, mid: 1 };
      return (rank[a.severity] || 1) - (rank[b.severity] || 1);
    });

    // Render alerts
    el.innerHTML = '';
    if (alerts.length === 0) {
      el.innerHTML = '<div class="empty-small">✓ All systems clear. No alerts.</div>';
      return;
    }

    const limit = window.isHomeAlertsExpanded ? alerts.length : 3;

    alerts.slice(0, limit).forEach(a => {
      const item = document.createElement('div');
      item.className = `home-alert-item ${a.severity === 'high' ? 'high-severity' : 'mid-severity'}`;
      item.onclick = () => navigateTo(a.linkPage);
      item.innerHTML = `
        <span class="vhi-icon">${a.icon}</span>
        <div class="vhi-info">
          <div class="vhi-text" style="font-size:0.7rem;color:var(--text-mid);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${a.title}</div>
          <div class="vhi-desc" style="font-size:0.8rem;font-weight:700;color:var(--text);margin-top:2px;line-height:1.35;">${a.text}</div>
        </div>
        <span class="vhi-arrow">›</span>
      `;
      el.appendChild(item);
    });

    if (alerts.length > 3) {
      const btn = document.createElement('button');
      btn.className = 'view-more-alerts-btn';
      if (!window.isHomeAlertsExpanded) {
        btn.innerHTML = `<span>View ${alerts.length - 3} More Alerts</span><span style="font-size:1.1rem; line-height:1; margin-bottom:2px;">⌄</span>`;
        btn.onclick = () => {
          window.isHomeAlertsExpanded = true;
          renderHomeAlerts();
        };
      } else {
        btn.innerHTML = `<span>Show Less</span><span style="font-size:1.1rem; line-height:1; transform: rotate(180deg); display:inline-block; margin-top:2px;">⌄</span>`;
        btn.onclick = () => {
          window.isHomeAlertsExpanded = false;
          renderHomeAlerts();
        };
      }
      el.appendChild(btn);
    }

  } catch (err) {
    console.error('renderHomeAlerts crashed:', err);
    el.innerHTML = '<div class="empty-small">⚠️ Could not load alerts.</div>';
  }
}

// ——— VACCINE PAGE ———
function refreshVaccinePage() {
  populateVaccineCowSelect();
  refreshVaccineList();
}

function populateVaccineCowSelect() {
  const select = document.getElementById('vaccine-cow-select');
  const cows = getCows();
  select.innerHTML = '<option value="" disabled selected>Choose...</option>';
  cows.forEach(cow => {
    const opt = document.createElement('option');
    opt.value = cow.tag;
    opt.textContent = `${cow.tag}${cow.name ? ' — ' + cow.name : ''}`;
    select.appendChild(opt);
  });
}

function addVaccine() {
  const cowTag = document.getElementById('vaccine-cow-select').value;
  const vaccineName = document.getElementById('vaccine-name-input').value.trim();
  const date = document.getElementById('vaccine-date-input').value;

  if (!cowTag) {
    showFeedback('vaccine-feedback', 'Please select a cow.', 'error');
    return;
  }
  if (!vaccineName) {
    showFeedback('vaccine-feedback', 'Please enter a vaccine name.', 'error');
    return;
  }
  if (!date) {
    showFeedback('vaccine-feedback', 'Please select a date.', 'error');
    return;
  }

  const vaccines = getVaccines();
  vaccines.push({
    cowTag,
    vaccineName,
    date,
    addedAt: new Date().toISOString()
  });
  saveVaccines(vaccines);

  document.getElementById('vaccine-cow-select').selectedIndex = 0;
  document.getElementById('vaccine-name-input').value = '';
  document.getElementById('vaccine-date-input').value = '';

  showFeedback('vaccine-feedback', `✅ Vaccine "${vaccineName}" scheduled for ${cowTag} on ${formatDate(date)}`, 'success');
  refreshVaccineList();
}

function refreshVaccineList() {
  const vaccines = getVaccines();
  const el = document.getElementById('vaccine-list');
  const today = todayStr();

  if (vaccines.length === 0) {
    el.innerHTML = '<div class="empty-small">No vaccines scheduled yet.</div>';
    return;
  }

  const sorted = [...vaccines].sort((a, b) => {
    const aOver = a.date < today ? 0 : 1;
    const bOver = b.date < today ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return a.date.localeCompare(b.date);
  });

  el.innerHTML = '';
  sorted.forEach((v) => {
    const isOverdue = v.date < today;
    const isToday = v.date === today;
    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);
    const isDueSoon = !isOverdue && !isToday && v.date <= next7.toISOString().slice(0, 10);

    let statusClass = 'done';
    let statusText = formatDate(v.date);
    if (isOverdue) { statusClass = 'overdue'; statusText = 'Overdue'; }
    else if (isToday) { statusClass = 'due'; statusText = 'Today'; }
    else if (isDueSoon) { statusClass = 'due'; statusText = 'Due Soon'; }

    const origIdx = vaccines.indexOf(v);
    const item = document.createElement('div');
    item.className = 'vaccine-item';
    item.innerHTML = `
      <span class="vi-icon">💉</span>
      <div class="vi-info">
        <div class="vi-cow">${v.cowTag}</div>
        <div class="vi-name">${v.vaccineName}</div>
        <div class="vi-date">${formatDate(v.date)}</div>
      </div>
      <span class="vi-status ${statusClass}">${statusText}</span>
      <button class="vaccine-delete-btn" onclick="deleteVaccine(${origIdx})" title="Delete">✕</button>
    `;
    el.appendChild(item);
  });
}

// ——— FEED MANAGEMENT SYSTEM LOGIC ———
let selectedFeedSession = 'both';

function toggleFeedModal(show) {
  const modal = document.getElementById('feed-modal');
  if (show) {
    modal.classList.remove('hidden');
    hideFeedback('feed-feedback');
    document.getElementById('feed-date-input').value = todayStr();

    // Dynamically populate feed types
    const typeSelect = document.getElementById('feed-type-select');
    const stocks = getStock();
    typeSelect.innerHTML = '<option value="" disabled selected>Choose...</option>';
    stocks.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.feedType;
      opt.textContent = s.feedType;
      typeSelect.appendChild(opt);
    });
  } else {
    modal.classList.add('hidden');
  }
}

function refreshFeedPage() {
  populateFeedCowSelect();
  refreshFeedStockLevels();
  refreshFeedAnalytics();
  refreshFeedHistoryTimeline();
}

function populateFeedCowSelect() {
  const select = document.getElementById('feed-cow-select');
  const cows = getCows();
  select.innerHTML = '<option value="" disabled selected>Choose...</option>';
  cows.forEach(cow => {
    const opt = document.createElement('option');
    opt.value = cow.tag;
    opt.textContent = `${cow.tag}${cow.name ? ' — ' + cow.name : ''}`;
    select.appendChild(opt);
  });
}

function adjustFeedQty(change) {
  const input = document.getElementById('feed-qty-input');
  let val = parseFloat(input.value) || 0.0;
  val = Math.max(0.0, parseFloat((val + change).toFixed(1)));
  input.value = val > 0 ? val.toFixed(1) : '';
}

function toggleFeedSession(session) {
  const morningBtn = document.getElementById('feed-pill-morning');
  const eveningBtn = document.getElementById('feed-pill-evening');
  const morningActive = morningBtn.classList.contains('active');
  const eveningActive = eveningBtn.classList.contains('active');

  if (session === 'morning') {
    // Don't allow deselecting if it's the only one active
    if (morningActive && !eveningActive) return;
    morningBtn.classList.toggle('active');
  } else {
    if (eveningActive && !morningActive) return;
    eveningBtn.classList.toggle('active');
  }

  const m = morningBtn.classList.contains('active');
  const e = eveningBtn.classList.contains('active');
  selectedFeedSession = (m && e) ? 'both' : m ? 'morning' : 'evening';
}

// Alias used by feed modal buttons
function setFeedSession(session) {
  toggleFeedSession(session);
}

function refreshFeedStockLevels() {
  const stocks = getStock();
  const listEl = document.getElementById('feed-stock-levels');
  const badgeEl = document.getElementById('feed-stock-badge');
  listEl.innerHTML = '';

  let hasLowStock = false;

  stocks.forEach((s, idx) => {
    const isLow = s.currentStock <= s.minThreshold;
    if (isLow) hasLowStock = true;

    const percentage = Math.min((s.currentStock / s.maxStock) * 100, 100);
    const barColor = isLow ? 'var(--red)' : percentage < 40 ? 'var(--orange)' : 'var(--green)';
    const emoji = s.feedType === 'Concentrates' ? '🌾' : s.feedType === 'Green Fodder' ? '🌿' : s.feedType === 'Dry Fodder' ? '🍂' : s.feedType === 'Silage' ? '🌽' : s.feedType === 'Supplements' ? '🧪' : '';

    const item = document.createElement('div');
    item.className = 'stock-item';
    item.innerHTML = `
      <div class="stock-header">
        <span class="stock-name">${emoji} ${s.feedType}</span>
        <span style="color:${isLow ? 'var(--red)' : 'var(--text-mid)'}; font-weight:800;">
          ${s.currentStock.toFixed(1)} / ${s.maxStock} kg
        </span>
      </div>
      <div class="stock-bar-bg">
        <div class="stock-bar-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
      </div>
      <div class="stock-actions">
        <span class="stat-sub ${isLow ? 'red' : 'green'}" style="font-size:0.6rem;">
          ${isLow ? '⚠️ Stock Low!' : '✓ Available'}
        </span>
        <button class="stock-delete-btn" onclick="deleteFeedStock(${idx})" title="Delete Feed" style="margin-left: auto; margin-right: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
        <button class="stock-refill-btn" onclick="refillStock(${idx})">+ Refill</button>
      </div>
    `;
    listEl.appendChild(item);
  });

  if (hasLowStock) {
    badgeEl.textContent = '⚠️ Low Stock!';
    badgeEl.style.background = 'var(--red-light)';
    badgeEl.style.color = 'var(--red)';
  } else {
    badgeEl.textContent = 'Stock Ok';
    badgeEl.style.background = 'var(--green-light)';
    badgeEl.style.color = 'var(--green)';
  }
}

let currentRefillIndex = -1;

function toggleRefillModal(show) {
  const modal = document.getElementById('refill-feed-modal');
  if (show) {
    hideFeedback('refill-feed-feedback');
    document.getElementById('refill-feed-qty').value = '';
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
    currentRefillIndex = -1;
  }
}

function refillStock(index) {
  currentRefillIndex = index;
  const stocks = getStock();
  const item = stocks[index];
  const maxRefill = item.maxStock - item.currentStock;

  document.getElementById('refill-modal-title').textContent = `📦 Refill ${item.feedType}`;
  document.getElementById('refill-modal-max-label').textContent = `Max you can add: ${maxRefill.toFixed(1)} kg`;

  toggleRefillModal(true);
}

function confirmRefillStock() {
  if (currentRefillIndex === -1) return;

  try {
    const qtyInput = parseFloat(document.getElementById('refill-feed-qty').value);
    if (isNaN(qtyInput) || qtyInput <= 0) {
      showFeedback('refill-feed-feedback', 'Please enter a valid positive number.', 'error');
      return;
    }

    const stocks = getStock();
    const item = stocks[currentRefillIndex];

    item.currentStock = Math.min(item.currentStock + qtyInput, item.maxStock);
    stocks[currentRefillIndex] = item;

    saveStock(stocks);

    try { refreshFeedStockLevels(); } catch (e) { console.error('refreshFeedStockLevels error', e); }
    try { refreshHome(); } catch (e) { console.error('refreshHome error', e); }

    showFeedback('refill-feed-feedback', `✅ Refilled ${qtyInput} kg!`, 'success');
  } catch (err) {
    console.error('Error during refill:', err);
  } finally {
    document.getElementById('refill-feed-qty').value = '';
    toggleRefillModal(false);
  }
}

function toggleAddFeedModal(show) {
  const modal = document.getElementById('add-feed-modal');
  if (show) {
    document.getElementById('add-feed-name').value = '';
    document.getElementById('add-feed-max').value = '';
    hideFeedback('add-feed-feedback');
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}

function showAddFeedPrompt() {
  toggleAddFeedModal(true);
}

function confirmAddFeed() {
  const nameInput = document.getElementById('add-feed-name').value.trim();
  const maxInput = parseFloat(document.getElementById('add-feed-max').value);

  if (!nameInput) {
    showFeedback('add-feed-feedback', 'Please enter a feed name.', 'error');
    return;
  }

  const stocks = getStock();
  if (stocks.find(s => s.feedType.toLowerCase() === nameInput.toLowerCase())) {
    showFeedback('add-feed-feedback', 'This feed already exists in your inventory.', 'error');
    return;
  }

  if (isNaN(maxInput) || maxInput <= 0) {
    showFeedback('add-feed-feedback', 'Please enter a valid max capacity.', 'error');
    return;
  }

  stocks.push({
    feedType: nameInput,
    currentStock: 0.0,
    maxStock: maxInput,
    minThreshold: Math.max(20.0, maxInput * 0.1)
  });

  saveStock(stocks);
  refreshFeedStockLevels();
  showFeedback('add-feed-feedback', `✅ Feed added!`, 'success');
  toggleAddFeedModal(false);
}

function deleteFeedStock(index) {
  const stocks = getStock();
  const item = stocks[index];
  if (confirm(`Are you sure you want to delete "${item.feedType}" from your inventory? This won't delete past logs, but you won't be able to log new ones.`)) {
    stocks.splice(index, 1);
    saveStock(stocks);
    refreshFeedStockLevels();
  }
}


function saveFeedEntry() {
  const cowTag = document.getElementById('feed-cow-select').value;
  const feedType = document.getElementById('feed-type-select').value;
  const qtyInput = document.getElementById('feed-qty-input');
  const costInput = document.getElementById('feed-cost-input');
  const notesInput = document.getElementById('feed-notes-input');
  const dateInput = document.getElementById('feed-date-input');

  const quantity = parseFloat(qtyInput.value);
  const cost = parseFloat(costInput.value) || 0;
  const notes = notesInput.value.trim();
  const selectedDate = dateInput.value || todayStr();

  if (!cowTag) {
    showFeedback('feed-feedback', 'Please select a cow.', 'error');
    return;
  }
  if (!feedType) {
    showFeedback('feed-feedback', 'Please select a feed type.', 'error');
    return;
  }
  if (isNaN(quantity) || quantity <= 0) {
    showFeedback('feed-feedback', 'Please enter a valid quantity in kg.', 'error');
    return;
  }

  // Deduct from stock
  const stocks = getStock();
  const stockItem = stocks.find(s => s.feedType === feedType);
  if (stockItem) {
    if (stockItem.currentStock < quantity) {
      if (!confirm(`Warning: Only ${stockItem.currentStock.toFixed(1)} kg of ${feedType} is in stock. Feed anyway?`)) {
        return;
      }
    }
    stockItem.currentStock = Math.max(0, stockItem.currentStock - quantity);
    saveStock(stocks);
  }

  try {
    const feeds = getFeed();
    feeds.push({
      id: 'f_' + Date.now() + Math.random().toString(36).substr(2, 4),
      cowTag,
      feedType,
      quantity,
      cost,
      timing: selectedFeedSession,
      notes,
      date: selectedDate,
      addedAt: new Date().toISOString()
    });
    saveFeed(feeds);

    showFeedback('feed-feedback', `✅ Logged ${quantity}kg ${feedType} for ${cowTag}`, 'success');

    try { refreshFeedPage(); } catch (e) { console.error('refreshFeedPage error', e); }
    try { refreshHome(); } catch (e) { console.error('refreshHome error', e); }
  } catch (err) {
    console.error('Error saving feed entry:', err);
  } finally {
    // Clear inputs
    document.getElementById('feed-cow-select').selectedIndex = 0;
    document.getElementById('feed-type-select').selectedIndex = 0;
    qtyInput.value = '';
    costInput.value = '';
    notesInput.value = '';

    toggleFeedModal(false);
  }
}

function refreshFeedAnalytics() {
  const feeds = getFeed();
  const today = todayStr();

  const todayFeeds = feeds.filter(f => f.date === today);
  const totalQty = todayFeeds.reduce((sum, f) => sum + f.quantity, 0);
  const totalCost = todayFeeds.reduce((sum, f) => sum + f.cost, 0);

  document.getElementById('feed-stat-consumed').textContent = totalQty.toFixed(1) + ' kg';
  document.getElementById('feed-stat-cost').textContent = '₹' + Math.round(totalCost);
}

function refreshFeedHistoryTimeline() {
  const feeds = getFeed();
  const container = document.getElementById('feed-history-list');
  container.innerHTML = '';

  if (feeds.length === 0) {
    container.innerHTML = '<div class="empty-small">No feed entries logged yet.</div>';
    return;
  }

  const cows = getCows();
  const cowMap = {};
  cows.forEach(c => {
    cowMap[c.tag] = c;
  });

  // Sorted by date desc, then added time desc
  const sorted = [...feeds].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.addedAt.localeCompare(a.addedAt);
  });

  sorted.forEach(f => {
    const emoji = f.feedType === 'Concentrates' ? '🌾' : f.feedType === 'Green Fodder' ? '🌿' : f.feedType === 'Dry Fodder' ? '🍂' : f.feedType === 'Silage' ? '🌽' : f.feedType === 'Supplements' ? '🧪' : '';
    const cow = cowMap[f.cowTag] || { name: '', breed: '' };
    const cowName = cow.name || 'Cattle';
    const displayBreed = cow.breed ? cow.breed.replace(' (Buffalo)', '') : '';
    const breedText = displayBreed ? ` (${displayBreed})` : '';
    const cowDetailText = `${cowName}${breedText} - ${f.cowTag}`;
    const cowIcon = cow.breed && cow.breed.includes('Buffalo') ? '🐃' : '🐄';

    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.innerHTML = `
      <div class="timeline-header">
        <div class="timeline-title-row">
          <span class="timeline-emoji">${emoji}</span>
          <span class="timeline-title">${f.feedType}</span>
        </div>
        <button class="timeline-delete-btn" onclick="deleteFeedEntry('${f.id}')" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
      <div class="timeline-body">
        <div class="timeline-cow-row">
          <span class="cow-inline-badge">${cowDetailText}</span>
          <span class="timeline-meta">${formatDate(f.date)} · ${f.timing === 'both' ? '🌅 AM + 🌇 PM' : f.timing === 'morning' ? '🌅 AM' : '🌇 PM'}</span>
        </div>
        ${f.notes ? `<div class="timeline-notes">${f.notes}</div>` : ''}
        <div class="timeline-badges">
          <span class="timeline-badge qty">${f.quantity} kg</span>
          ${f.cost > 0 ? `<span class="timeline-badge cost">₹${f.cost}</span>` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function deleteFeedEntry(id) {
  if (!confirm('Are you sure you want to delete this feed log?')) return;
  const feeds = getFeed();
  const fIdx = feeds.findIndex(f => f.id === id);
  if (fIdx === -1) return;

  const item = feeds[fIdx];
  // Add quantity back to stock
  const stocks = getStock();
  const stockItem = stocks.find(s => s.feedType === item.feedType);
  if (stockItem) {
    stockItem.currentStock = Math.min(stockItem.currentStock + item.quantity, stockItem.maxStock);
    saveStock(stocks);
  }

  feeds.splice(fIdx, 1);
  saveFeed(feeds);
  refreshFeedPage();
  refreshHome();
}

// ——— MEDICATION & HEALTH SYSTEM LOGIC ———
let selectedHealthRecordType = 'treatment';

function toggleHealthModal(show) {
  const modal = document.getElementById('health-modal');
  if (show) {
    modal.classList.remove('hidden');
    hideFeedback('health-feedback');
  } else {
    modal.classList.add('hidden');
  }
}

function refreshHealthPage() {
  populateHealthCowSelect();
  refreshHealthHistoryTimeline();
  compileSmartHealthAlerts();
}

function populateHealthCowSelect() {
  const select = document.getElementById('health-cow-select');
  const cows = getCows();
  select.innerHTML = '<option value="" disabled selected>Choose...</option>';
  cows.forEach(cow => {
    const opt = document.createElement('option');
    opt.value = cow.tag;
    opt.textContent = `${cow.tag}${cow.name ? ' — ' + cow.name : ''}`;
    select.appendChild(opt);
  });
}

function setHealthRecordType(type) {
  selectedHealthRecordType = type;
  document.getElementById('health-pill-treatment').classList.toggle('active', type === 'treatment');
  document.getElementById('health-pill-vaccination').classList.toggle('active', type === 'vaccination');
  document.getElementById('health-pill-checkup').classList.toggle('active', type === 'checkup');

  const medicineGroup = document.getElementById('group-medicine');
  const doseGroup = document.getElementById('group-dose');
  const labelMed = document.getElementById('label-medicine');

  if (type === 'checkup') {
    medicineGroup.classList.add('hidden');
    doseGroup.classList.add('hidden');
  } else {
    medicineGroup.classList.remove('hidden');
    doseGroup.classList.remove('hidden');
    if (type === 'vaccination') {
      labelMed.textContent = 'Vaccine Name *';
      document.getElementById('health-medicine-input').placeholder = 'e.g. FMD Vaccine, Brucellosis...';
    } else {
      labelMed.textContent = 'Medicine Name *';
      document.getElementById('health-medicine-input').placeholder = 'e.g. Meloxicam, Dewormer syrup...';
    }
  }
}

function saveHealthEntry() {
  const cowTag = document.getElementById('health-cow-select').value;
  const medInput = document.getElementById('health-medicine-input');
  const doseInput = document.getElementById('health-dose-input');
  const vetInput = document.getElementById('health-vet-input');
  const reasonInput = document.getElementById('health-reason-input');
  const tempInput = document.getElementById('health-temp-input');
  const statusSelect = document.getElementById('health-status-select');
  const dueInput = document.getElementById('health-due-date-input');

  if (!cowTag) {
    showFeedback('health-feedback', 'Please select a cow.', 'error');
    return;
  }
  if (selectedHealthRecordType !== 'checkup' && !medInput.value.trim()) {
    showFeedback('health-feedback', `Please enter a ${selectedHealthRecordType === 'vaccination' ? 'vaccine' : 'medicine'} name.`, 'error');
    return;
  }
  if (!reasonInput.value.trim()) {
    showFeedback('health-feedback', 'Please enter a treatment reason or checklist symptoms.', 'error');
    return;
  }

  const temperature = parseFloat(tempInput.value) || 0;
  try {
    const healthList = getHealth();
    const newEntry = {
      id: 'h_' + Date.now() + Math.random().toString(36).substr(2, 4),
      cowTag,
      recordType: selectedHealthRecordType,
      medicineName: selectedHealthRecordType === 'checkup' ? '' : medInput.value.trim(),
      dose: selectedHealthRecordType === 'checkup' ? '' : doseInput.value.trim(),
      vetName: vetInput.value.trim(),
      reason: reasonInput.value.trim(),
      temperature,
      status: statusSelect.value,
      nextDueDate: dueInput.value,
      date: todayStr(),
      addedAt: new Date().toISOString()
    };

    healthList.push(newEntry);
    saveHealth(healthList);

    // Synced Vaccine Scheduling
    if (selectedHealthRecordType === 'vaccination' || (dueInput.value && selectedHealthRecordType === 'treatment')) {
      const vacName = selectedHealthRecordType === 'vaccination' ? medInput.value.trim() : `Followup: ${medInput.value.trim()}`;
      const vDate = dueInput.value || todayStr();
      const vaccines = getVaccines();
      vaccines.push({
        cowTag,
        vaccineName: vacName,
        date: vDate,
        addedAt: new Date().toISOString()
      });
      saveVaccines(vaccines);
    }

    showFeedback('health-feedback', '✅ Saved health log successfully!', 'success');

    try { refreshHealthPage(); } catch (e) { console.error('refreshHealthPage error', e); }
    try { refreshHome(); } catch (e) { console.error('refreshHome error', e); }
  } catch (err) {
    console.error('Error saving health entry:', err);
  } finally {
    // Clear inputs
    document.getElementById('health-cow-select').selectedIndex = 0;
    medInput.value = '';
    doseInput.value = '';
    vetInput.value = '';
    reasonInput.value = '';
    tempInput.value = '';
    statusSelect.selectedIndex = 2; // back to Under Observation
    dueInput.value = '';

    toggleHealthModal(false);
  }
}

function refreshHealthHistoryTimeline() {
  const healthList = getHealth();
  const container = document.getElementById('health-history-list');
  container.innerHTML = '';

  if (healthList.length === 0) {
    container.innerHTML = '<div class="empty-small">No medical logs captured yet.</div>';
    return;
  }

  const cows = getCows();
  const cowMap = {};
  cows.forEach(c => {
    cowMap[c.tag] = c;
  });

  const sorted = [...healthList].sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  sorted.forEach(h => {
    const cow = cowMap[h.cowTag] || { name: '', breed: '' };
    const cowName = cow.name || 'Cattle';
    const displayBreed = cow.breed ? cow.breed.replace(' (Buffalo)', '') : '';
    const breedText = displayBreed ? ` (${displayBreed})` : '';
    const cowDetailText = `${cowName}${breedText} - ${h.cowTag}`;
    const cowIcon = cow.breed && cow.breed.includes('Buffalo') ? '🐃' : '🐄';

    const card = document.createElement('div');
    card.className = 'timeline-card';

    let detailsHtml = '';
    if (h.recordType !== 'checkup') {
      detailsHtml += `<p><strong>Given:</strong> ${h.medicineName} ${h.dose ? `(${h.dose})` : ''}</p>`;
    }
    detailsHtml += `<p><strong>Reason:</strong> ${h.reason}</p>`;
    if (h.vetName) {
      detailsHtml += `<p><strong>Doctor:</strong> ${h.vetName}</p>`;
    }

    const typeEmoji = h.recordType === 'vaccination' ? '🦠' : h.recordType === 'vaccine' ? '💉' : h.recordType === 'treatment' ? '💊' : '🩺';
    const statusClass = h.status === 'Healthy' ? 'healthy' : h.status === 'Sick' ? 'sick' : 'observation';
    const statusText = h.status === 'Healthy' ? 'Healthy' : h.status === 'Sick' ? 'Sick 🤒' : 'Observation 👁️';

    card.innerHTML = `
      <div class="timeline-header">
        <div class="timeline-title-row">
          <span class="timeline-emoji">${typeEmoji}</span>
          <span class="timeline-title">${h.recordType.charAt(0).toUpperCase() + h.recordType.slice(1)} Event</span>
        </div>
        <button class="timeline-delete-btn" onclick="deleteHealthEntry('${h.id}')" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
      <div class="timeline-body">
        <div class="timeline-cow-row">
          <span class="cow-inline-badge">${cowDetailText}</span>
          <span class="timeline-meta">${formatDate(h.date)}</span>
        </div>
        
        <div class="timeline-badges" style="margin-top: 8px;">
          <span class="timeline-badge ${statusClass}">${statusText}</span>
        </div>
        
        <div class="timeline-details">
          ${detailsHtml}
        </div>

        ${(h.temperature > 0 || h.nextDueDate) ? `
        <div class="timeline-badges">
          ${h.temperature > 0 ? `<span class="timeline-badge neutral">🌡️ ${h.temperature.toFixed(1)}°F</span>` : ''}
          ${h.nextDueDate ? `<span class="timeline-badge alert">📅 Next: ${formatDate(h.nextDueDate)}</span>` : ''}
        </div>
        ` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

function deleteHealthEntry(id) {
  if (!confirm('Are you sure you want to delete this health log?')) return;
  const healthList = getHealth();
  const deleted = healthList.find(h => h.id === id);
  if (!deleted) return;

  const filtered = healthList.filter(h => h.id !== id);
  saveHealth(filtered);

  // Aggressively remove synced vaccine if it exists (loose match to catch any inconsistencies)
  if (deleted.recordType === 'vaccination' || (deleted.nextDueDate && deleted.recordType === 'treatment')) {
    let vaccines = getVaccines();
    const initialLen = vaccines.length;

    vaccines = vaccines.filter(v => {
      // If it's the same cow and the vaccine name includes the medicine name from the health log
      if (v.cowTag === deleted.cowTag && deleted.medicineName && v.vaccineName.toLowerCase().includes(deleted.medicineName.toLowerCase())) {
        // Also ensure the date is roughly matching to avoid deleting completely unrelated vaccines
        if (v.date === deleted.date || v.date === deleted.nextDueDate || !v.date) {
          return false; // Remove this vaccine
        }
      }
      return true; // Keep
    });

    if (vaccines.length !== initialLen) {
      saveVaccines(vaccines);
    }
  }

  refreshHealthPage();
  refreshHome();
}

// ——— SMART DIAGNOSTICS & ALERTS ENGINE ———
function compileSmartHealthAlerts() {
  const alertsList = document.getElementById('health-alerts-list');
  const alertCard = document.getElementById('health-alerts-card');
  alertsList.innerHTML = '';

  const alerts = [];

  const cows = getCows();
  const health = getHealth();
  const entries = getEntries();
  const vaccines = getVaccines();
  const today = todayStr();

  // Helper to format cow identification beautifully: Name (Breed) - Tag
  const getCowIdentity = (cow) => {
    if (!cow) return 'Cattle';
    const displayBreed = cow.breed ? cow.breed.replace(' (Buffalo)', '') : '';
    const breedText = displayBreed ? ` (${displayBreed})` : '';
    return `<strong>${cow.name || 'Cattle'}${breedText} - ${cow.tag}</strong>`;
  };

  // 1. SICK ANIMAL ALERTS
  // Gather cows flagged as Sick in their latest checkup
  cows.forEach(cow => {
    const cowHistory = health.filter(h => h.cowTag === cow.tag).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (cowHistory.length > 0 && cowHistory[0].status === 'Sick') {
      alerts.push({
        type: 'sick',
        icon: '🤒',
        text: `Cow ${getCowIdentity(cow)} is currently marked as **Sick**! Needs active treatment.`
      });
    }
  });

  // 2. HIGH TEMPERATURE ALERTS
  // Check any medical logs in the last 5 days with high fever
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const limitDate = fiveDaysAgo.toISOString().slice(0, 10);

  const recentFever = health.filter(h => h.date >= limitDate && h.temperature >= 103.0);
  // Remove duplicates per cow for temperature fever alerts
  const uniqueFeverCows = [];
  recentFever.forEach(h => {
    if (!uniqueFeverCows.includes(h.cowTag)) {
      uniqueFeverCows.push(h.cowTag);
      const cowObj = cows.find(c => c.tag === h.cowTag);
      alerts.push({
        type: 'fever',
        icon: '🔥',
        text: `High Fever! ${getCowIdentity(cowObj || { tag: h.cowTag })} recorded temperature of **${h.temperature.toFixed(1)}°F** on ${formatDate(h.date)}.`
      });
    }
  });

  // 3. VACCINATION DUE ALERTS
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().slice(0, 10);

  const dueSoon = vaccines.filter(v => v.date <= next7Str);
  dueSoon.forEach(v => {
    const isOverdue = v.date < today;
    const cowObj = cows.find(c => c.tag === v.cowTag);
    alerts.push({
      type: 'vaccine',
      icon: '💉',
      text: `Vaccination ${isOverdue ? '<strong>OVERDUE</strong>' : 'due soon'}: <strong>${v.vaccineName}</strong> for cow ${getCowIdentity(cowObj || { tag: v.cowTag })} on ${formatDate(v.date)}.`
    });
  });

  // 4. SMART LOW MILK PRODUCTION WARNINGS
  // Check each cow's running average of milk production (last 5 entries)
  // Alert if latest entry yield drops by 25% or more compared to their historical average
  cows.forEach(cow => {
    // Get milk logs for this cow, sorted by date & added time desc
    const cowMilkEntries = entries.filter(e => e.tag === cow.tag).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

    if (cowMilkEntries.length >= 3) {
      // Latest milk entry
      const latestEntry = cowMilkEntries[0];
      // Compare with the average of up to 5 preceding milk entries
      const historyEntries = cowMilkEntries.slice(1, 6);
      const sum = historyEntries.reduce((s, e) => s + e.litres, 0);
      const avg = sum / historyEntries.length;

      if (avg > 2.0) { // Only check if average yields are significant (>2 Litres)
        const pctDrop = ((avg - latestEntry.litres) / avg) * 100;

        if (pctDrop >= 25.0) {
          alerts.push({
            type: 'milk-drop',
            icon: '⚠️',
            text: `Milk Yield Drop! ${getCowIdentity(cow)}'s latest yield (**${latestEntry.litres.toFixed(1)}L**) is **${pctDrop.toFixed(0)}% lower** than her 5-entry avg (**${avg.toFixed(1)}L**). Possible illness!`
          });
        }
      }
    }
  });

  // Real-time badge count update
  const countBadge = document.getElementById('health-alerts-count');
  if (countBadge) {
    countBadge.textContent = alerts.length;
  }

  // Render Alerts List
  if (alerts.length === 0) {
    alertCard.classList.add('hidden');
    return;
  }

  alertCard.classList.remove('hidden');

  alerts.forEach(a => {
    const item = document.createElement('div');
    item.className = 'health-alert-item ' + a.type;

    // Smooth markdown resolution of asterisks into standard strong elements
    let cleanText = a.text;
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    item.innerHTML = `
      <span class="health-alert-warning-icon">${a.icon}</span>
      <span class="health-alert-text">${cleanText}</span>
      <!-- ${a.text} -->
    `;
    alertsList.appendChild(item);
  });
}

function deleteVaccine(index) {
  if (!confirm('Delete this vaccine reminder?')) return;
  const vaccines = getVaccines();
  vaccines.splice(index, 1);
  saveVaccines(vaccines);
  refreshVaccineList();
  compileSmartHealthAlerts(); // Keep Health alerts list perfectly in sync!
}

// ——— AUTHENTICATION & LOGIN FLOW ———
let currentOTP = null;
let notificationTimeout = null;

function getSessionOpenTime() {
  let sessionTime = sessionStorage.getItem('dairybook_session_time');
  if (!sessionTime) {
    const now = new Date();
    const options = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    };
    sessionTime = now.toLocaleString('en-US', options);
    sessionStorage.setItem('dairybook_session_time', sessionTime);
  }
  return sessionTime;
}

function checkAuth() {
  const isAuth = sessionStorage.getItem('dairybook_auth') === 'true';
  const tabBar = document.getElementById('tab-bar');

  if (isAuth) {
    document.body.classList.remove('nav-hidden');
    if (tabBar) tabBar.style.display = '';
    const loginPage = document.getElementById('page-login');
    if (loginPage && loginPage.classList.contains('active')) {
      navigateTo('page-home');
    }
  } else {
    document.body.classList.add('nav-hidden');
    if (tabBar) tabBar.style.display = 'none';
    navigateTo('page-login');
  }
}

function sendOTP() {
  const emailInput = document.getElementById('login-email');
  const emailVal = emailInput.value.trim();
  const emailError = document.getElementById('email-error');
  const sendBtn = document.getElementById('btn-send-otp');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailVal)) {
    emailError.classList.remove('hidden');
    emailInput.style.borderColor = 'var(--red)';
    return;
  }

  emailError.classList.add('hidden');
  emailInput.style.borderColor = '';

  sendBtn.disabled = true;
  sendBtn.innerHTML = `
    <span style="display:inline-flex; align-items:center; gap:8px;">
      <svg class="animate-spin" style="width:16px; height:16px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite;" viewBox="0 0 24 24"></svg>
      Sending Code...
    </span>
  `;

  if (!document.getElementById('auth-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'auth-spinner-style';
    style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    currentOTP = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Simulated OTP sent to", emailVal, ":", currentOTP);

    document.getElementById('display-target-email').textContent = emailVal;
    document.getElementById('login-step-email').classList.remove('active');
    document.getElementById('login-step-otp').classList.add('active');

    showOTPNotification(currentOTP);

    sendBtn.disabled = false;
    sendBtn.innerHTML = `<span>Send Verification Code</span>`;

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`otp-${i}`);
      if (el) {
        el.value = '';
        el.className = 'otp-input';
      }
    }
    setTimeout(() => {
      const firstOtp = document.getElementById('otp-1');
      if (firstOtp) firstOtp.focus();
    }, 100);
  }, 1200);
}

function showOTPNotification(code) {
  const noti = document.getElementById('email-notification');
  const notiCode = document.getElementById('noti-otp-code');
  if (!noti || !notiCode) return;

  notiCode.textContent = code;
  noti.classList.remove('hidden');
  noti.style.opacity = '1';
  noti.style.transform = 'translate(-50%, 0)';

  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    dismissNotification();
  }, 8000);
}

function dismissNotification() {
  const noti = document.getElementById('email-notification');
  if (!noti) return;
  noti.style.opacity = '0';
  noti.style.transform = 'translate(-50%, -40px)';
  setTimeout(() => {
    noti.classList.add('hidden');
  }, 300);
}

function backToEmail() {
  document.getElementById('login-step-otp').classList.remove('active');
  document.getElementById('login-step-email').classList.add('active');
  dismissNotification();
}

function otpInputHandler(el, index) {
  el.value = el.value.replace(/[^0-9]/g, '');

  if (el.value.length === 1 && index < 4) {
    const nextInput = document.getElementById(`otp-${index + 1}`);
    if (nextInput) nextInput.focus();
  }

  document.getElementById('otp-error').classList.add('hidden');
  for (let i = 1; i <= 4; i++) {
    const input = document.getElementById(`otp-${i}`);
    if (input && input.classList.contains('error')) {
      input.classList.remove('error');
    }
  }
}

function otpKeyHandler(e, index) {
  if (e.key === 'Backspace') {
    const el = document.getElementById(`otp-${index}`);
    if (el && el.value.length === 0 && index > 1) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.value = '';
      }
    }
  } else if (e.key === 'Enter' && index === 4) {
    verifyOTP();
  }
}

function verifyOTP() {
  let combinedVal = '';
  for (let i = 1; i <= 4; i++) {
    const val = document.getElementById(`otp-${i}`).value.trim();
    combinedVal += val;
  }

  const otpError = document.getElementById('otp-error');
  const card = document.querySelector('.login-card');
  const verifyBtn = document.getElementById('btn-verify-otp');

  if (combinedVal.length < 4) {
    otpError.classList.remove('hidden');
    otpError.textContent = 'Please fill out all 4 digits';
    return;
  }

  if (combinedVal !== currentOTP) {
    otpError.classList.remove('hidden');
    otpError.textContent = 'Invalid verification code, please try again';

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`otp-${i}`);
      if (el) el.classList.add('error');
    }

    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
    return;
  }

  otpError.classList.add('hidden');
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`otp-${i}`);
    if (el) {
      el.classList.remove('error');
      el.classList.add('success');
    }
  }

  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `✓ Verification Successful`;

  setTimeout(() => {
    dismissNotification();
    sessionStorage.setItem('dairybook_auth', 'true');
    checkAuth();
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = `<span>Verify & Unlock</span>`;
  }, 1000);
}

function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  sessionStorage.removeItem('dairybook_auth');
  checkAuth();
}

// ——— INIT ———
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('header-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  const openTimeEl = document.getElementById('session-open-time');
  if (openTimeEl) {
    openTimeEl.textContent = `🕒 Session opened: ${getSessionOpenTime()}`;
  }

  updateGlobalUnitUI();
  refreshHome();
  checkAuth();
});
