/* course player */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lead = s => s.leadHtml ? `<div class="qaLead">${s.leadHtml}</div>` : '';
  const progress = (n, total, noun) => `<span class="xProgress" aria-live="polite">${n} of ${total} ${noun}</span>`;

  /* ---------- Hotspot map ---------- */
  function hotspot(body, s, api) {
    const M = window.SEA_MAP; const spots = s.spots; const seen = new Set();
    const ctx = M.context.map(d => `<path class="xCtx" d="${d}"/>`).join('');
    const mk = spots.map((sp, i) => { const m = M.markets[sp.code]; return `<path class="xMkt" data-i="${i}" d="${m.d}"/>`; }).join('');
    const pins = spots.map((sp, i) => { const m = M.markets[sp.code]; const L = (m.x / M.W * 100).toFixed(2), T = (m.y / M.H * 100).toFixed(2);
      return `<button class="xPin" data-i="${i}" style="left:${L}%;top:${T}%" aria-label="${esc(sp.title)}"><span class="xPinDot"></span><span class="xPinLabel">${esc(sp.short || sp.title)}</span></button>`; }).join('');
    body.innerHTML = `<div class="qaActivity">${lead(s)}<div class="xMapWrap"><div class="xMap"><svg viewBox="0 0 ${M.W} ${M.H}" aria-hidden="true">${ctx}${mk}</svg>${pins}</div><div class="xPanel" tabindex="-1"><p class="xPanelEmpty">Select a market on the map to explore it.</p></div></div><div class="xFoot">${progress(0, spots.length, 'markets explored')}</div></div>`;
    const panel = body.querySelector('.xPanel');
    function show(i) {
      const sp = spots[i]; seen.add(i);
      body.querySelectorAll('.xPin').forEach(b => { b.classList.toggle('active', +b.dataset.i === i); if (seen.has(+b.dataset.i)) b.classList.add('seen'); });
      body.querySelectorAll('.xMkt').forEach(p => { p.classList.toggle('active', +p.dataset.i === i); if (seen.has(+p.dataset.i)) p.classList.add('seen'); });
      panel.innerHTML = `<div class="xPanelKicker">${esc(sp.kicker || 'Market profile')}</div><h2>${esc(sp.title)}</h2>${sp.text ? `<p>${sp.text}</p>` : ''}${(sp.rows || []).map(r => `<div class="xRow"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}`;
      body.querySelector('.xFoot').innerHTML = progress(seen.size, spots.length, 'markets explored');
      if (seen.size === spots.length) api.mark();
    }
    body.querySelectorAll('.xPin').forEach(b => b.onclick = () => show(+b.dataset.i));
    body.querySelectorAll('.xMkt').forEach(p => p.addEventListener('click', () => show(+p.dataset.i)));
  }

  /* ---------- Sort (drag or select) ---------- */
  function sort(body, s, api) {
    const items = s.items.map((x, i) => ({ t: x[0], c: x[1], why: x[2], i }));
    let order = items.map((_, i) => i); let seed = (s.title.length * 31 + 7);
    for (let i = order.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor(seed / 233280 * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let selected = null; const placed = new Set();
    body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Drag each item onto the right category, or select an item and then select the category.</p>
      <div class="xSort"><div class="xPool">${order.map(i => `<button class="xChip" draggable="true" data-i="${i}">${esc(items[i].t)}</button>`).join('')}</div>
      <div class="xBins" style="grid-template-columns:repeat(${s.cats.length},1fr)">${s.cats.map((c, ci) => `<div class="xBin" data-c="${ci}" tabindex="0" role="button" aria-label="Place in ${esc(c)}"><div class="xBinHead">${esc(c)}</div><div class="xBinBody"></div></div>`).join('')}</div></div>
      <div class="xSortFb" aria-live="polite"></div><div class="xFoot">${progress(0, items.length, 'items placed')}</div></div>`;
    const fb = body.querySelector('.xSortFb');
    const chip = i => body.querySelector(`.xChip[data-i="${i}"]`);
    function selectChip(i) { selected = i; body.querySelectorAll('.xChip').forEach(c => c.classList.toggle('sel', +c.dataset.i === i)); }
    function drop(i, ci) {
      const it = items[i]; if (placed.has(i)) return;
      if (it.c === ci) {
        placed.add(i); const c = chip(i); c.classList.remove('sel'); c.classList.add('ok'); c.draggable = false; c.disabled = true;
        body.querySelector(`.xBin[data-c="${ci}"] .xBinBody`).appendChild(c);
        fb.innerHTML = `<div class="feedback good"><div class="fbText"><b>Correct.</b> ${esc(it.why)}</div></div>`;
        body.querySelector('.xFoot').innerHTML = progress(placed.size, items.length, 'items placed');
        if (placed.size === items.length) { api.mark(); fb.innerHTML += `<p class="xDone">All items placed. Select Next to continue.</p>`; }
      } else {
        const c = chip(i); c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 400);
        fb.innerHTML = `<div class="feedback bad"><div class="fbText"><b>Not quite.</b> ${esc(s.cats[ci])} is not the best fit for this item. Try another category.</div></div>`;
      }
      selected = null; body.querySelectorAll('.xChip').forEach(c => c.classList.remove('sel'));
    }
    body.querySelectorAll('.xChip').forEach(c => {
      c.onclick = () => selectChip(+c.dataset.i);
      c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.i); selectChip(+c.dataset.i); });
    });
    body.querySelectorAll('.xBin').forEach(b => {
      const ci = +b.dataset.c;
      b.onclick = () => { if (selected != null) drop(selected, ci); };
      b.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && selected != null) { e.preventDefault(); drop(selected, ci); } };
      b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('over'); });
      b.addEventListener('dragleave', () => b.classList.remove('over'));
      b.addEventListener('drop', e => { e.preventDefault(); b.classList.remove('over'); drop(+e.dataTransfer.getData('text/plain'), ci); });
    });
  }

  /* ---------- Flip cards ---------- */
  function flip(body, s, api) {
    const a = s.items; const seen = new Set();
    body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Select each card to flip it.</p><div class="xFlipGrid" style="grid-template-columns:repeat(${Math.min(a.length, a.length === 4 ? 2 : 3)},1fr)">${a.map((x, i) => `<button class="xFlip" data-i="${i}" aria-pressed="false"><span class="xFlipInner"><span class="xFront"><span class="xFrontTag">${esc(s.ask || 'Myth or fact?')}</span><span class="xFrontTitle">${esc(x[0])}</span><span class="xFrontHint" aria-hidden="true">Select to flip ↻</span></span><span class="xBack"><span class="xBackTitle">${esc(x[1] || x[0])}</span><span>${esc(x[2])}</span></span></span></button>`).join('')}</div><div class="xFoot">${progress(0, a.length, 'cards flipped')}</div></div>`;
    body.querySelectorAll('.xFlip').forEach(b => b.onclick = () => {
      const on = !b.classList.contains('flipped'); b.classList.toggle('flipped', on); b.setAttribute('aria-pressed', String(on));
      seen.add(+b.dataset.i); body.querySelector('.xFoot').innerHTML = progress(seen.size, a.length, 'cards flipped'); if (seen.size === a.length) api.mark();
    });
  }

  /* ---------- Sequence ---------- */
  function sequence(body, s, api) {
    const correct = s.items.map((x, i) => i); let order = correct.slice();
    let seed = s.title.length * 17 + 3;
    do { for (let i = order.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor(seed / 233280 * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } } while (order.every((v, i) => v === i));
    let tries = 0, solved = false;
    function draw(check) {
      body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Put the steps in the correct order using the arrows, then select Check order.</p><div class="xSeqWrap"><ol class="xSeq">${order.map((idx, pos) => {
        const st = check ? (idx === pos ? 'ok' : 'no') : '';
        return `<li class="xSeqItem ${st}"><span class="xSeqNum">${pos + 1}</span><span class="xSeqText"><b>${esc(s.items[idx][0])}</b>${check && idx === pos ? `<span>${esc(s.items[idx][1])}</span>` : ''}</span><span class="xSeqBtns"><button class="xUp" data-p="${pos}" aria-label="Move up" ${pos === 0 || solved ? 'disabled' : ''}>▲</button><button class="xDown" data-p="${pos}" aria-label="Move down" ${pos === order.length - 1 || solved ? 'disabled' : ''}>▼</button></span></li>`; }).join('')}</ol><div class="xSeqSide"><div class="quizActions"><button class="btn primary xCheck" ${solved ? 'disabled' : ''}>Check order</button>${tries >= 2 && !solved ? '<button class="btn secondary xShow">Show the correct order</button>' : ''}</div><div class="xSortFb" aria-live="polite">${check ? (solved ? `<div class="feedback good"><div class="fbText"><b>Correct.</b> ${esc(s.done || 'The steps are in the right order.')}</div></div>` : `<div class="feedback bad"><div class="fbText"><b>Not yet.</b> Steps marked in red are out of place. Adjust them and check again.</div></div>`) : ''}</div></div></div></div>`;
      body.querySelectorAll('.xUp').forEach(b => b.onclick = () => { const p = +b.dataset.p;[order[p - 1], order[p]] = [order[p], order[p - 1]]; draw(false); });
      body.querySelectorAll('.xDown').forEach(b => b.onclick = () => { const p = +b.dataset.p;[order[p + 1], order[p]] = [order[p], order[p + 1]]; draw(false); });
      body.querySelector('.xCheck').onclick = () => { tries++; solved = order.every((v, i) => v === i); if (solved) api.mark(); draw(true); };
      const sh = body.querySelector('.xShow'); if (sh) sh.onclick = () => { order = correct.slice(); solved = true; api.mark(); draw(true); };
    }
    draw(false);
  }

  /* ---------- Bars ---------- */
  function bars(body, s, api) {
    const a = s.items; const max = Math.max(...a.map(x => x[0])); const seen = new Set();
    body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Select each bar to see what it represents.</p><div class="xBarsWrap"><div class="xBars">${a.map((x, i) => `<button class="xBar" data-i="${i}"><span class="xBarLabel">${esc(x[1])}</span><span class="xBarTrack"><span class="xBarFill" style="width:${(x[0] / max * 100).toFixed(1)}%"></span></span><span class="xBarVal">${esc(s.prefix || '')}${x[0]}${esc(s.unit || '')}</span></button>`).join('')}</div><div class="xPanel"><p class="xPanelEmpty">Select a bar to see the detail.</p></div></div>${s.source ? `<p class="xSource">Source: ${esc(s.source)}</p>` : ''}<div class="xFoot">${progress(0, a.length, 'viewed')}</div></div>`;
    const panel = body.querySelector('.xPanel');
    body.querySelectorAll('.xBar').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; seen.add(i); body.querySelectorAll('.xBar').forEach(x => x.classList.toggle('active', x === b)); b.classList.add('seen');
      panel.innerHTML = `<div class="xPanelKicker">${esc(s.prefix || '')}${a[i][0]}${esc(s.unit || '')}</div><h2>${esc(a[i][1])}</h2><p>${esc(a[i][2])}</p>`;
      body.querySelector('.xFoot').innerHTML = progress(seen.size, a.length, 'viewed'); if (seen.size === a.length) api.mark();
    });
  }

  /* ---------- Checkout hotspots (phone mockup) ---------- */
  function checkout(body, s, api) {
    const m = s.mockup; const pins = s.pins; const seen = new Set();
    const pin = k => { const i = pins.findIndex(p => p.at === k); return i < 0 ? '' : `<button class="xCPin" data-i="${i}" aria-label="Hotspot ${i + 1}: ${esc(pins[i].title)}">${i + 1}</button>`; };
    body.innerHTML = `<div class="qaActivity">${lead(s)}<div class="xCheckoutWrap"><div class="xPhone"><div class="xPhoneScreen">
      <div class="xPhoneTop"><span>${esc(m.store)}</span><span class="xLang">${esc(m.lang)}${pin('lang')}</span></div>
      <div class="xPhoneTotal"><span>Total</span><b>${esc(m.total)}</b>${pin('total')}</div>
      <div class="xPhoneH">Choose how to pay${pin('order')}</div>
      ${m.methods.map((x, i) => `<div class="xMethod ${i === 0 ? 'sel' : ''}"><span class="xRadio"></span><span class="xMName">${esc(x[0])}</span><span class="xMTag">${esc(x[1])}</span>${i === 0 ? pin('logos') : ''}</div>`).join('')}
      <div class="xQR"><span class="xQRBox" aria-hidden="true"></span><span>${esc(m.qr)}</span>${pin('qr')}</div>
      <div class="xPayBtn">${esc(m.button)}${pin('button')}</div></div></div>
      <div class="xPanel" tabindex="-1"><p class="xPanelEmpty">Select each numbered hotspot on the checkout to see the design choice behind it.</p></div></div><div class="xFoot">${progress(0, pins.length, 'hotspots explored')}</div></div>`;
    const panel = body.querySelector('.xPanel');
    body.querySelectorAll('.xCPin').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; seen.add(i); body.querySelectorAll('.xCPin').forEach(x => x.classList.toggle('active', x === b)); b.classList.add('seen');
      panel.innerHTML = `<div class="xPanelKicker">Hotspot ${i + 1}</div><h2>${esc(pins[i].title)}</h2><p>${esc(pins[i].text)}</p>`;
      body.querySelector('.xFoot').innerHTML = progress(seen.size, pins.length, 'hotspots explored'); if (seen.size === pins.length) api.mark();
    });
  }


  /* ---------- Matching (select a term, then its match) ---------- */
  function match(body, s, api) {
    const pairs = s.pairs; const done = new Set(); let sel = null;
    let order = pairs.map((_, i) => i); let seed = s.title.length * 13 + pairs.length * 7 + 5;
    do { for (let i = order.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor(seed / 233280 * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } } while (order.length > 1 && order.every((v, i) => v === i));
    body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Select an item on the left, then select the description it matches on the right.</p>
      <div class="xMatch"><div class="xMatchCol">${pairs.map((p, i) => `<button class="xMTerm" data-i="${i}"><span class="xMNum">${i + 1}</span><span>${esc(p[0])}</span></button>`).join('')}</div>
      <div class="xMatchCol">${order.map(i => `<button class="xMDef" data-i="${i}"><span class="xMSlot" aria-hidden="true"></span><span>${esc(pairs[i][1])}</span></button>`).join('')}</div></div>
      <div class="xSortFb" aria-live="polite"></div><div class="xFoot">${progress(0, pairs.length, 'matched')}</div></div>`;
    const fb = body.querySelector('.xSortFb');
    body.querySelectorAll('.xMTerm').forEach(b => b.onclick = () => { if (done.has(+b.dataset.i)) return; sel = +b.dataset.i; body.querySelectorAll('.xMTerm').forEach(x => x.classList.toggle('sel', x === b)); });
    body.querySelectorAll('.xMDef').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; if (done.has(i)) return;
      if (sel == null) { fb.innerHTML = `<div class="feedback bad"><div class="fbText"><b>Select an item first.</b> Choose an item on the left, then its match.</div></div>`; return; }
      if (sel === i) {
        done.add(i); const t = body.querySelector(`.xMTerm[data-i="${i}"]`); t.classList.remove('sel'); t.classList.add('ok'); b.classList.add('ok');
        b.querySelector('.xMSlot').textContent = i + 1; t.disabled = true; b.disabled = true;
        const fin = done.size === pairs.length;
        fb.innerHTML = `<div class="feedback good"><div class="fbText"><b>Correct.</b> ${esc(pairs[i][2] || '')}${fin ? `<span class="xDoneIn">${esc(s.done || 'All items matched. Select Next to continue.')}</span>` : ''}</div></div>`;
        body.querySelector('.xFoot').innerHTML = progress(done.size, pairs.length, 'matched');
        if (fin) api.mark();
      } else {
        b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400);
        fb.innerHTML = `<div class="feedback bad"><div class="fbText"><b>Not quite.</b> That description does not match "${esc(pairs[sel][0])}". Try another.</div></div>`;
      }
      sel = null; body.querySelectorAll('.xMTerm').forEach(x => x.classList.remove('sel'));
    });
  }

  /* ---------- Image hotspots ---------- */
  function imghot(body, s, api) {
    const pins = s.pins; const seen = new Set();
    body.innerHTML = `<div class="qaActivity">${lead(s)}<p class="activityPrompt">Select each numbered hotspot on the image to learn more.</p><div class="xImgHotWrap"><div class="xImgHot"><img src="${esc(s.image.src)}" alt="${esc(s.image.alt)}">${pins.map((p, i) => `<button class="xCPin xIHPin" data-i="${i}" style="left:${p.x}%;top:${p.y}%" aria-label="Hotspot ${i + 1}: ${esc(p.title)}">${i + 1}</button>`).join('')}</div>
      <div class="xPanel" tabindex="-1"><p class="xPanelEmpty">Select a numbered hotspot to see the details.</p></div></div><div class="xFoot">${progress(0, pins.length, 'hotspots explored')}</div></div>`;
    const panel = body.querySelector('.xPanel');
    body.querySelectorAll('.xIHPin').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; seen.add(i); body.querySelectorAll('.xIHPin').forEach(x => x.classList.toggle('active', x === b)); b.classList.add('seen');
      panel.innerHTML = `<div class="xPanelKicker">Hotspot ${i + 1} of ${pins.length}</div><h2>${esc(pins[i].title)}</h2><p>${esc(pins[i].text)}</p>`;
      body.querySelector('.xFoot').innerHTML = progress(seen.size, pins.length, 'hotspots explored'); if (seen.size === pins.length) api.mark();
    });
  }

  window.CourseX = { render(body, s, api) { ({ hotspot, sort, flip, sequence, bars, checkout, match, imghot })[s.display](body, s, api); } };
})();
