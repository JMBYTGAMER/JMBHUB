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
