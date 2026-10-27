const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {setGlobalOptions}=require('firebase-functions/v2');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');

setGlobalOptions({region:'asia-south1',maxInstances:10});
initializeApp();
const db=getFirestore();

function owner(auth){return auth?.token?.email?.toLowerCase()==='jobinmathewbiju@gmail.com'}
function admin(auth){return owner(auth)||auth?.token?.admin===true||auth?.token?.role==='admin'}
function requireAuth(auth){if(!auth?.uid)throw new HttpsError('unauthenticated','Please sign in first.')}
function cleanCoins(n){return Math.round(Number(n)*100000000)/100000000}
function walletRef(uid){return db.collection('wallets').doc(uid)}
function txRef(){return db.collection('coinTransactions').doc()}

exports.listUsers=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 let users=[],token;
 do { const result=await getAuth().listUsers(1000,token); users=users.concat(result.users); token=result.pageToken; } while(token);
 return {users:users.map(u=>({uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',disabled:u.disabled,emailVerified:u.emailVerified,createdAt:u.metadata.creationTime||'',lastSignInAt:u.metadata.lastSignInTime||'',providerIds:u.providerData.map(p=>p.providerId),role:u.customClaims?.role||'',admin:u.customClaims?.admin===true}))};
});

exports.setUserRole=onCall(async request=>{
 if(!owner(request.auth))throw new HttpsError('permission-denied','Owner access required.');
 const uid=String(request.data?.uid||'');
 const role=String(request.data?.role||'member');
 if(!uid||!['member','admin'].includes(role))throw new HttpsError('invalid-argument','Invalid user or role.');
 if(uid===request.auth.uid&&role!=='admin')throw new HttpsError('failed-precondition','The owner account cannot be downgraded here.');
 const user=await getAuth().getUser(uid);
 const claims={...(user.customClaims||{})};
 if(role==='admin'){claims.admin=true;claims.role='admin'}else{delete claims.admin;claims.role='member'}
 await getAuth().setCustomUserClaims(uid,claims);
 await getAuth().revokeRefreshTokens(uid);
 return {ok:true,uid,role};
});

exports.getCoinWallet=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const [snap,txSnap,perkSnap]=await Promise.all([
   walletRef(uid).get(),
   db.collection('coinTransactions').where('uid','==',uid).orderBy('createdAt','desc').limit(30).get(),
   db.collection('userEntitlements').doc(uid).get()
 ]);
 const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
 const transactions=txSnap.docs.map(d=>{
   const x=d.data();
   return {id:d.id,amount:cleanCoins(x.amount||0),type:x.type||'',description:x.description||'JMB Coin transaction',createdAt:x.createdAt?.toDate?.()?.toISOString?.()||''};
 });
 const ent=perkSnap.exists?perkSnap.data():{};
 return {balance,transactions,entitlements:ent.perks||{},adCredits:Number(ent.adCredits||0)};
});

const STORE={
 supporter:{price:25,name:'JMB Supporter Badge',perk:'supporter'},
 'profile-glow':{price:50,name:'Profile Glow',perk:'profile-glow'},
 'name-highlight':{price:100,name:'Name Highlight',perk:'name-highlight'},
 'vip-dashboard':{price:250,name:'VIP Dashboard Theme',perk:'vip-dashboard'},
 'creator-pack':{price:500,name:'Creator Pack',perk:'creator-pack'}
};

exports.purchaseCoinItem=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const itemId=String(request.data?.itemId||'');
 const item=STORE[itemId];
 if(!item)throw new HttpsError('invalid-argument','That store item does not exist.');
 const wallet=walletRef(uid);
 const entRef=db.collection('userEntitlements').doc(uid);
 const tx=txRef();
 const purchase=db.collection('coinPurchases').doc();
 const result=await db.runTransaction(async t=>{
   const snap=await t.get(wallet);
   const entSnap=await t.get(entRef);
   const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
   const ent=entSnap.exists?entSnap.data():{};
   const perks={...(ent.perks||{})};
   if(item.perk!=='ad-credit'&&perks[item.perk])throw new HttpsError('already-exists','You already own this item.');
   if(balance<item.price)throw new HttpsError('failed-precondition',`You need ${item.price} coins, but only have ${balance}.`);
   const next=cleanCoins(balance-item.price);
   let adCredits=Number(ent.adCredits||0);
   if(item.perk==='ad-credit')adCredits+=1;else perks[item.perk]=true;
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(entRef,{uid,perks,adCredits,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount:-item.price,type:'purchase',description:`Purchased ${item.name}`,createdAt:FieldValue.serverTimestamp()});
   t.set(purchase,{uid,itemId,price:item.price,name:item.name,createdAt:FieldValue.serverTimestamp()});
   return {balance:next,perks,adCredits};
 });
 return {ok:true,...result};
});

const SKILL_GAMES=new Set([
 'snake','click','reaction','target','dodge','tap','number','math','color','whack','memory','tic','stack','coin','flappy','2048',
 'higher','word','aim','simon','pong','lights','connect','reaction2','guesscolor','jmbdash','quickdraw','maze','typing','oddone','colormemory','safegrid','pattern','rps','coinflip','dice'
]);

exports.awardGameCoins=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const gameId=String(request.data?.gameId||'');
 const score=Number(request.data?.score);
 if(!SKILL_GAMES.has(gameId))throw new HttpsError('invalid-argument','Coin rewards are only available for supported skill games.');
 if(!Number.isFinite(score)||score<=0||score>100000)throw new HttpsError('invalid-argument','Invalid game score.');

 const claim=db.collection('coinGameClaims').doc(uid+'_'+gameId);
 const cooldown=db.collection('coinGameCooldowns').doc(uid);
 const now=Date.now();
 const day=new Date(now).toISOString().slice(0,10);
 const daily=db.collection('coinGameDailyCaps').doc(uid+'_'+day);
 const wallet=walletRef(uid);
 const tx=txRef();
 const result=await db.runTransaction(async t=>{
   const claimSnap=await t.get(claim);
   const cooldownSnap=await t.get(cooldown);
   const dailySnap=await t.get(daily);
   const walletSnap=await t.get(wallet);
   const last=claimSnap.exists?Number(claimSnap.data().lastAwardMs||0):0;
   const globalLast=cooldownSnap.exists?Number(cooldownSnap.data().lastAwardMs||0):0;
   const dailyCount=dailySnap.exists?Number(dailySnap.data().count||0):0;
   if(now-last<15000||now-globalLast<15000)throw new HttpsError('resource-exhausted','Please wait 15 seconds before earning another game reward.');
   if(dailyCount>=50)throw new HttpsError('resource-exhausted','You have reached the limit of 50 virtual game rewards today. Come back tomorrow.');
   const balance=cleanCoins(walletSnap.exists?walletSnap.data().balance||0:0);
   // One virtual JMB Coin per eligible completed session; it is not cash.
   const reward=1;
   const next=cleanCoins(balance+reward);
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(claim,{uid,gameId,lastAwardMs:now,lastScore:score,lastReward:reward,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(cooldown,{uid,lastAwardMs:now,lastGameId:gameId,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(daily,{uid,day,count:dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount:reward,type:'game_reward',gameId,score,description:'Game reward — '+gameId,createdAt:FieldValue.serverTimestamp()});
   return {reward,balance:next,dailyRewardsRemaining:49-dailyCount};
 });
 return {ok:true,...result};
});

exports.adminGiveCoins=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const email=String(request.data?.email||'').trim().toLowerCase();
 const amount=cleanCoins(request.data?.amount);
 const message=String(request.data?.reason||'A JMB HUB admin sent you a reward!').trim().slice(0,300)||'A JMB HUB admin sent you a reward!';
 if(!email||!email.includes('@'))throw new HttpsError('invalid-argument','Enter a valid account email.');
 if(!Number.isFinite(amount)||amount<=0||amount>1000000000)throw new HttpsError('invalid-argument','Enter a positive coin amount up to 1,000,000,000.');
 let target;
 try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found for that email.');}
 const gift=db.collection('coinNotifications').doc();
 await gift.set({uid:target.uid,email:target.email||email,title:'🪙 JMB Admin Reward',message,amount,status:'pending',type:'admin_gift',fromEmail:request.auth.token.email||'',createdAt:FieldValue.serverTimestamp()});
 return {ok:true,giftId:gift.id,email:target.email||email,amount,status:'pending'};
});

exports.claimCoinGift=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const id=String(request.data?.giftId||'');
 if(!/^[A-Za-z0-9_-]{10,150}$/.test(id))throw new HttpsError('invalid-argument','Invalid reward notification.');
 const giftRef=db.collection('coinNotifications').doc(id),wallet=walletRef(uid),tx=txRef();
 return db.runTransaction(async t=>{
   const giftSnap=await t.get(giftRef);
   if(!giftSnap.exists)throw new HttpsError('not-found','This reward could not be found.');
   const gift=giftSnap.data();
   if(gift.uid!==uid)throw new HttpsError('permission-denied','This reward belongs to another account.');
   if(gift.status!=='pending'||gift.type!=='admin_gift')throw new HttpsError('failed-precondition','This reward has already been collected or is unavailable.');
   const amount=cleanCoins(gift.amount);
   if(!Number.isFinite(amount)||amount<=0)throw new HttpsError('failed-precondition','This reward has an invalid amount.');
   const walletSnap=await t.get(wallet);
   const balance=cleanCoins(walletSnap.exists?walletSnap.data().balance||0:0);
   const next=cleanCoins(balance+amount);
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount,type:'admin_gift',description:gift.message||gift.title||'JMB admin reward',giftId:id,createdAt:FieldValue.serverTimestamp()});
   t.update(giftRef,{status:'claimed',claimedAt:FieldValue.serverTimestamp()});
   return {ok:true,amount,balance:next};
 });
});

exports.adminAdjustCoins=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const email=String(request.data?.email||'').trim().toLowerCase();
 const amount=cleanCoins(request.data?.amount);
 const reason=String(request.data?.reason||'Admin balance adjustment').trim().slice(0,180)||'Admin balance adjustment';
 if(!email||!email.includes('@'))throw new HttpsError('invalid-argument','Enter a valid account email.');
 if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>1000000000)throw new HttpsError('invalid-argument','Enter a non-zero adjustment up to +/-1,000,000,000 coins.');
 let target;
 try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found for that email.');}
 const wallet=walletRef(target.uid),tx=txRef(),notice=db.collection('coinNotifications').doc();
 const result=await db.runTransaction(async t=>{
   const snap=await t.get(wallet);
   const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
   const nextBalance=cleanCoins(balance+amount);
   if(nextBalance<0)throw new HttpsError('failed-precondition',`Cannot remove coins; the current balance is only ${balance}.`);
   t.set(wallet,{uid:target.uid,balance:nextBalance,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid:target.uid,amount,type:'admin_adjustment',description:reason,adminUid:request.auth.uid,adminEmail:request.auth.token.email||'',createdAt:FieldValue.serverTimestamp()});
   t.set(notice,{uid:target.uid,email:target.email||email,title:'JMB Coin wallet updated',message:`${amount>0?'Added':'Removed'} ${Math.abs(amount)} JMB Coins: ${reason}`,amount:0,status:'info',type:'admin_adjustment',createdAt:FieldValue.serverTimestamp()});
   return nextBalance;
 });
 return {ok:true,email:target.email||email,amount,balance:result};
});

exports.adminGetCoinAccount=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const email=String(request.data?.email||'').trim().toLowerCase();
 if(!email||!email.includes('@'))throw new HttpsError('invalid-argument','Enter a valid account email.');
 let target;
 try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found for that email.');}
 const [walletSnap,perkSnap,txSnap]=await Promise.all([
   walletRef(target.uid).get(),
   db.collection('userEntitlements').doc(target.uid).get(),
   db.collection('coinTransactions').where('uid','==',target.uid).orderBy('createdAt','desc').limit(15).get()
 ]);
 const ent=perkSnap.exists?perkSnap.data():{};
 return {uid:target.uid,email:target.email||email,displayName:target.displayName||'',balance:cleanCoins(walletSnap.exists?walletSnap.data().balance||0:0),perks:ent.perks||{},adCredits:Number(ent.adCredits||0),transactions:txSnap.docs.map(d=>{const x=d.data();return {amount:cleanCoins(x.amount||0),description:x.description||x.type||'Transaction',type:x.type||'',createdAt:x.createdAt?.toDate?.()?.toISOString?.()||''}})};
});

const ADMIN_PERKS=new Set(['supporter','profile-glow','name-highlight','vip-dashboard','creator-pack']);
exports.adminSetUserPerk=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const email=String(request.data?.email||'').trim().toLowerCase();
 const perk=String(request.data?.perk||'');
 const enabled=request.data?.enabled===true;
 if(!email||!email.includes('@'))throw new HttpsError('invalid-argument','Enter a valid account email.');
 if(!ADMIN_PERKS.has(perk))throw new HttpsError('invalid-argument','Choose a supported JMBHUB perk.');
 let target;
 try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found for that email.');}
 const entRef=db.collection('userEntitlements').doc(target.uid),notice=db.collection('coinNotifications').doc();
 const result=await db.runTransaction(async t=>{
   const snap=await t.get(entRef);
   const data=snap.exists?snap.data():{};
   const perks={...(data.perks||{})};
   if(enabled)perks[perk]=true;else delete perks[perk];
   t.set(entRef,{uid:target.uid,perks,adCredits:Number(data.adCredits||0),updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(notice,{uid:target.uid,email:target.email||email,title:enabled?'🎁 Special JMBHUB perk unlocked':'JMBHUB perk updated',message:`An admin ${enabled?'granted':'removed'} the ${perk} perk on your account.`,amount:0,status:'info',type:'perk_update',createdAt:FieldValue.serverTimestamp()});
   return perks;
 });
 return {ok:true,email:target.email||email,perk,enabled,perks:result};
});

// JMB Ad Network: all ad spending and refunds are handled server-side.
const AD_PLACEMENTS = new Set(['games','minecraft','tools','support','dashboard','ai','coins','ads','profile','home']);
const AD_MIN_TARGETED = 100;
const AD_MIN_SITEWIDE = 10000;
const AD_DAYS = 30;
const adRef = id => db.collection('adCampaigns').doc(id);
const adClean = v => String(v || '').trim().slice(0, 90);
const validHttpsUrl = value => {
  try { const u = new URL(String(value)); return u.protocol === 'https:' && u.hostname.includes('.'); }
  catch { return false; }
};

exports.createAdCampaign = onCall(async request => {
  requireAuth(request.auth);
  const uid = request.auth.uid;
  const title = adClean(request.data?.title);
  const description = String(request.data?.description || '').trim().slice(0, 220);
  const targetUrl = String(request.data?.targetUrl || '').trim();
  const requestedPlacement = String(request.data?.placement || 'games');
  const budget = cleanCoins(request.data?.budgetCoins);
  // Larger campaigns automatically become site-wide, as requested.
  const placement = budget >= AD_MIN_SITEWIDE || requestedPlacement === 'sitewide' ? 'sitewide' : requestedPlacement;
  if (title.length < 3) throw new HttpsError('invalid-argument','Enter an ad title with at least 3 characters.');
  if (!description) throw new HttpsError('invalid-argument','Enter a short ad description.');
  if (!validHttpsUrl(targetUrl)) throw new HttpsError('invalid-argument','Use a valid HTTPS destination link.');
  if ((!AD_PLACEMENTS.has(requestedPlacement) && requestedPlacement !== 'sitewide') || (!AD_PLACEMENTS.has(placement) && placement !== 'sitewide')) throw new HttpsError('invalid-argument','Choose a supported ad area.');
  const minimum = placement === 'sitewide' ? AD_MIN_SITEWIDE : AD_MIN_TARGETED;
  if (!Number.isFinite(budget) || budget < minimum || budget > 1000000) throw new HttpsError('invalid-argument',`This campaign requires at least ${minimum} coins.`);
  const wallet = walletRef(uid), campaign = db.collection('adCampaigns').doc(), tx = txRef();
  const result = await db.runTransaction(async t => {
    const snap = await t.get(wallet);
    const balance = cleanCoins(snap.exists ? snap.data().balance || 0 : 0);
    if (balance < budget) throw new HttpsError('failed-precondition',`You need ${budget} coins; your balance is ${balance}.`);
    t.set(wallet,{uid,balance:cleanCoins(balance-budget),updatedAt:FieldValue.serverTimestamp()},{merge:true});
    t.set(tx,{uid,amount:-budget,type:'ad_reservation',description:`Ad campaign reservation: ${title}`,createdAt:FieldValue.serverTimestamp()});
    t.set(campaign,{uid,title,description,targetUrl,placement,budgetCoins:budget,status:'pending',createdAt:FieldValue.serverTimestamp(),expiresAt:new Date(Date.now()+AD_DAYS*86400000),reviewedAt:null});
    return {id:campaign.id,balance:cleanCoins(balance-budget),status:'pending'};
  });
  return {ok:true,...result};
});

exports.listMyAdCampaigns = onCall(async request => {
  requireAuth(request.auth);
  const snap = await db.collection('adCampaigns').where('uid','==',request.auth.uid).get();
  return {campaigns:snap.docs.map(d=>{const x=d.data();return {id:d.id,title:x.title,description:x.description,targetUrl:x.targetUrl,placement:x.placement,budgetCoins:x.budgetCoins,status:x.status,createdAt:x.createdAt?.toDate?.()?.toISOString?.()||'',expiresAt:x.expiresAt?.toDate?.()?.toISOString?.()||''};}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
});

exports.listPendingAds = onCall(async request => {
  if (!admin(request.auth)) throw new HttpsError('permission-denied','Admin access required.');
  const snap = await db.collection('adCampaigns').where('status','==','pending').get();
  return {campaigns:snap.docs.map(d=>{const x=d.data();return {id:d.id,uid:x.uid,title:x.title,description:x.description,targetUrl:x.targetUrl,placement:x.placement,budgetCoins:x.budgetCoins,status:x.status,createdAt:x.createdAt?.toDate?.()?.toISOString?.()||''};})};
});

exports.reviewAdCampaign = onCall(async request => {
  if (!admin(request.auth)) throw new HttpsError('permission-denied','Admin access required.');
  const id = String(request.data?.id || '');
  const decision = String(request.data?.decision || '');
  if (!id || !['approve','reject'].includes(decision)) throw new HttpsError('invalid-argument','Invalid ad review request.');
  const campaign = adRef(id), tx = txRef();
  return db.runTransaction(async t => {
    const snap = await t.get(campaign);
    if (!snap.exists) throw new HttpsError('not-found','Campaign not found.');
    const ad = snap.data();
    if (ad.status !== 'pending') throw new HttpsError('failed-precondition','This campaign has already been reviewed.');
    if (decision === 'reject') {
      const wallet = walletRef(ad.uid), walletSnap = await t.get(wallet);
      const balance = cleanCoins(walletSnap.exists ? walletSnap.data().balance || 0 : 0);
      t.set(wallet,{uid:ad.uid,balance:cleanCoins(balance+Number(ad.budgetCoins||0)),updatedAt:FieldValue.serverTimestamp()},{merge:true});
      t.set(tx,{uid:ad.uid,amount:cleanCoins(ad.budgetCoins||0),type:'ad_refund',description:`Refund for rejected ad: ${ad.title||'Campaign'}`,createdAt:FieldValue.serverTimestamp()});
    }
    t.update(campaign,{status:decision === 'approve' ? 'approved' : 'rejected',reviewedAt:FieldValue.serverTimestamp(),reviewedBy:request.auth.uid});
    return {ok:true,status:decision === 'approve' ? 'approved' : 'rejected'};
  });
});

exports.listActiveAds = onCall(async request => {
  const placement = String(request.data?.placement || 'dashboard');
  if (!AD_PLACEMENTS.has(placement) && placement !== 'sitewide') throw new HttpsError('invalid-argument','Unsupported placement.');
  const snap = await db.collection('adCampaigns').where('status','==','approved').get();
  const now = Date.now();
  const ads = snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>
    (!a.expiresAt?.toMillis || a.expiresAt.toMillis() > now) &&
    (a.placement === 'sitewide' || a.placement === placement)
  ).map(a=>({id:a.id,title:a.title,description:a.description,targetUrl:a.targetUrl,placement:a.placement}));
  return {ads:ads.slice(0,3)};
});
