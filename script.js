// Azure Grand — demo booking engine (front-end only; full version connects to a database + payment gateway)
const TAX_RATE = 0.12;

const ROOMS = [
  { id:'deluxe-king', name:'Deluxe King Room', price:129, size:'32 m²', guests:2, bed:'King bed',
    img:'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=70&auto=format&fit=crop',
    badge:'Most Popular', feats:['Free Wi-Fi','Smart TV','Rain shower','Coffee maker','City view'] },
  { id:'deluxe-twin', name:'Deluxe Twin Room', price:119, size:'30 m²', guests:2, bed:'2 Single beds',
    img:'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=900&q=70&auto=format&fit=crop',
    badge:'', feats:['Free Wi-Fi','Smart TV','Work desk','Rain shower'] },
  { id:'executive', name:'Executive Room', price:169, size:'38 m²', guests:3, bed:'King bed + sofa',
    img:'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&q=70&auto=format&fit=crop',
    badge:'Lounge Access', feats:['Lounge access','Free Wi-Fi','Nespresso','Bathtub','Late checkout'] },
  { id:'family-suite', name:'Family Suite', price:219, size:'55 m²', guests:4, bed:'King + 2 singles',
    img:'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900&q=70&auto=format&fit=crop',
    badge:'Great for Families', feats:['2 bedrooms','Kitchenette','Free Wi-Fi','Smart TV','Board games'] },
  { id:'honeymoon', name:'Honeymoon Suite', price:259, size:'48 m²', guests:2, bed:'King bed',
    img:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=70&auto=format&fit=crop',
    badge:'Romantic Pick', feats:['Jacuzzi','Balcony','Welcome treats','Rose turndown','Late checkout'] },
  { id:'presidential', name:'Presidential Suite', price:499, size:'95 m²', guests:6, bed:'2 King bedrooms',
    img:'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=70&auto=format&fit=crop',
    badge:'Luxury', feats:['Private terrace','Dining room','Butler service','Airport pickup','Spa access'] },
];

const $ = (s, el=document) => el.querySelector(s);
const money = n => '$' + n.toLocaleString('en-US', {maximumFractionDigits:0});
const fmtDate = d => d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'});

function isoToday(offset=0){ const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
function nightsBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
// Deterministic pseudo-availability for the demo: 1–5 rooms left depending on room + dates
function roomsLeft(room, ci, co){ let h=0; const s=room.id+ci+co; for(const c of s) h=(h*31 + c.charCodeAt(0))%997; return 1 + (h % 5); }

let stay = { checkin: isoToday(7), checkout: isoToday(9), guests: 2, rooms: 1 };

function renderRooms(){
  const n = Math.max(1, nightsBetween(stay.checkin, stay.checkout) || 1);
  $('#roomGrid').innerHTML = ROOMS.map(r => {
    const left = roomsLeft(r, stay.checkin, stay.checkout);
    const total = r.price * n * stay.rooms;
    return `<article class="room-card">
      <figure><img src="${r.img}" alt="${r.name}" loading="lazy" />
        ${r.badge ? `<span class="badge">${r.badge}</span>` : ''}
        ${left <= 2 ? `<span class="badge low" style="left:auto;right:.8rem">Only ${left} left</span>` : ''}
      </figure>
      <div class="room-body">
        <h3>${r.name}</h3>
        <p class="room-meta">${r.size} · Sleeps ${r.guests} · ${r.bed}</p>
        <ul class="room-feats">${r.feats.map(f=>`<li>${f}</li>`).join('')}</ul>
        <div class="room-foot">
          <div class="price"><strong>${money(r.price)}</strong><span>per night</span><span class="stay-total">${money(total)} for ${n} night${n>1?'s':''}${stay.rooms>1 ? ` × ${stay.rooms} rooms`:''} (before tax)</span></div>
          <button class="btn btn-gold" data-book="${r.id}">Book Now</button>
        </div>
      </div>
    </article>`;
  }).join('');
  $('#roomsSub').textContent = `${fmtDate(new Date(stay.checkin))} → ${fmtDate(new Date(stay.checkout))} · ${n} night${n>1?'s':''} · ${stay.guests} guest${stay.guests>1?'s':''} · ${stay.rooms} room${stay.rooms>1?'s':''} — totals update live.`;
  document.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', () => openBooking(b.dataset.book)));
}

// ---- search bar ----
const ciEl = $('#checkin'), coEl = $('#checkout');
ciEl.min = isoToday(0); coEl.min = isoToday(1);
ciEl.value = stay.checkin; coEl.value = stay.checkout;
ciEl.addEventListener('change', () => { if (coEl.value <= ciEl.value) coEl.value = isoTodayFrom(ciEl.value, 1); coEl.min = isoTodayFrom(ciEl.value, 1); });
function isoTodayFrom(base, offset){ const d=new Date(base); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }

$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  stay = { checkin: ciEl.value, checkout: coEl.value, guests: +$('#guests').value, rooms: +$('#roomsCount').value };
  renderRooms();
  $('#searchNote').textContent = `Showing availability for ${fmtDate(new Date(stay.checkin))} → ${fmtDate(new Date(stay.checkout))} — scroll to pick your room.`;
  document.getElementById('rooms').scrollIntoView({behavior:'smooth'});
});

// ---- booking modal ----
let currentRoom = null;
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
    <div class="row total"><span>Total due at hotel</span><span>${money(total)}</span></div>`;
}
function openBooking(id){
  currentRoom = ROOMS.find(r => r.id === id);
  $('#bookingStep').hidden = false; $('#confirmStep').hidden = true;
  $('#modalRoomSummary').innerHTML = `<strong>${currentRoom.name}</strong> · ${currentRoom.size} · Sleeps ${currentRoom.guests} · ${money(currentRoom.price)}/night · <span style="color:var(--gold2)">Free cancellation before check-in</span>`;
  $('#bkCheckin').value = stay.checkin; $('#bkCheckout').value = stay.checkout;
  $('#bkCheckin').min = isoToday(0); $('#bkCheckout').min = isoTodayFrom(stay.checkin, 1);
  $('#bkGuests').value = String(Math.min(stay.guests, 6));
  renderPrice();
  backdrop.hidden = false; document.body.style.overflow = 'hidden';
}
function closeBooking(){ backdrop.hidden = true; document.body.style.overflow = ''; }
$('#modalClose').addEventListener('click', closeBooking);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeBooking(); });
$('#bkCheckin').addEventListener('change', () => { if ($('#bkCheckout').value <= $('#bkCheckin').value) $('#bkCheckout').value = isoTodayFrom($('#bkCheckin').value, 1); renderPrice(); });
$('#bkCheckout').addEventListener('change', renderPrice);

$('#bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  const ci = $('#bkCheckin').value, co = $('#bkCheckout').value;
  const { n, total } = priceBreakdown(currentRoom, ci, co, stay.rooms);
  const ref = 'AGH-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  $('#confirmBox').innerHTML = `
    <div class="row"><span>Booking reference</span><span class="ref">${ref}</span></div>
    <div class="row"><span>Guest</span><span>${$('#bkName').value}</span></div>
    <div class="row"><span>Room</span><span>${currentRoom.name}</span></div>
    <div class="row"><span>Check-in</span><span>${fmtDate(new Date(ci))}</span></div>
    <div class="row"><span>Check-out</span><span>${fmtDate(new Date(co))}</span></div>
    <div class="row"><span>Guests</span><span>${$('#bkGuests').value}</span></div>
    <div class="row"><span>Total (${n} night${n>1?'s':''}, incl. tax)</span><span>${money(total)}</span></div>`;
  $('#bookingStep').hidden = true; $('#confirmStep').hidden = false;
});
$('#confirmDone').addEventListener('click', closeBooking);

// ---- mobile nav ----
const burger = $('#burger'), navLinks = $('#navLinks');
burger.addEventListener('click', () => { const open = navLinks.classList.toggle('open'); burger.setAttribute('aria-expanded', open); });
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

renderRooms();
