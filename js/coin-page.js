import {auth,db,app} from './core/firebase.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
const coins = value => Number(value || 0).toLocaleString(undefined, {maximumFractionDigits:8});
const call = name => {
 if (!app) throw new Error('JMB Coin services are not configured.');
 return httpsCallable(getFunctions(app, 'asia-south1'), name);
};

let user = null;
let unsubWallet = null;
let unsubPerks = null;
let owned = {};
let adCredits = 0;
let balance = 0;

const items = [
 {id:'supporter',perk:'supporter',icon:'⭐',name:'JMB Supporter Badge',price:25,desc:'Unlock a supporter badge for your JMB profile.'},
 {id:'profile-glow',perk:'profile-glow',icon:'✨',name:'Profile Glow',price:50,desc:'Unlock a glowing profile style.'},
 {id:'name-highlight',perk:'name-highlight',icon:'🌟',name:'Name Highlight',price:100,desc:'Unlock a highlighted display-name style.'},
 {id:'vip-dashboard',perk:'vip-dashboard',icon:'💎',name:'VIP Dashboard Theme',price:250,desc:'Unlock the premium dashboard theme.'},
 {id:'creator-pack',perk:'creator-pack',icon:'🚀',name:'Creator Pack',price:500,desc:'Unlock the creator profile pack.'}
];

function toast(message, kind='') {
 const el = document.createElement('div');
 el.className = 'toast ' + kind;
 el.textContent = message;
 document.body.append(el);
 window.setTimeout(() => el.remove(), 3400);
}

function renderStore() {
 const grid = $('#coinStore');
 if (!grid) return;
 grid.innerHTML = items.map(item => {
  const isOwned = Boolean(owned[item.perk]);
  return '<article class="card coin-item"><div class="service-art" style="font-size:40px" aria-hidden="true">' +
   item.icon + '</div><h3>' + esc(item.name) + '</h3><p class="muted">' + esc(item.desc) +
   '</p><div class="price">🪙 ' + item.price + ' coins</div><button class="btn ' +
   (isOwned ? 'btn-ghost' : 'btn-primary') + ' buy-item" data-id="' + esc(item.id) + '"' +
   (isOwned ? ' disabled' : '') + '>' + (isOwned ? '✓ Owned' : 'Unlock item') + '</button></article>';
 }).join('');
 grid.querySelectorAll('.buy-item').forEach(button => {
  button.addEventListener('click', () => buy(button));
 });
}

function renderPerks() {
 const box = $('#userPerks');
 if (!box) return;
 const names = {
  supporter:'⭐ JMB Supporter',
  'profile-glow':'✨ Profile Glow',
  'name-highlight':'🌟 Name Highlight',
  'vip-dashboard':'💎 VIP Dashboard',
  'creator-pack':'🚀 Creator Pack'
 };
 const active = Object.entries(names)
  .filter(([key]) => Boolean(owned[key]))
  .map(([, label]) => '<span class="jmb-perk-chip">' + label + '</span>');
 if (adCredits > 0) active.push('<span class="jmb-perk-chip">📢 Ad credits: ' + adCredits + '</span>');
 box.innerHTML = active.length ? active.join('') : '<span class="muted">No special perks unlocked yet.</span>';
}

function renderTransactions(transactions) {
 const box = $('#coinTransactions');
 if (!box) return;
 if (!transactions.length) {
  box.innerHTML = '<div class="empty">No transactions yet. Finish a supported game to earn your first JMB Coin.</div>';
  return;
 }
 box.innerHTML = transactions.map(tx => {
  const amount = Number(tx.amount || 0);
  const time = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '';
  const sign = amount >= 0 ? '+' : '';
  return '<article class="coin-tx"><div><b>' + esc(tx.description || 'JMB Coin transaction') +
   '</b><small class="muted" style="display:block">' + esc(time) +
   '</small></div><strong class="' + (amount >= 0 ? 'plus' : 'minus') + '">' + sign +
   esc(coins(amount)) + ' <small>JMB</small></strong></article>';
 }).join('');
}

async function loadTransactions() {
 const box = $('#coinTransactions');
 if (!box || !user) return;
 try {
  const response = await call('getCoinWallet')({});
  const data = response.data || {};
  balance = Number(data.balance || 0);
  owned = data.entitlements || {};
  adCredits = Number(data.adCredits || 0);
  $('#coinBalance').textContent = coins(balance);
  renderPerks();
  renderStore();
  renderTransactions(Array.isArray(data.transactions) ? data.transactions : []);
  $('#coinStatus').textContent = 'Wallet and transaction history are connected. JMB Coins are virtual website credits and have no cash value.';
 } catch (error) {
  box.innerHTML = '<div class="empty">Transaction history is temporarily unavailable.</div>';
  $('#coinStatus').textContent = error?.message || 'Could not load the JMB Coin wallet.';
 }
}

async function buy(button) {
 const item = items.find(entry => entry.id === button.dataset.id);
 if (!item || !user) return;
 button.disabled = true;
 button.textContent = 'Processing…';
 try {
  const response = await call('purchaseCoinItem')({itemId:item.id});
  const data = response.data || {};
  if (!data.ok) throw new Error('Purchase was not completed.');
  balance = Number(data.balance || 0);
  owned = data.perks || owned;
  adCredits = Number(data.adCredits ?? adCredits);
  $('#coinBalance').textContent = coins(balance);
  renderStore();
  renderPerks();
  window.JMBMusic?.win?.();
  toast('Unlocked ' + item.name + ' ✓', 'good');
  $('#coinStatus').textContent = 'Item unlocked. Your virtual balance is ' + coins(balance) + ' JMB Coins.';
  await loadTransactions();
 } catch (error) {
  toast(error?.message || 'Purchase failed.');
  button.disabled = false;
  button.textContent = 'Unlock item';
 }
}

onAuthStateChanged(auth, currentUser => {
 user = currentUser || null;
 unsubWallet?.();
 unsubWallet = null;
 unsubPerks?.();
 unsubPerks = null;
 adCredits = 0;
 owned = {};
 if (!currentUser) {
  location.replace('login.html?next=coins.html');
  return;
 }
 if (db) {
  unsubWallet = onSnapshot(doc(db, 'wallets', currentUser.uid), snapshot => {
   balance = Number(snapshot.exists() ? snapshot.data().balance || 0 : 0);
   $('#coinBalance').textContent = coins(balance);
  }, () => {
   $('#coinStatus').textContent = 'Live wallet updates are unavailable; refresh to retry.';
  });
  unsubPerks = onSnapshot(doc(db, 'userEntitlements', currentUser.uid), snapshot => {
   const entitlement = snapshot.exists() ? snapshot.data() : {};
   owned = entitlement.perks || {};
   adCredits = Number(entitlement.adCredits || 0);
   renderPerks();
   renderStore();
  }, () => {
   $('#coinStatus').textContent = 'Your perks are temporarily unavailable.';
  });
 }
 loadTransactions();
});

renderStore();
