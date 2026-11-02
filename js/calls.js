import {guard} from './core/auth-guard.js';
import {db} from './core/firebase.js';
import {
  doc, setDoc, getDoc, updateDoc, runTransaction, collection, addDoc,
  onSnapshot, serverTimestamp, Timestamp, getDocs, deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const $ = selector => document.querySelector(selector);
const createButton = $('#createCall');
const joinButton = $('#joinCall');
const inviteInput = $('#inviteInput');
const overlay = $('#callOverlay');
const localVideo = $('#localVideo');
const remoteVideo = $('#remoteVideo');
const localPlaceholder = $('#localPlaceholder');
const remotePlaceholder = $('#remotePlaceholder');
const pageStatus = $('#pageStatus');
const inviteShare = $('#inviteShare');
const inviteOutput = $('#inviteOutput');
const copyStatus = $('#inviteCopyStatus');

const user = await guard();
let activeCall = null;
let mediaStream = null;
let peer = null;
let stopRoomListener = null;
let stopSignalListener = null;
let pendingCandidates = [];
let seenSignals = new Set();
let ending = false;

function setPageStatus(message, error = false) {
  if (!pageStatus) return;
  pageStatus.classList.toggle('error', Boolean(error));
  const text = pageStatus.querySelector('span:last-child');
  if (text) text.textContent = message;
}
function setCallStatus(message) {
  const target = $('#callConnectionStatus');
  if (target) target.textContent = message;
}
function canUseMedia() {
  if (!window.isSecureContext) throw new Error('Camera and microphone need a secure HTTPS connection.');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support camera and microphone access.');
  if (typeof RTCPeerConnection !== 'function') throw new Error('This browser does not support peer-to-peer video calls.');
}
async function requestMedia() {
  canUseMedia();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }
    });
    return stream;
  } catch (error) {
    const messages = {
      NotAllowedError: 'Camera or microphone permission was denied. Allow access in your browser settings and try again.',
      NotFoundError: 'No camera or microphone was found on this device.',
      NotReadableError: 'The camera or microphone is already being used by another app.',
      OverconstrainedError: 'This device could not provide the requested camera settings.'
    };
    throw new Error(messages[error?.name] || 'Could not start your camera and microphone. Check your device permissions.');
  }
}
function randomRoomId() {
  if (!crypto?.randomUUID) throw new Error('Secure room generation is unavailable in this browser. Update your browser and try again.');
  return crypto.randomUUID().replace(/-/g, '').toLowerCase();
}
function inviteUrlFor(roomId) {
  const url = new URL('./calls.html', location.href);
  url.searchParams.set('room', roomId);
  return url.href;
}
function openOverlay(role, inviteUrl = '') {
  $('#callDialogTitle').textContent = role === 'creator' ? 'Your private call' : 'Joined private call';
  inviteShare.hidden = role !== 'creator';
  inviteOutput.value = inviteUrl;
  $('#shareInvite').hidden = typeof navigator.share !== 'function';
  $('#toggleMic').disabled = false;
  $('#toggleCamera').disabled = false;
  $('#toggleMic').innerHTML = '<span>🎙️</span><small>Mute mic</small>';
  $('#toggleCamera').innerHTML = '<span>📷</span><small>Turn camera off</small>';
  overlay.hidden = false;
  document.body.classList.add('call-open');
}
function showLocalStream(stream) {
  mediaStream = stream;
  localVideo.srcObject = stream;
  localPlaceholder.hidden = true;
  localVideo.play().catch(() => {});
}
function stopLocalMedia() {
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  mediaStream = null;
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  if (localPlaceholder) localPlaceholder.hidden = false;
  if (remotePlaceholder) remotePlaceholder.hidden = false;
  $('#toggleMic').disabled = true;
  $('#toggleCamera').disabled = true;
  $('#toggleSpeaker').disabled = true;
  $('#toggleSpeaker').innerHTML = '<span>🔊</span><small>Mute speaker</small>';
}
function signalCollection() {
  return collection(db, 'calls', activeCall.roomId, 'signals');
}
function setupPeerConnection() {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  mediaStream.getTracks().forEach(track => peer.addTrack(track, mediaStream));
  peer.ontrack = event => {
    let stream = event.streams?.[0];
    if (!stream) {
      stream = new MediaStream();
      stream.addTrack(event.track);
    }
    remoteVideo.srcObject = stream;
    remotePlaceholder.hidden = true;
    $('#toggleSpeaker').disabled = false;
    remoteVideo.play().catch(() => setCallStatus('Remote video is ready. Tap the speaker control if you cannot hear audio.'));
    setCallStatus('Connected. Your camera and microphone are active.');
  };
  peer.onicecandidate = event => {
    if (!event.candidate || !activeCall) return;
    const candidate = event.candidate;
    addDoc(signalCollection(), {
      fromUid: user.uid,
      kind: 'ice',
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid ?? null,
      sdpMLineIndex: candidate.sdpMLineIndex ?? null,
      createdAt: serverTimestamp()
    }).catch(error => {
      console.warn('[JMB Calls] Could not send an ICE candidate.', error?.code || error?.message || error);
      setCallStatus('Connection setup is having trouble. Check that the latest Firestore rules are deployed.');
    });
  };
  peer.onconnectionstatechange = () => {
    const state = peer?.connectionState;
    if (state === 'connected') setCallStatus('Connected. You are talking directly to the other device.');
    else if (state === 'connecting') setCallStatus('Connecting your devices…');
    else if (state === 'disconnected') setCallStatus('The connection was interrupted. Checking whether it recovers…');
    else if (state === 'failed') setCallStatus('This network could not establish a direct connection. A network relay may be required.');
  };
}
async function addRemoteCandidate(data) {
  const candidate = {
    candidate: data.candidate,
    sdpMid: data.sdpMid ?? null,
    sdpMLineIndex: data.sdpMLineIndex ?? null
  };
  if (!peer?.remoteDescription) {
    pendingCandidates.push(candidate);
    return;
  }
  try {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.warn('[JMB Calls] ICE candidate could not be applied.', error?.message || error);
  }
}
async function flushRemoteCandidates() {
  const queued = pendingCandidates.splice(0);
  for (const candidate of queued) {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn('[JMB Calls] Queued ICE candidate could not be applied.', error?.message || error);
    }
  }
}
async function handleSignal(signalId, data) {
  if (!activeCall || !peer || !data || data.fromUid === user.uid) return;
  if (data.kind === 'ice') {
    await addRemoteCandidate(data);
    return;
  }
  if (data.kind === 'offer' && activeCall.role === 'guest' && !peer.remoteDescription) {
    await peer.setRemoteDescription({ type: 'offer', sdp: data.sdp });
    await flushRemoteCandidates();
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await setDoc(doc(db, 'calls', activeCall.roomId, 'signals', 'answer'), {
      fromUid: user.uid,
      kind: 'answer',
      sdp: answer.sdp,
      createdAt: serverTimestamp()
    });
    setCallStatus('Your device replied. Waiting for the other person to connect…');
    return;
  }
  if (data.kind === 'answer' && activeCall.role === 'creator' && !peer.remoteDescription) {
    await peer.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    await flushRemoteCandidates();
    setCallStatus('Invitation accepted. Connecting your devices…');
  }
}
function listenForSignals() {
  stopSignalListener = onSnapshot(signalCollection(), snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== 'added' || seenSignals.has(change.doc.id)) return;
      seenSignals.add(change.doc.id);
      handleSignal(change.doc.id, change.doc.data()).catch(error => {
        console.warn('[JMB Calls] Signal processing failed.', error?.code || error?.message || error);
        setCallStatus('Could not finish call setup. Check your connection and Firestore rules.');
      });
    });
  }, error => {
    console.warn('[JMB Calls] Signal listener failed.', error?.code || error?.message || error);
    setCallStatus('Call signalling is unavailable. The site owner may need to deploy the latest Firestore rules.');
  });
}
function listenForRoomEnd() {
  stopRoomListener = onSnapshot(activeCall.ref, snapshot => {
    if (!snapshot.exists()) {
      finishCall('This invitation is no longer available.', false);
      return;
    }
    const room = snapshot.data();
    if (room.status === 'ended') {
      finishCall('The other person ended the call.', false);
      return;
    }
    if (activeCall.role === 'creator' && room.joinerUid) {
      setCallStatus('Your invited person joined. Connecting…');
    }
  }, error => {
    console.warn('[JMB Calls] Room listener failed.', error?.code || error?.message || error);
    setCallStatus('Call status could not be refreshed. Check the Firestore rules deployment.');
  });
}
async function deleteMySignals(roomId) {
  try {
    const snap = await getDocs(collection(db, 'calls', roomId, 'signals'));
    const own = snap.docs.filter(item => item.data().fromUid === user.uid);
    await Promise.all(own.map(item => deleteDoc(item.ref).catch(() => {})));
  } catch (error) {
    console.warn('[JMB Calls] Temporary signalling cleanup was incomplete.', error?.code || error?.message || error);
  }
}
async function finishCall(message, notifyOther = true) {
  if (!activeCall || ending) return;
  ending = true;
  const room = activeCall;
  if (notifyOther) {
    try {
      await updateDoc(room.ref, { status: 'ended', endedAt: serverTimestamp() });
    } catch (error) {
      console.warn('[JMB Calls] Could not mark the room ended.', error?.code || error?.message || error);
      message += ' The other participant may still see the room as active until it expires.';
    }
  }
  stopRoomListener?.();
  stopSignalListener?.();
  stopRoomListener = null;
  stopSignalListener = null;
  peer?.close();
  peer = null;
  stopLocalMedia();
  pendingCandidates = [];
  seenSignals.clear();
  await deleteMySignals(room.roomId);
  activeCall = null;
  overlay.hidden = true;
  document.body.classList.remove('call-open');
  setPageStatus(message, false);
  ending = false;
}
async function createCall() {
  if (!db) throw new Error('JMB HUB account services are unavailable right now.');
  if (!user.emailVerified) throw new Error('Please verify your JMB HUB email before creating a call.');
  createButton.disabled = true;
  let stream = null;
  try {
    stream = await requestMedia();
    const roomId = randomRoomId();
    const ref = doc(db, 'calls', roomId);
    await setDoc(ref, {
      creatorUid: user.uid,
      joinerUid: null,
      status: 'waiting',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000)
    });
    activeCall = { roomId, ref, role: 'creator' };
    showLocalStream(stream);
    const inviteUrl = inviteUrlFor(roomId);
    openOverlay('creator', inviteUrl);
    setCallStatus('Waiting for your invited person to join. The invite link expires after 15 minutes.');
    setupPeerConnection();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await setDoc(doc(db, 'calls', roomId, 'signals', 'offer'), {
      fromUid: user.uid,
      kind: 'offer',
      sdp: offer.sdp,
      createdAt: serverTimestamp()
    });
    listenForRoomEnd();
    listenForSignals();
    setPageStatus('Your private call is ready. Share the invitation only with the person you trust.');
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (activeCall) await finishCall('Could not start the call: ' + (error?.message || 'Please try again.'), true);
    else setPageStatus(error?.message || 'Could not create the call.', true);
    if (!activeCall) stopLocalMedia();
  } finally {
    createButton.disabled = false;
  }
}
function extractRoomId(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Paste the invitation link first.');
  let roomId = raw;
  try {
    const parsed = new URL(raw);
    roomId = parsed.searchParams.get('room') || '';
  } catch {
    // A room ID may be pasted on its own.
  }
  if (!/^[a-f0-9]{32}$/i.test(roomId)) throw new Error('That invitation does not look valid. Paste the complete JMB HUB call link.');
  return roomId.toLowerCase();
}
async function joinCall() {
  if (!db) throw new Error('JMB HUB account services are unavailable right now.');
  if (!user.emailVerified) throw new Error('Please verify your JMB HUB email before joining a call.');
  joinButton.disabled = true;
  let stream = null;
  try {
    const roomId = extractRoomId(inviteInput.value);
    const ref = doc(db, 'calls', roomId);
    const roomSnap = await getDoc(ref);
    if (!roomSnap.exists()) throw new Error('This invitation has expired or is no longer available.');
    const roomData = roomSnap.data();
    if (roomData.creatorUid === user.uid) throw new Error('This is your own invitation. Send it to the other person and join from their account.');
    if (roomData.status !== 'waiting' || roomData.joinerUid) throw new Error('This call has already been joined or ended.');
    if (!roomData.expiresAt || roomData.expiresAt.toMillis() <= Date.now()) throw new Error('This invitation has expired. Ask for a new one.');
    stream = await requestMedia();
    await runTransaction(db, async transaction => {
      const fresh = await transaction.get(ref);
      if (!fresh.exists()) throw new Error('This invitation is no longer available.');
      const current = fresh.data();
      if (current.creatorUid === user.uid) throw new Error('You cannot join your own call invitation.');
      if (current.status !== 'waiting' || current.joinerUid) throw new Error('Someone else has already joined this invitation.');
      if (!current.expiresAt || current.expiresAt.toMillis() <= Date.now()) throw new Error('This invitation has expired. Ask for a new one.');
      transaction.update(ref, {
        joinerUid: user.uid,
        status: 'active',
        joinedAt: serverTimestamp()
      });
    });
    activeCall = { roomId, ref, role: 'guest' };
    showLocalStream(stream);
    openOverlay('guest');
    setCallStatus('Joining the private call…');
    setupPeerConnection();
    listenForRoomEnd();
    listenForSignals();
    setPageStatus('You joined the private call.');
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (activeCall) await finishCall('Could not join the call: ' + (error?.message || 'Please try again.'), true);
    else {
      setPageStatus(error?.message || 'Could not join the call.', true);
      remoteVideo.srcObject = null;
      localVideo.srcObject = null;
    }
  } finally {
    joinButton.disabled = false;
  }
}
async function copyInvite() {
  const value = inviteOutput.value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    copyStatus.textContent = 'Invitation link copied. Share it privately.';
  } catch {
    inviteOutput.focus();
    inviteOutput.select();
    copyStatus.textContent = 'Link selected. Copy it manually and share it privately.';
  }
}
$('#copyInvite').addEventListener('click', copyInvite);
$('#shareInvite').addEventListener('click', async () => {
  if (typeof navigator.share !== 'function') return;
  try {
    await navigator.share({ title: 'JMB HUB private call', text: 'Join my private JMB HUB video call.', url: inviteOutput.value });
  } catch (error) {
    if (error?.name !== 'AbortError') copyStatus.textContent = 'Sharing was unavailable. Use Copy link instead.';
  }
});
createButton.addEventListener('click', createCall);
joinButton.addEventListener('click', joinCall);
$('#closeCall').addEventListener('click', () => finishCall('You ended the call.'));
$('#endCall').addEventListener('click', () => finishCall('You ended the call.'));
$('#toggleMic').addEventListener('click', () => {
  if (!mediaStream) return;
  const tracks = mediaStream.getAudioTracks();
  if (!tracks.length) return;
  const enabled = tracks.some(track => track.enabled);
  tracks.forEach(track => { track.enabled = !enabled; });
  $('#toggleMic').innerHTML = enabled ? '<span>🔇</span><small>Unmute mic</small>' : '<span>🎙️</span><small>Mute mic</small>';
});
$('#toggleCamera').addEventListener('click', () => {
  if (!mediaStream) return;
  const tracks = mediaStream.getVideoTracks();
  if (!tracks.length) return;
  const enabled = tracks.some(track => track.enabled);
  tracks.forEach(track => { track.enabled = !enabled; });
  $('#toggleCamera').innerHTML = enabled ? '<span>🚫</span><small>Turn camera on</small>' : '<span>📷</span><small>Turn camera off</small>';
});
$('#toggleSpeaker').addEventListener('click', () => {
  if (!remoteVideo.srcObject) return;
  remoteVideo.muted = !remoteVideo.muted;
  $('#toggleSpeaker').innerHTML = remoteVideo.muted
    ? '<span>🔇</span><small>Enable sound</small>'
    : '<span>🔊</span><small>Mute speaker</small>';
  if (!remoteVideo.muted) {
    remoteVideo.play().catch(() => setCallStatus('Your browser could not start audio playback. Check the device volume and media permissions.'));
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overlay.hidden) finishCall('You ended the call.');
});
window.addEventListener('beforeunload', () => {
  peer?.close();
  mediaStream?.getTracks().forEach(track => track.stop());
});
const roomFromLink = new URL(location.href).searchParams.get('room');
if (roomFromLink && /^[a-f0-9]{32}$/i.test(roomFromLink)) {
  inviteInput.value = location.href;
  setPageStatus('Private invitation detected. Join only if you recognize and trust the person who sent it.');
}
if (!user.emailVerified) {
  setPageStatus('Verify your JMB HUB email before creating or joining private calls.', true);
  createButton.disabled = true;
  joinButton.disabled = true;
}
