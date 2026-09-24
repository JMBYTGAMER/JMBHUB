const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {setGlobalOptions}=require('firebase-functions/v2');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
setGlobalOptions({region:'asia-south1',maxInstances:10});
initializeApp();

function owner(auth){return auth?.token?.email?.toLowerCase()==='jobinmathewbiju@gmail.com'}
function admin(auth){return owner(auth)||auth?.token?.admin===true||auth?.token?.role==='admin'}
exports.listUsers=onCall(async request=>{
 if(!admin(request.auth))throw new HttpsError('permission-denied','Admin access required.');
 const result=await getAuth().listUsers(1000);
 return {users:result.users.map(u=>({uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',disabled:u.disabled,emailVerified:u.emailVerified,createdAt:u.metadata.creationTime||'',lastSignInAt:u.metadata.lastSignInTime||'',providerIds:u.providerData.map(p=>p.providerId),role:u.customClaims?.role||'',admin:u.customClaims?.admin===true}))};
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
