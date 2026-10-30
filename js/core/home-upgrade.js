/* JMB HUB home experience: personalized greeting and safe local quick actions. */
const $ = (selector, root=document) => root.querySelector(selector);
const greeting = $('#jmbHomeGreeting');
const sub = $('#jmbHomeSub');
const banner = $('.jmb-hub-banner');
if (banner) {
  const hour = new Date().getHours();
  const timeWord = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const localName = (() => {
    try {
      const raw = localStorage.getItem('jmbhub.user');
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.displayName === 'string' && data.displayName.trim()) return data.displayName.trim().split(/\s+/)[0].slice(0,32);
      }
    } catch {}
    return '';
  })();
  if (greeting) greeting.textContent = localName ? `${timeWord}, ${localName}.` : `${timeWord}.`;
  if (sub) sub.textContent = 'Your games, tools, Minecraft utilities and creator workspace are one tap away.';
}
document.querySelectorAll('[data-jmb-copy-link]').forEach(button => {
  button.addEventListener('click', async () => {
    const url = new URL(button.dataset.jmbCopyLink || location.href, location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      const old = button.textContent;
      button.textContent = 'Link copied ✓';
      setTimeout(() => { button.textContent = old; }, 1600);
    } catch {
      location.href = url;
    }
  });
});

/* Birthday celebration experience — dates are calculated in India Standard Time. */
(() => {
  const section = document.getElementById('jmbBirthday');
  if (!section) return;
  const byId = id => document.getElementById(id);
  const partsForIndia = date => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  };
  const headline = byId('birthdayHeadline');
  const kicker = byId('birthdayKicker');
  const subtitle = byId('birthdaySubtitle');
  const status = byId('birthdayStatus');
  const countdown = byId('birthdayCountdown');
  const times = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map(key => [key, section.querySelector('[data-birthday-time="' + key + '"]')]));
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetForYear = year => Date.UTC(year, 9, 28, 18, 30, 0); // 29 Oct, 00:00 IST
  let birthdayToday = false;
  let birthdayCountdownActive = false;

  const refreshBirthdayCopy = () => {
    const now = new Date();
    const india = partsForIndia(now);
    birthdayToday = india.month === 10 && india.day === 29;
    birthdayCountdownActive = india.month === 10 && (india.day === 28 || india.day === 29);
    if (birthdayToday) {
      if (headline) headline.textContent = 'Today is Jobin’s birthday! 🎉';
      if (kicker) kicker.textContent = 'IT’S 29 OCTOBER · CELEBRATION MODE ON';
      if (subtitle) subtitle.textContent = 'A whole new level unlocked for Jobin Mathew Biju. Drop some good vibes, explore JMB HUB and make today legendary!';
      if (status) status.textContent = '🎉 LIVE NOW · IT’S BIRTHDAY TIME';
    } else if (india.month === 10 && india.day === 28) {
      if (headline) headline.textContent = 'Jobin’s birthday is almost here!';
      if (kicker) kicker.textContent = 'THE COUNTDOWN IS ON · 29 OCTOBER';
      if (subtitle) subtitle.textContent = 'One more sleep until Jobin Mathew Biju’s birthday. Turn up the energy and get ready to celebrate!';
      if (status) status.textContent = '⏳ COUNTDOWN TO MIDNIGHT IST';
    } else if ((india.month < 10) || (india.month === 10 && india.day < 28)) {
      if (headline) headline.textContent = 'Jobin’s birthday. Main-character energy.';
      if (kicker) kicker.textContent = 'SAVE THE DATE · 29 OCTOBER';
      if (subtitle) subtitle.textContent = 'Big birthday energy for Jobin Mathew Biju on 29 October. Come for the celebration, stay for the JMB HUB.';
      if (status) status.textContent = '✨ BIRTHDAY MODE · 29 OCTOBER';
    } else {
      if (headline) headline.textContent = 'Jobin’s birthday. Main-character energy.';
      if (kicker) kicker.textContent = 'THE CELEBRATION LIVES ON';
      if (subtitle) subtitle.textContent = 'The birthday may last one day, but the good vibes and big goals last all year. Keep levelling up with JMB HUB!';
      if (status) status.textContent = '🚀 MAIN-CHARACTER ENERGY · ALL YEAR';
    }
    if (countdown) countdown.hidden = !birthdayCountdownActive;
    if (countdown) countdown.setAttribute('aria-label', birthdayToday ? 'Time elapsed since Jobin’s birthday began in India' : 'Countdown to Jobin’s birthday in India');
  };

  const updateTimer = () => {
    if (!birthdayCountdownActive) return;
    const now = Date.now();
    const india = partsForIndia(new Date(now));
    const target = targetForYear(india.year);
    let total = birthdayToday ? Math.floor((now - target) / 1000) : Math.ceil((target - now) / 1000);
    total = Math.max(0, total);
    const values = {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60
    };
    for (const key of Object.keys(times)) {
      if (times[key]) times[key].textContent = String(values[key]).padStart(2, '0');
    }
  };

  const burstConfetti = (count = 58) => {
    if (reducedMotion) return;
    const palette = ['#fb7185', '#f9a8d4', '#c4b5fd', '#67e8f9', '#fde047', '#86efac', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('span');
      bit.className = 'jmb-confetti-bit';
      bit.setAttribute('aria-hidden', 'true');
      bit.style.left = (Math.random() * 100) + 'vw';
      bit.style.backgroundColor = palette[i % palette.length];
      bit.style.animationDuration = (2.2 + Math.random() * 2.1) + 's';
      bit.style.animationDelay = (Math.random() * 0.45) + 's';
      bit.style.setProperty('--confetti-drift', ((Math.random() - 0.5) * 190) + 'px');
      bit.style.setProperty('--confetti-rotate', ((Math.random() * 900) - 450) + 'deg');
      document.body.appendChild(bit);
      window.setTimeout(() => bit.remove(), 5100);
    }
  };

  refreshBirthdayCopy();
  updateTimer();
  window.setInterval(() => {
    const wasBirthday = birthdayToday;
    refreshBirthdayCopy();
    updateTimer();
    if (!wasBirthday && birthdayToday && !reducedMotion) burstConfetti(72);
  }, 1000);

  const celebrateButton = section.querySelector('[data-birthday-celebrate]');
  if (celebrateButton) celebrateButton.addEventListener('click', () => {
    burstConfetti(72);
    window.JMBMusic?.birthdaySong?.();
    const original = celebrateButton.innerHTML;
    celebrateButton.innerHTML = '<span aria-hidden="true">🎊</span> LET’S GOOO! <span aria-hidden="true">✨</span>';
    window.setTimeout(() => { celebrateButton.innerHTML = original; }, 2200);
  });

  if (birthdayToday) burstConfetti(48);
})();
