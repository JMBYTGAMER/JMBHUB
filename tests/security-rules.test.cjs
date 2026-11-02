const test = require('node:test');
const fs = require('node:fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,serverTimestamp} = require('firebase/firestore');
const {ref,uploadBytes} = require('firebase/storage');

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-jmbhub',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
    storage: { rules: fs.readFileSync('firebase/storage.rules', 'utf8') }
  });
});
test.after(async () => { await env?.cleanup(); });

function userDb(uid='member-1', email='member@example.com', extra={}) {
  return env.authenticatedContext(uid,{email,email_verified:true,...extra}).firestore();
}

test('anonymous visitors cannot read private settings', async () => {
  const db=env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db,'settings/portal')));
});

test('signed-in users can read portal settings but cannot edit them', async () => {
  const db=userDb();
  await assertSucceeds(getDoc(doc(db,'settings/portal')));
  await assertFails(setDoc(doc(db,'settings/portal'),{maintenance:{enabled:true}}));
});

test('only a verified owner can write portal settings', async () => {
  const verified=userDb('site-owner','jobinmathewbiju@gmail.com');
  const unverified=env.authenticatedContext('unverified-owner',{
    email:'jobinmathewbiju@gmail.com',email_verified:false
  }).firestore();
  await assertSucceeds(setDoc(doc(verified,'settings/portal'),{
    maintenance:{enabled:false,message:'Rules test'}
  }));
  await assertFails(setDoc(doc(unverified,'settings/portal'),{
    maintenance:{enabled:true}
  }));
});

test('profiles cannot claim a false email-verification state', async () => {
  const db=env.authenticatedContext('member-2',{
    email:'member2@example.com',email_verified:false
  }).firestore();
  await assertFails(setDoc(doc(db,'profiles/member-2'),{
    uid:'member-2',email:'member2@example.com',displayName:'Member',
    photoURL:'',emailVerified:true,lastSeenAt:serverTimestamp()
  }));
});

test('members can create a valid profile but cannot read another profile', async () => {
  const db=userDb('member-3','member3@example.com');
  await assertSucceeds(setDoc(doc(db,'profiles/member-3'),{
    uid:'member-3',email:'member3@example.com',displayName:'Member Three',
    photoURL:'',emailVerified:true,lastSeenAt:serverTimestamp()
  }));
  await assertFails(getDoc(doc(db,'profiles/someone-else')));
});

test('members cannot modify ticket status or forged support replies', async () => {
  const db=userDb('ticket-owner','ticket@example.com');
  const ticket=doc(db,'tickets/ticket-1');
  await assertSucceeds(setDoc(ticket,{
    uid:'ticket-owner',email:'ticket@example.com',subject:'Account help',
    message:'Please help me sign in.',status:'open',
    createdAt:serverTimestamp(),updatedAt:serverTimestamp(),replies:[]
  }));
  await assertFails(updateDoc(ticket,{
    status:'closed',replies:[{from:'Member',message:'forged admin reply'}]
  }));
});

test('suggestions are limited to the signed-in user and 500 characters', async () => {
  const db=userDb('idea-owner','ideas@example.com');
  await assertSucceeds(setDoc(doc(db,'suggestions/idea-1'),{
    uid:'idea-owner',email:'ideas@example.com',text:'Add a puzzle game.',
    status:'new',createdAt:serverTimestamp()
  }));
  await assertFails(setDoc(doc(db,'suggestions/idea-2'),{
    uid:'idea-owner',email:'ideas@example.com',text:'x'.repeat(501),
    status:'new',createdAt:serverTimestamp()
  }));
});

test('clients cannot write wallets or coin transactions', async () => {
  const db=userDb('wallet-owner','wallet@example.com');
  await assertFails(setDoc(doc(db,'wallets/wallet-owner'),{
    uid:'wallet-owner',balance:0
  }));
  await assertFails(setDoc(doc(db,'coinTransactions/fake-transaction'),{
    uid:'wallet-owner',amount:999999,type:'game_reward'
  }));
});

test('Firebase Storage uploads are denied by default', async () => {
  const storage=env.authenticatedContext('storage-owner',{
    email:'storage@example.com',email_verified:true
  }).storage();
  await assertFails(uploadBytes(
    ref(storage,'users/storage-owner/avatar.png'),
    new Uint8Array([1,2,3]),
    {contentType:'image/png'}
  ));
});


test('birthday directory is public read-only while full birth dates remain private', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const adminDb=context.firestore();
    await setDoc(doc(adminDb,'birthdayDirectory/public-entry'),{displayName:'JMB Member',month:10,day:29});
    await setDoc(doc(adminDb,'userBirthdays/member-birthday'),{uid:'member-birthday',birthDate:'2010-10-29',showPublic:true});
  });
  const anonymous=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anonymous,'birthdayDirectory/public-entry')));
  await assertFails(getDoc(doc(anonymous,'userBirthdays/member-birthday')));
  await assertFails(setDoc(doc(anonymous,'birthdayDirectory/forged-entry'),{displayName:'Fake',month:1,day:1}));
  const owner=userDb('member-birthday','birthday@example.com');
  await assertSucceeds(getDoc(doc(owner,'userBirthdays/member-birthday')));
  await assertFails(setDoc(doc(owner,'userBirthdays/member-birthday'),{uid:'member-birthday',birthDate:'2010-10-29',showPublic:true}));
  const another=userDb('another-member','another@example.com');
  await assertFails(getDoc(doc(another,'userBirthdays/member-birthday')));
});

test('blocked accounts cannot read protected Firestore documents', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(),'accountBlocks/blocked-member'),{uid:'blocked-member',reason:'rules test'});
    await setDoc(doc(context.firestore(),'settings/portal'),{maintenance:{enabled:false}});
  });
  const blocked=userDb('blocked-member','blocked@example.com');
  await assertFails(getDoc(doc(blocked,'settings/portal')));
  await assertFails(setDoc(doc(blocked,'suggestions/blocked-idea'),{
    uid:'blocked-member',email:'blocked@example.com',text:'Should fail',
    status:'new',createdAt:serverTimestamp()
  }));
});
