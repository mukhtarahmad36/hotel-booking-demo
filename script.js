// Azure Grand — ADVANCED demo booking engine.
// Front-end demo: bookings, inventory, payments (demo mode) and the admin panel
// run in the browser (localStorage). The production version moves all of this
// to a server database + real payment gateway — same screens, same flow.
const TAX_RATE = 0.12;

const DEFAULT_ROOMS = [
  { id:'deluxe-king', name:'Deluxe King Room', price:129, units:6, size:'32 m²', guests:2, bed:'King bed',
    img:'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=70&auto=format&fit=crop',
    badge:'Most Popular', feats:['Free Wi-Fi','Smart TV','Rain shower','Coffee maker','City view'] },
  { id:'deluxe-twin', name:'Deluxe Twin Room', price:119, units:8, size:'30 m²', guests:2, bed:'2 Single beds',
    img:'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=900&q=70&auto=format&fit=crop',
    badge:'', feats:['Free Wi-Fi','Smart TV','Work desk','Rain shower'] },
  { id:'executive', name:'Executive Room', price:169, units:4, size:'38 m²', guests:3, bed:'King bed + sofa',
    img:'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&q=70&auto=format&fit=crop',
    badge:'Lounge Access', feats:['Lounge access','Free Wi-Fi','Nespresso','Bathtub','Late checkout'] },
  { id:'family-suite', name:'Family Suite', price:219, units:3, size:'55 m²', guests:4, bed:'King + 2 singles',
    img:'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900&q=70&auto=format&fit=crop',
    badge:'Great for Families', feats:['2 bedrooms','Kitchenette','Free Wi-Fi','Smart TV','Board games'] },
  { id:'honeymoon', name:'Honeymoon Suite', price:259, units:2, size:'48 m²', guests:2, bed:'King bed',
    img:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=70&auto=format&fit=crop',
    badge:'Romantic Pick', feats:['Jacuzzi','Balcony','Welcome treats','Rose turndown','Late checkout'] },
  { id:'presidential', name:'Presidential Suite', price:499, units:1, size:'95 m²', guests:6, bed:'2 King bedrooms',
    img:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=70&auto=format&fit=crop',
    badge:'Luxury', feats:['Private terrace','Dining room','Butler service','Airport pickup','Spa access'] },
];

// ---------- tiny store (localStorage) ----------
const LS_ROOMS = 'ag2_rooms', LS_BOOKINGS = 'ag2_bookings';
const load = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function isoToday(offset=0){ const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
function isoFrom(base, offset){ const d=new Date(base); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }

let ROOMS = load(LS_ROOMS, null);
if (!ROOMS) { ROOMS = structuredClone(DEFAULT_ROOMS); save(LS_ROOMS, ROOMS); }

let BOOKINGS = load(LS_BOOKINGS, null);
if (!BOOKINGS) {
  // Seed sample reservations so the admin panel shows real-looking data (clearly resettable in Admin).
  const seed = [
    ['AGH-DEMO1','Sarah Mitchell','sarah.m@example.com','deluxe-king', 2, 4, 1, 2],
    ['AGH-DEMO2','Daniel Kim','daniel.k@example.com','executive', -1, 2, 1, 2],
    ['AGH-DEMO3','Ayesha Rahman','ayesha.r@example.com','family-suite', 5, 7, 1, 4],
    ['AGH-DEMO4','James Carter','james.c@example.com','deluxe-twin', 3, 5, 2, 2],
    ['AGH-DEMO5','Maria Garcia','maria.g@example.com','honeymoon', -6, -4, 1, 2],
  ];
  BOOKINGS = seed.map(([ref,name,email,roomId,a,b,rooms,guests]) => {
    const room = ROOMS.find(r => r.id === roomId);
    const ci = isoToday(a), co = isoToday(b);
    const n = Math.max(1, Math.round((new Date(co)-new Date(ci))/86400000));
    const sub = room.price * n * rooms;
    return { ref, name, email, phone:'+1 555 010 2233', roomId, roomName: room.name, ci, co, guests, rooms,
             total: sub + Math.round(sub*TAX_RATE), status:'Confirmed', payment:'Paid', created: isoToday(Math.min(a,0)) };
  });
  save(LS_BOOKINGS, BOOKINGS);
}
const persistBookings = () => save(LS_BOOKINGS, BOOKINGS);
const persistRooms = () => save(LS_ROOMS, ROOMS);

// ---------- helpers ----------
const $ = (s, el=document) => el.querySelector(s);
const money = n => '$' + n.toLocaleString('en-US', {maximumFractionDigits:0});
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
const nightsBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const overlaps = (b, ci, co) => b.ci < co && ci < b.co;

// Real availability: physical units minus confirmed bookings overlapping the stay.
function roomsLeft(room, ci, co){
  const used = BOOKINGS.filter(b => b.roomId === room.id && b.status === 'Confirmed' && overlaps(b, ci, co))
                       .reduce((s,b) => s + b.rooms, 0);
  return Math.max(0, room.units - used);
}

let stay = { checkin: isoToday(7), checkout: isoToday(9), guests: 2, rooms: 1 };

// ---------- rooms grid ----------
function renderRooms(){
  const n = Math.max(1, nightsBetween(stay.checkin, stay.checkout) || 1);
  $('#roomGrid').innerHTML = ROOMS.map(r => {
    const left = roomsLeft(r, stay.checkin, stay.checkout);
    const total = r.price * n * stay.rooms;
    const soldOut = left <= 0;
    return `<article class="room-card">
      <figure><img src="${r.img}" alt="${r.name}" loading="lazy" />
        ${r.badge ? `<span class="badge">${r.badge}</span>` : ''}
        ${soldOut ? `<span class="badge low" style="left:auto;right:.8rem">Sold Out</span>`
                  : left <= 2 ? `<span class="badge low" style="left:auto;right:.8rem">Only ${left} left</span>` : ''}
      </figure>
      <div class="room-body">
        <h3>${r.name}</h3>
        <p class="room-meta">${r.size} · Sleeps ${r.guests} · ${r.bed}</p>
        <ul class="room-feats">${r.feats.map(f=>`<li>${f}</li>`).join('')}</ul>
        <div class="room-foot">
          <div class="price"><strong>${money(r.price)}</strong><span>per night</span><span class="stay-total">${money(total)} for ${n} night${n>1?'s':''}${stay.rooms>1 ? ` × ${stay.rooms} rooms`:''} (before tax)</span></div>
          <button class="btn btn-gold" data-book="${r.id}" ${soldOut ? 'disabled style="opacity:.45;cursor:not-allowed"' : ''}>${soldOut ? 'Sold Out' : 'Book Now'}</button>
        </div>
      </div>
    </article>`;
  }).join('');
  $('#roomsSub').textContent = `${fmtDate(stay.checkin)} → ${fmtDate(stay.checkout)} · ${n} night${n>1?'s':''} · ${stay.guests} guest${stay.guests>1?'s':''} · ${stay.rooms} room${stay.rooms>1?'s':''} — availability & totals update live from real bookings.`;
  document.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', () => openBooking(b.dataset.book)));
}

// ---------- search bar ----------
const ciEl = $('#checkin'), coEl = $('#checkout');
ciEl.min = isoToday(0); coEl.min = isoToday(1);
ciEl.value = stay.checkin; coEl.value = stay.checkout;
ciEl.addEventListener('change', () => { if (coEl.value <= ciEl.value) coEl.value = isoFrom(ciEl.value, 1); coEl.min = isoFrom(ciEl.value, 1); });

$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  stay = { checkin: ciEl.value, checkout: coEl.value, guests: +$('#guests').value, rooms: +$('#roomsCount').value };
  renderRooms();
  $('#searchNote').textContent = `Showing live availability for ${fmtDate(stay.checkin)} → ${fmtDate(stay.checkout)} — scroll to pick your room.`;
  document.getElementById('rooms').scrollIntoView({behavior:'smooth'});
});

// ---------- booking modal: details -> payment -> confirmation ----------
let currentRoom = null, pendingBooking = null;
const backdrop = $('#modalBackdrop');

function priceBreakdown(room, ci, co, rooms){
  const n = Math.max(1, nightsBetween(ci, co) || 1);
  const sub = room.price * n * rooms, tax = Math.round(sub * TAX_RATE);
  return { n, sub, tax, total: sub + tax };
}
function renderPrice(){
  if (!currentRoom) return;
  const ci = $('#bkCheckin').value, co = $('#bkCheckout').value;
  const { n, sub, tax, total } = priceBreakdown(currentRoom, ci, co, stay.rooms);
  $('#priceBox').innerHTML = `
    <div class="row"><span>${money(currentRoom.price)} × ${n} night${n>1?'s':''}${stay.rooms>1?` × ${stay.rooms} rooms`:''}</span><span>${money(sub)}</span></div>
    <div class="row"><span>Taxes &amp; fees (12%)</span><span>${money(tax)}</span></div>
    <div class="row total"><span>Total</span><span>${money(total)}</span></div>`;
}
function showStep(id){
  ['bookingStep','paymentStep','confirmStep'].forEach(s => { document.getElementById(s).hidden = s !== id; });
}
function openBooking(id){
  currentRoom = ROOMS.find(r => r.id === id);
  showStep('bookingStep');
  $('#modalRoomSummary').innerHTML = `<strong>${currentRoom.name}</strong> · ${currentRoom.size} · Sleeps ${currentRoom.guests} · ${money(currentRoom.price)}/night · <span style="color:var(--gold2)">Free cancellation before check-in</span>`;
  $('#bkCheckin').value = stay.checkin; $('#bkCheckout').value = stay.checkout;
  $('#bkCheckin').min = isoToday(0); $('#bkCheckout').min = isoFrom(stay.checkin, 1);
  $('#bkGuests').value = String(Math.min(stay.guests, 6));
  renderPrice();
  backdrop.hidden = false; document.body.style.overflow = 'hidden';
}
function closeBooking(){ backdrop.hidden = true; document.body.style.overflow = ''; }
$('#modalClose').addEventListener('click', closeBooking);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeBooking(); });
$('#bkCheckin').addEventListener('change', () => { if ($('#bkCheckout').value <= $('#bkCheckin').value) $('#bkCheckout').value = isoFrom($('#bkCheckin').value, 1); renderPrice(); });
$('#bkCheckout').addEventListener('change', renderPrice);

// Step 1: guest details -> go to payment
$('#bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  const ci = $('#bkCheckin').value, co = $('#bkCheckout').value;
  if (roomsLeft(currentRoom, ci, co) < stay.rooms) { alert('Sorry — this room just sold out for those dates. Please pick other dates or a different room.'); return; }
  const { total } = priceBreakdown(currentRoom, ci, co, stay.rooms);
  pendingBooking = {
    ref: 'AGH-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    name: $('#bkName').value.trim(), email: $('#bkEmail').value.trim(), phone: $('#bkPhone').value.trim(),
    roomId: currentRoom.id, roomName: currentRoom.name, ci, co,
    guests: +$('#bkGuests').value, rooms: stay.rooms, notes: $('#bkNotes').value.trim(),
    total, status: 'Confirmed', payment: 'Paid', created: isoToday(0),
  };
  $('#paySummary').innerHTML = `<strong>${currentRoom.name}</strong> · ${fmtDate(ci)} → ${fmtDate(co)} · ${pendingBooking.guests} guest${pendingBooking.guests>1?'s':''}<div class="row total" style="margin-top:.4rem"><span>Total to pay now</span><span>${money(total)}</span></div>`;
  $('#payBtn').textContent = `Pay ${money(total)} →`;
  showStep('paymentStep');
});
$('#payBack').addEventListener('click', () => showStep('bookingStep'));

// Card input formatting (demo only)
$('#cardNum').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
});
$('#cardExp').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g,'').slice(0,4);
  e.target.value = v.length > 2 ? v.slice(0,2) + '/' + v.slice(2) : v;
});

// Step 2: demo payment -> save booking -> confirmation
$('#paymentForm').addEventListener('submit', e => {
  e.preventDefault();
  const btn = $('#payBtn');
  btn.disabled = true; btn.textContent = 'Processing payment…';
  setTimeout(() => {
    BOOKINGS.push(pendingBooking); persistBookings();
    const b = pendingBooking, n = nightsBetween(b.ci, b.co);
    $('#confirmBox').innerHTML = `
      <div class="row"><span>Booking reference</span><span class="ref">${b.ref}</span></div>
      <div class="row"><span>Guest</span><span>${b.name}</span></div>
      <div class="row"><span>Room</span><span>${b.roomName}</span></div>
      <div class="row"><span>Check-in</span><span>${fmtDate(b.ci)}</span></div>
      <div class="row"><span>Check-out</span><span>${fmtDate(b.co)}</span></div>
      <div class="row"><span>Guests</span><span>${b.guests}</span></div>
      <div class="row"><span>Payment</span><span style="color:var(--gold2)">Paid — card •••• ${$('#cardNum').value.replace(/\s/g,'').slice(-4)}</span></div>
      <div class="row"><span>Total (${n} night${n>1?'s':''}, incl. tax)</span><span>${money(b.total)}</span></div>`;
    btn.disabled = false;
    showStep('confirmStep');
    renderRooms();
  }, 900);
});
$('#confirmDone').addEventListener('click', closeBooking);

// ---------- manage booking (guest self-service) ----------
const manageBackdrop = $('#manageBackdrop');
function openManage(){ manageBackdrop.hidden = false; document.body.style.overflow = 'hidden'; $('#manageResult').innerHTML = ''; }
function closeManage(){ manageBackdrop.hidden = true; document.body.style.overflow = ''; }
$('#manageLink').addEventListener('click', e => { e.preventDefault(); openManage(); });
$('#manageClose').addEventListener('click', closeManage);
manageBackdrop.addEventListener('click', e => { if (e.target === manageBackdrop) closeManage(); });

$('#manageForm').addEventListener('submit', e => {
  e.preventDefault();
  const ref = $('#mgRef').value.trim().toUpperCase(), email = $('#mgEmail').value.trim().toLowerCase();
  const b = BOOKINGS.find(x => x.ref === ref && x.email.toLowerCase() === email);
  const box = $('#manageResult');
  if (!b) { box.innerHTML = `<p class="manage-msg err">No booking found with that reference and email. Please check and try again.</p>`; return; }
  const n = nightsBetween(b.ci, b.co);
  box.innerHTML = `
    <div class="confirm-box" style="margin:0">
      <div class="row"><span>Reference</span><span class="ref">${b.ref}</span></div>
      <div class="row"><span>Guest</span><span>${b.name}</span></div>
      <div class="row"><span>Room</span><span>${b.roomName}</span></div>
      <div class="row"><span>Dates</span><span>${fmtDate(b.ci)} → ${fmtDate(b.co)} (${n} night${n>1?'s':''})</span></div>
      <div class="row"><span>Total</span><span>${money(b.total)} · ${b.payment}</span></div>
      <div class="row"><span>Status</span><span class="pill ${b.status === 'Confirmed' ? 'ok' : 'bad'}">${b.status}</span></div>
    </div>
    ${b.status === 'Confirmed' ? `<button class="btn btn-danger btn-block" id="mgCancel">Cancel this booking</button>
    <p class="fineprint center" style="margin-top:.5rem">Free cancellation — the room goes straight back on sale.</p>` : ''}`;
  const cancelBtn = $('#mgCancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    b.status = 'Cancelled'; persistBookings(); renderRooms();
    box.innerHTML = `<p class="manage-msg ok">✓ Booking ${b.ref} cancelled. A refund of ${money(b.total)} would be issued to the original card in the full version.</p>`;
  });
});

// ---------- admin panel ----------
const adminView = $('#adminView');
const isAdmin = () => sessionStorage.getItem('ag2_admin') === '1';
function openAdmin(){
  adminView.hidden = false; document.body.style.overflow = 'hidden';
  $('#adminLogin').hidden = isAdmin(); $('#adminDash').hidden = !isAdmin();
  if (isAdmin()) renderAdmin();
}
function closeAdmin(){ adminView.hidden = true; document.body.style.overflow = ''; }
$('#adminLink').addEventListener('click', e => { e.preventDefault(); openAdmin(); });
$('#adminBack').addEventListener('click', closeAdmin);
$('#adminLoginForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#adUser').value.trim() === 'admin' && $('#adPass').value === 'admin123') {
    sessionStorage.setItem('ag2_admin', '1'); openAdmin();
  } else { $('#loginErr').hidden = false; }
});
$('#adminLogout').addEventListener('click', () => { sessionStorage.removeItem('ag2_admin'); openAdmin(); });
$('#resetData').addEventListener('click', () => {
  if (confirm('Reset all demo data (bookings, prices, inventory) back to the original samples?')) {
    localStorage.removeItem(LS_ROOMS); localStorage.removeItem(LS_BOOKINGS); location.reload();
  }
});

function renderAdmin(){
  const today = isoToday(0);
  const active = BOOKINGS.filter(b => b.status === 'Confirmed');
  const revenue = active.reduce((s,b) => s + b.total, 0);
  const tonight = active.filter(b => b.ci <= today && today < b.co).reduce((s,b) => s + b.rooms, 0);
  $('#statCards').innerHTML = `
    <div class="stat"><strong>${BOOKINGS.length}</strong><span>Total bookings</span></div>
    <div class="stat"><strong>${active.length}</strong><span>Confirmed</span></div>
    <div class="stat"><strong>${money(revenue)}</strong><span>Revenue (confirmed)</span></div>
    <div class="stat"><strong>${tonight}</strong><span>Rooms occupied tonight</span></div>`;

  $('#adminBookings').innerHTML = BOOKINGS.slice().reverse().map(b => `
    <tr>
      <td class="ref-cell">${b.ref}</td><td>${b.name}<br /><small>${b.email}</small></td>
      <td>${b.roomName}</td><td>${fmtDate(b.ci)} → ${fmtDate(b.co)}</td>
      <td>${b.rooms} rm · ${b.guests} g</td><td>${money(b.total)}</td>
      <td><span class="pill ${b.status === 'Confirmed' ? 'ok' : 'bad'}">${b.status}</span></td>
      <td>${b.status === 'Confirmed'
            ? `<button class="btn btn-small btn-danger" data-cancel="${b.ref}">Cancel</button>`
            : `<button class="btn btn-small btn-outline" data-restore="${b.ref}">Restore</button>`}</td>
    </tr>`).join('') || '<tr><td colspan="8">No bookings yet.</td></tr>';
  document.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', () => {
    const b = BOOKINGS.find(x => x.ref === btn.dataset.cancel); b.status = 'Cancelled'; persistBookings(); renderAdmin(); renderRooms();
  }));
  document.querySelectorAll('[data-restore]').forEach(btn => btn.addEventListener('click', () => {
    const b = BOOKINGS.find(x => x.ref === btn.dataset.restore); b.status = 'Confirmed'; persistBookings(); renderAdmin(); renderRooms();
  }));

  const counts = ROOMS.map(r => ({ name: r.name, n: active.filter(b => b.roomId === r.id).length }));
  const max = Math.max(1, ...counts.map(c => c.n));
  $('#adminChart').innerHTML = counts.map(c => `
    <div class="bar-row"><span>${c.name}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.n/max*100)}%"></div></div><strong>${c.n}</strong></div>`).join('');

  $('#adminRooms').innerHTML = ROOMS.map(r => `
    <tr>
      <td>${r.name}</td>
      <td><input type="number" min="1" value="${r.price}" id="price-${r.id}" class="mini-input" /></td>
      <td><input type="number" min="0" value="${r.units}" id="units-${r.id}" class="mini-input" /></td>
      <td><button class="btn btn-small btn-gold" data-save-room="${r.id}">Save</button></td>
    </tr>`).join('');
  document.querySelectorAll('[data-save-room]').forEach(btn => btn.addEventListener('click', () => {
    const r = ROOMS.find(x => x.id === btn.dataset.saveRoom);
    r.price = Math.max(1, +document.getElementById('price-' + r.id).value || r.price);
    r.units = Math.max(0, +document.getElementById('units-' + r.id).value || 0);
    persistRooms(); renderRooms(); btn.textContent = 'Saved ✓'; setTimeout(() => btn.textContent = 'Save', 1200);
  }));
}

// ---------- mobile nav ----------
const burger = $('#burger'), navLinks = $('#navLinks');
burger.addEventListener('click', () => { const open = navLinks.classList.toggle('open'); burger.setAttribute('aria-expanded', open); });
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

renderRooms();
