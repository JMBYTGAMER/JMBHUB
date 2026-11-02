const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {setGlobalOptions}=require('firebase-functions/v2');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {logger}=require('firebase-functions');

setGlobalOptions({region:'asia-south1',maxInstances:10});
initializeApp();
const db=getFirestore();

function owner(auth){return auth?.token?.email_verified===true && auth?.token?.email?.toLowerCase()==='jobinmathewbiju@gmail.com'}
function admin(auth){return auth?.token?.email_verified===true && (owner(auth)||auth?.token?.admin===true||auth?.token?.role==='admin')}
async function requireAuth(auth){
 if(!auth?.uid)throw new HttpsError('unauthenticated','Please sign in first.');
 try{
  const account=await getAuth().getUser(auth.uid);
  const block=await db.collection('accountBlocks').doc(auth.uid).get();
  if(account.disabled||block.exists)throw new HttpsError('permission-denied','This JMB HUB account is blocked. Contact the site owner.');
 }catch(error){
  if(error instanceof HttpsError)throw error;
  throw new HttpsError('unauthenticated','This account is no longer available. Please sign in again.');
 }
 const portal=await db.collection('settings').doc('portal').get();
 if(portal.exists&&portal.data()?.maintenance?.enabled===true&&!admin(auth))throw new HttpsError('unavailable','JMBHUB is in full maintenance mode. Please try again later.');
}
function cleanCoins(n){return Math.round(Number(n)*100000000)/100000000}
function walletRef(uid){return db.collection('wallets').doc(uid)}
function txRef(){return db.collection('coinTransactions').doc()}

exports.listUsers=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 // Return one bounded page per request instead of scanning the entire Auth directory.
 const result=await getAuth().listUsers(1000);
 return {
   users:result.users.map(u=>({uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',disabled:u.disabled,emailVerified:u.emailVerified,createdAt:u.metadata.creationTime||'',lastSignInAt:u.metadata.lastSignInTime||'',providerIds:u.providerData.map(p=>p.providerId),role:u.customClaims?.role||'',admin:u.customClaims?.admin===true})),
   nextPageToken:result.pageToken||null
 };
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

exports.getMyAccountStatus=onCall(async request=>{
 if(!request.auth?.uid)throw new HttpsError('unauthenticated','Please sign in first.');
 try{
  const [account,block]=await Promise.all([
   getAuth().getUser(request.auth.uid),
   db.collection('accountBlocks').doc(request.auth.uid).get()
  ]);
  return {disabled:account.disabled===true||block.exists,emailVerified:account.emailVerified===true};
 }catch{throw new HttpsError('unauthenticated','This account is no longer available.');}
});

exports.setUserBlocked=onCall(async request=>{
 if(!owner(request.auth))throw new HttpsError('permission-denied','Verified owner access required.');
 const uid=String(request.data?.uid||'').trim();
 const blocked=request.data?.blocked===true;
 const reason=String(request.data?.reason||'Account access updated by the owner.').trim().slice(0,180);
 if(!uid)throw new HttpsError('invalid-argument','Choose a valid account.');
 if(uid===request.auth.uid)throw new HttpsError('failed-precondition','The owner account cannot be blocked here.');
 let target;
 try{target=await getAuth().getUser(uid)}catch{throw new HttpsError('not-found','That account was not found.');}
 if(target.email?.toLowerCase()==='jobinmathewbiju@gmail.com')throw new HttpsError('failed-precondition','The owner account is protected.');
 const blockRef=db.collection('accountBlocks').doc(uid);
 if(blocked)await blockRef.set({uid,reason,blockedBy:request.auth.uid,blockedAt:FieldValue.serverTimestamp()});
 try{
  await getAuth().updateUser(uid,{disabled:blocked});
  await getAuth().revokeRefreshTokens(uid);
 }catch(error){
  if(blocked)await blockRef.delete().catch(()=>{});
  throw new HttpsError('internal','Firebase Authentication could not update this account.');
 }
 if(!blocked)await blockRef.delete();
 await db.collection('securityEvents').add({
  type:blocked?'account_blocked':'account_unblocked',targetUid:uid,targetEmail:target.email||'',
  actorUid:request.auth.uid,reason,createdAt:FieldValue.serverTimestamp()
 });
 logger.warn('JMB HUB account access changed',{targetUid:uid,actorUid:request.auth.uid,blocked,reason});
 return {ok:true,uid,disabled:blocked};
});

// Full date of birth is private; the public directory contains display name and month/day only.
exports.getMyBirthday=onCall(async request=>{
 await requireAuth(request.auth);
 const snap=await db.collection('userBirthdays').doc(request.auth.uid).get();
 if(!snap.exists)return {birthDate:'',showPublic:false};
 const data=snap.data();
 return {birthDate:String(data.birthDate||''),showPublic:data.showPublic===true};
});

exports.saveMyBirthday=onCall(async request=>{
 await requireAuth(request.auth);
 const uid=request.auth.uid,birthDate=String(request.data?.birthDate||'').trim(),showPublic=request.data?.showPublic===true;
 const privateRef=db.collection('userBirthdays').doc(uid);
 const current=await privateRef.get();
 const oldId=current.exists?String(current.data()?.directoryId||''):'';
 if(!birthDate){
  const batch=db.batch();
  if(oldId)batch.delete(db.collection('birthdayDirectory').doc(oldId));
  if(current.exists)batch.delete(privateRef);
  await batch.commit();
  return {ok:true,showPublic:false,removed:true};
 }
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
 if(!match)throw new HttpsError('invalid-argument','Choose a valid date of birth.');
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 const parsed=new Date(Date.UTC(year,month-1,day));
 const valid=parsed.getUTCFullYear()===year&&parsed.getUTCMonth()+1===month&&parsed.getUTCDate()===day;
 const todayIndia=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!valid||year<1900||birthDate>todayIndia)throw new HttpsError('invalid-argument','Choose a real date that is not in the future.');
 const account=await getAuth().getUser(uid);
 const displayName=String(account.displayName||'JMB HUB member').trim().slice(0,50)||'JMB HUB member';
 let publicId='';
 await db.runTransaction(async transaction=>{
  const privateSnap=await transaction.get(privateRef);
  const previousId=privateSnap.exists?String(privateSnap.data()?.directoryId||''):'';
  publicId=showPublic?(previousId||db.collection('birthdayDirectory').doc().id):'';
  transaction.set(privateRef,{uid,birthDate,showPublic,directoryId:publicId,updatedAt:FieldValue.serverTimestamp()});
  if(showPublic){
   transaction.set(db.collection('birthdayDirectory').doc(publicId),{displayName,month,day,updatedAt:FieldValue.serverTimestamp()});
  }else if(previousId){transaction.delete(db.collection('birthdayDirectory').doc(previousId))}
 });
 return {ok:true,showPublic,month,day};
});

exports.getCoinWallet=onCall(async request=>{
 await requireAuth(request.auth);
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
 await requireAuth(request.auth);
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
 'higher','word','aim','simon','pong','lights','connect','reaction2','guesscolor','jmbdash','quickdraw','maze','typing','oddone','colormemory','safegrid','rps','coinflip','dice','tilesprint','wordrush','patternlock','bubblepop','quickquiz'
]);

exports.awardGameCoins=onCall(async request=>{
 await requireAuth(request.auth);
 const uid=request.auth.uid;
 const gameId=String(request.data?.gameId||'');
 const score=Number(request.data?.score);
 if(!SKILL_GAMES.has(gameId))throw new HttpsError('invalid-argument','Coin rewards are only available for supported skill games.');
 if(!Number.isFinite(score)||score<=0||score>100000)throw new HttpsError('invalid-argument','Invalid game score.');

 const claim=db.collection('coinGameClaims').doc(`${uid}_${gameId}`);
 const cooldown=db.collection('coinGameCooldowns').doc(uid);
 const wallet=walletRef(uid);
 const tx=txRef();
 const now=Date.now();
 const result=await db.runTransaction(async t=>{
   const claimSnap=await t.get(claim);
   const cooldownSnap=await t.get(cooldown);
   const walletSnap=await t.get(wallet);
   const last=claimSnap.exists?Number(claimSnap.data().lastAwardMs||0):0;
   const globalLast=cooldownSnap.exists?Number(cooldownSnap.data().lastAwardMs||0):0;
   if(now-last<15000||now-globalLast<15000)throw new HttpsError('resource-exhausted','Please wait 15 seconds before earning another game reward.');
   const balance=cleanCoins(walletSnap.exists?walletSnap.data().balance||0:0);
   // A completed, score-earning session gives one virtual JMB Coin (not cash).
   const reward=1;
   const next=cleanCoins(balance+reward);
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(claim,{uid,gameId,lastAwardMs:now,lastScore:score,lastReward:reward,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(cooldown,{uid,lastAwardMs:now,lastGameId:gameId,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount:reward,type:'game_reward',gameId,score,description:`Game reward — ${gameId}`,createdAt:FieldValue.serverTimestamp()});
   return {reward,balance:next};
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
 try{
  await gift.set({uid:target.uid,email:target.email||email,title:'🪙 JMB Admin Reward',message,amount,status:'pending',type:'admin_gift',fromEmail:request.auth.token.email||'',createdAt:FieldValue.serverTimestamp()});
 }catch(error){
  logger.error('adminGiveCoins failed while saving the reward notification',{uid:target.uid,adminUid:request.auth.uid,code:error?.code||'',message:error?.message||String(error)});
  throw new HttpsError('internal','The reward notification could not be saved. Check the Cloud Function logs and Firestore status.');
 }
 return {ok:true,giftId:gift.id,email:target.email||email,amount,status:'pending'};
});

exports.claimCoinGift=onCall(async request=>{
 await requireAuth(request.auth);
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
  await requireAuth(request.auth);
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
  await requireAuth(request.auth);
  const snap = await db.collection('adCampaigns').where('uid','==',request.auth.uid).get();
  return {campaigns:snap.docs.map(d=>{const x=d.data();return {id:d.id,title:x.title,description:x.description,targetUrl:x.targetUrl,placement:x.placement,budgetCoins:x.budgetCoins,status:x.status,createdAt:x.createdAt?.toDate?.()?.toISOString?.()||'',expiresAt:x.expiresAt?.toDate?.()?.toISOString?.()||''};}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
});

exports.listPendingAds = onCall(async request => {
  if (!admin(request.auth)) throw new HttpsError('permission-denied','Admin access required.');
  const snap = await db.collection('adCampaigns').where('status','==','pending').limit(100).get();
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
  const snap = await db.collection('adCampaigns').where('status','==','approved').limit(100).get();
  const now = Date.now();
  const ads = snap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>
    (!a.expiresAt?.toMillis || a.expiresAt.toMillis() > now) &&
    (a.placement === 'sitewide' || a.placement === placement)
  ).map(a=>({id:a.id,title:a.title,description:a.description,targetUrl:a.targetUrl,placement:a.placement}));
  return {ads:ads.slice(0,3)};
});
