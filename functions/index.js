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
 const snap=await walletRef(uid).get();
 const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
 const txSnap=await db.collection('coinTransactions').where('uid','==',uid).orderBy('createdAt','desc').limit(30).get();
 const transactions=txSnap.docs.map(d=>{
   const x=d.data();
   return {id:d.id,amount:cleanCoins(x.amount||0),description:x.description||'JMB Coin transaction',createdAt:x.createdAt?.toDate?.()?.toISOString?.()||''};
 });
 return {balance,transactions};
});

const STORE={
 supporter:{price:25,name:'JMB Supporter Badge'},
 'profile-glow':{price:50,name:'Profile Glow'},
 'name-highlight':{price:100,name:'Name Highlight'},
 'ad-credit':{price:100,name:'Ad Credit'},
 'vip-dashboard':{price:250,name:'VIP Dashboard Theme'},
 'creator-pack':{price:500,name:'Creator Pack'}
};

exports.purchaseCoinItem=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const itemId=String(request.data?.itemId||'');
 const item=STORE[itemId];
 if(!item)throw new HttpsError('invalid-argument','That store item does not exist.');
 const wallet=walletRef(uid);
 const tx=txRef();
 const purchase=db.collection('coinPurchases').doc();
 const result=await db.runTransaction(async t=>{
   const snap=await t.get(wallet);
   const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
   if(balance<item.price)throw new HttpsError('failed-precondition',`You need ${item.price} coins, but only have ${balance}.`);
   const next=cleanCoins(balance-item.price);
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount:-item.price,type:'purchase',description:`Purchased ${item.name}`,createdAt:FieldValue.serverTimestamp()});
   t.set(purchase,{uid,itemId,price:item.price,name:item.name,createdAt:FieldValue.serverTimestamp()});
   return next;
 });
 return {ok:true,balance:result};
});

const SKILL_GAMES=new Set([
 'snake','click','reaction','target','dodge','tap','number','math','color','whack','memory','tic','stack','coin','flappy','2048',
 'higher','word','aim','simon','pong','lights','connect','reaction2','guesscolor','jmbdash','quickdraw','maze','typing','oddone','colormemory','safegrid'
]);

exports.awardGameCoins=onCall(async request=>{
 requireAuth(request.auth);
 const uid=request.auth.uid;
 const gameId=String(request.data?.gameId||'');
 const score=Number(request.data?.score);
 if(!SKILL_GAMES.has(gameId))throw new HttpsError('invalid-argument','Coin rewards are only available for supported skill games.');
 if(!Number.isFinite(score)||score<=0||score>100000)throw new HttpsError('invalid-argument','Invalid game score.');

 const claim=db.collection('coinGameClaims').doc(`${uid}_${gameId}`);
 const wallet=walletRef(uid);
 const tx=txRef();
 const now=Date.now();
 const result=await db.runTransaction(async t=>{
   const claimSnap=await t.get(claim);
   const last=claimSnap.exists?Number(claimSnap.data().lastAwardMs||0):0;
   if(now-last<15000)throw new HttpsError('resource-exhausted','Please wait before earning another reward for this game.');
   const walletSnap=await t.get(wallet);
   const balance=cleanCoins(walletSnap.exists?walletSnap.data().balance||0:0);
   const reward=cleanCoins(0.00001+Math.min(1,score/10000)*0.00009);
   const next=cleanCoins(balance+reward);
   t.set(wallet,{uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(claim,{uid,gameId,lastAwardMs:now,lastScore:score,lastReward:reward,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid,amount:reward,type:'game_reward',gameId,score,description:`Game reward — ${gameId}`,createdAt:FieldValue.serverTimestamp()});
   return {reward,balance:next};
 });
 return {ok:true,...result};
});

exports.adminGiveCoins=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const email=String(request.data?.email||'').trim().toLowerCase();
 const amount=cleanCoins(request.data?.amount);
 const reason=String(request.data?.reason||'Admin reward').trim().slice(0,180)||'Admin reward';
 if(!email||!email.includes('@'))throw new HttpsError('invalid-argument','Enter a valid account email.');
 if(!Number.isFinite(amount)||amount<=0||amount>1e15)throw new HttpsError('invalid-argument','Enter a positive coin amount.');
 let target;
 try{target=await getAuth().getUserByEmail(email)}catch{throw new HttpsError('not-found','No JMBHUB account was found for that email.');}
 const wallet=walletRef(target.uid);
 const tx=txRef();
 const result=await db.runTransaction(async t=>{
   const snap=await t.get(wallet);
   const balance=cleanCoins(snap.exists?snap.data().balance||0:0);
   const next=cleanCoins(balance+amount);
   t.set(wallet,{uid:target.uid,balance:next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   t.set(tx,{uid:target.uid,amount,type:'admin_grant',description:reason,adminUid:request.auth.uid,adminEmail:request.auth.token.email||'',createdAt:FieldValue.serverTimestamp()});
   return next;
 });
 return {ok:true,uid:target.uid,email:target.email||email,balance:result,amount};
});
