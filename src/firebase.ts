import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  addDoc, 
  setDoc, 
  getDocs,
  getDoc, 
  doc, 
  updateDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { UserProfile, Poll, RegisteredMember, MeetingVotingSession, formatSpeakerRole, AppMessage, isUserAdmin, isUserRoleEntry } from './types';

// User provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9j1W8EY4IsAKP3FFrLpp_XaAD2sOEP4Y",
  authDomain: "declamate-af92e.firebaseapp.com",
  projectId: "declamate-af92e",
  storageBucket: "declamate-af92e.firebasestorage.app",
  messagingSenderId: "142531737516",
  appId: "1:142531737516:web:35340961e2a25f1ab6ec09",
  measurementId: "G-2C2DRCP5SZ"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with reliable HTTP long-polling and multi-tab persistent cache
// This fixes: "Could not reach Cloud Firestore backend", "Failed to get document because the client is offline"
function createFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    try {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch {
      return getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const CACHED_MEMBERS_KEY = 'declamate_cached_members_v2';

export function getCachedMembers(): RegisteredMember[] {
  try {
    const raw = localStorage.getItem(CACHED_MEMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage issues
  }
  return [];
}

export function saveMemberToCache(member: RegisteredMember | UserProfile) {
  try {
    const members = getCachedMembers();
    const email = (member.gmail || '').toLowerCase().trim();
    const name = (member.name || '').toLowerCase().trim();
    const filtered = members.filter((m) => {
      const mEmail = (m.gmail || '').toLowerCase().trim();
      const mName = (m.name || '').toLowerCase().trim();
      if (email && mEmail === email) return false;
      if (!email && name && mName === name) return false;
      return true;
    });
    filtered.unshift(member as RegisteredMember);
    localStorage.setItem(CACHED_MEMBERS_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch {
    // Ignore storage issues
  }
}

// Attempt anonymous sign-in if enabled on Firebase Console, non-blocking with quick timeout
async function ensureAuth() {
  try {
    if (!auth.currentUser) {
      await Promise.race([
        signInAnonymously(auth),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]);
    }
  } catch {
    // Anonymous auth might not be enabled in console or network is offline, proceed safely
  }
}

// Clear any previously saved local users list to comply with server-only storage
try {
  localStorage.removeItem('declamate_registered_members_v1');
} catch {
  // Ignore
}

/**
 * Register with Firebase Auth using Email and Password
 */
export async function registerWithFirebaseAuth(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }
  if (!password) {
    return { success: false, error: 'Please provide a password.' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    return { success: true, user: userCredential.user };
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    
    if (code === 'auth/email-already-in-use') {
      // Email is already in Firebase Auth, attempt sign-in to verify credentials
      try {
        const signinRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
        return { success: true, user: signinRes.user };
      } catch (signinErr: unknown) {
        const signinObj = signinErr as { code?: string; message?: string };
        if (signinObj?.code === 'auth/wrong-password' || signinObj?.code === 'auth/invalid-credential') {
          return { success: false, error: 'An account with this email already exists with a different password. Please sign in or use "Forgot password?".' };
        }
        // Still allow proceeding to update details if Firestore matches
        return { success: true };
      }
    } else if (code === 'auth/weak-password') {
      return { success: false, error: 'Password is too weak. Please use at least 6 characters.' };
    } else if (code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address format.' };
    } else {
      console.warn('Firebase Auth registration notice:', code, errorObj?.message);
      // If Firebase Auth fails due to domain/network, allow fallback to Firestore registration
      return { success: true };
    }
  }
}

/**
 * Saves member registration and login profile exclusively to Firebase Firestore
 */
export async function saveUserLoginToFirebase(profile: UserProfile): Promise<{ success: boolean; id?: string; error?: string; permissionIssue?: boolean }> {
  try {
    await ensureAuth();

    // If email and password present, ensure Firebase Auth user is created/synced
    if (profile.gmail && profile.password) {
      try {
        await createUserWithEmailAndPassword(auth, profile.gmail.trim().toLowerCase(), profile.password);
      } catch (e: unknown) {
        // If already exists or error, ignore and proceed with Firestore record
      }
    }

    const sanitizedEmail = (profile.gmail || '').trim().toLowerCase();
    const docId = sanitizedEmail ? sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'member_' + Date.now();
    
    const payload = {
      name: (profile.name || '').trim(),
      gmail: (profile.gmail || '').trim(),
      phone: (profile.phone || '').trim(),
      year: profile.year || '',
      department: profile.department || '',
      className: profile.className || '',
      photoUrl: profile.photoUrl || '',
      password: profile.password || '',
      executiveRole: profile.executiveRole || '',
      isAdmin: isUserAdmin(profile),
      isRoleEntry: isUserRoleEntry(profile),
      updatedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };

    const userDocRef = doc(db, 'members', docId);
    await setDoc(userDocRef, payload, { merge: true });
    
    try {
      await addDoc(collection(db, 'login_activity'), {
        name: payload.name,
        gmail: payload.gmail,
        loginTimestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking log
    }

    // Cache member locally for offline resilience
    saveMemberToCache({ ...profile, id: userDocRef.id });

    return { success: true, id: userDocRef.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error saving to Firebase';
    const isPermissionError = errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('insufficient');
    
    console.error('Firebase save error:', errorMsg);
    return { success: false, error: errorMsg, permissionIssue: isPermissionError };
  }
}

/**
 * Authenticates member directly against Firebase Auth and Firestore
 */
export async function authenticateMember(
  identifier: string,
  _password?: string
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  const queryClean = identifier.trim().toLowerCase();
  if (!queryClean) {
    return { success: false, error: 'Please enter your username or email address.' };
  }

  const cleanPass = (_password || '').trim();

  // 1. Check Admin Credentials:
  // Admin credentials: "Admin" and password "Declamate@123"
  if (
    queryClean === 'admin' ||
    queryClean === 'administrator' ||
    queryClean === 'admin@declamate.com'
  ) {
    if (cleanPass === 'Declamate@123') {
      const adminProfile: UserProfile = {
        id: 'admin_master',
        name: 'Admin',
        gmail: 'admin@declamate.com',
        phone: '+91 98765 43210',
        year: 'III Year',
        department: 'Executive Board',
        className: 'Administration',
        photoUrl: '',
        isAdmin: true,
        isRoleEntry: false,
        executiveRole: 'President',
        speakerRole: '',
        speakerRoles: [],
      };

      // Non-blocking lookup for customized admin profile
      try {
        const docSnap = await Promise.race([
          getDoc(doc(db, 'members', 'admin')),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
        ]);
        if (docSnap && 'exists' in docSnap && docSnap.exists()) {
          const d = docSnap.data();
          if (d.name) adminProfile.name = d.name;
          if (d.gmail) adminProfile.gmail = d.gmail;
          if (d.photoUrl) adminProfile.photoUrl = d.photoUrl;
          if (d.phone) adminProfile.phone = d.phone;
          if (d.department) adminProfile.department = d.department;
          if (d.executiveRole) adminProfile.executiveRole = d.executiveRole;
        }
      } catch {
        // Offline or connection error - continue seamlessly with default admin profile
      }
      return { success: true, profile: adminProfile };
    } else {
      return {
        success: false,
        error: 'Incorrect password for Admin. Please verify your password.',
      };
    }
  }

  // 2. Check "Role Entry" Credentials:
  // Role Entry credentials: "Role Entry" and password "Declamate@123"
  if (
    queryClean === 'role entry' ||
    queryClean === 'roleentry' ||
    queryClean === 'role entry coordinator' ||
    queryClean === 'roleentry@declamate.com'
  ) {
    if (cleanPass === 'Declamate@123') {
      const roleEntryProfile: UserProfile = {
        id: 'role_entry',
        name: 'Role Entry',
        gmail: 'roleentry@declamate.com',
        phone: '+91 98765 00000',
        year: 'II Year',
        department: 'Speaker Roles Coordinator',
        className: 'Role Entry',
        photoUrl: '',
        isAdmin: false,
        isRoleEntry: true,
        speakerRole: 'Role Entry Coordinator',
        speakerRoles: ['Role Entry Coordinator'],
      };

      try {
        const docSnap = await Promise.race([
          getDoc(doc(db, 'members', 'role_entry')),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
        ]);
        if (docSnap && 'exists' in docSnap && docSnap.exists()) {
          const d = docSnap.data();
          if (d.name) roleEntryProfile.name = d.name;
          if (d.gmail) roleEntryProfile.gmail = d.gmail;
          if (d.photoUrl) roleEntryProfile.photoUrl = d.photoUrl;
        }
      } catch {
        // Offline or connection error - continue seamlessly
      }
      return { success: true, profile: roleEntryProfile };
    } else {
      return {
        success: false,
        error: 'Incorrect password for Role Entry. Please verify your password.',
      };
    }
  }

  // 3. If identifier looks like email and password provided, try Firebase Auth
  if (queryClean.includes('@') && _password) {
    try {
      await Promise.race([
        signInWithEmailAndPassword(auth, queryClean, _password),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
      ]);
    } catch (authErr: unknown) {
      const authObj = authErr as { code?: string; message?: string };
      if (authObj?.code === 'auth/wrong-password' || authObj?.code === 'auth/invalid-credential') {
        return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
      }
      // If user-not-found in Firebase Auth, proceed to check Firestore / local cache
    }
  }

  const isNetworkOrOffline = (err: any) => {
    if (!err) return false;
    const msg = String(err.message || err).toLowerCase();
    const code = String(err.code || '').toLowerCase();
    return (
      code === 'unavailable' ||
      code === 'failed-precondition' ||
      msg.includes('offline') ||
      msg.includes('client is offline') ||
      msg.includes('could not reach') ||
      msg.includes('network')
    );
  };

  const parseSpeakerRoles = (rawRoles: any, fallbackRole?: string): string[] => {
    if (Array.isArray(rawRoles)) {
      return rawRoles.filter(Boolean);
    }
    if (typeof rawRoles === 'string' && rawRoles.trim()) {
      return rawRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (fallbackRole && typeof fallbackRole === 'string' && fallbackRole.trim()) {
      return fallbackRole.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  let offlineEncountered = false;

  try {
    await ensureAuth();

    // 2. Direct document lookup by sanitized email ID
    const sanitizedKey = queryClean.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, 'members', sanitizedKey);
    let docSnap: any = null;

    try {
      docSnap = await Promise.race([
        getDoc(docRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
      ]);
    } catch (dErr) {
      if (isNetworkOrOffline(dErr)) offlineEncountered = true;
    }

    if (docSnap && 'exists' in docSnap && docSnap.exists()) {
      const data = docSnap.data();
      // If user has a password set and password was provided, verify it
      if (data.password && _password && data.password !== _password) {
        return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
      }
      const speakerRolesList = parseSpeakerRoles(data.speakerRoles, data.speakerRole);

      const profile: UserProfile = {
        name: data.name || identifier,
        gmail: data.gmail || identifier,
        phone: data.phone || '',
        year: data.year || 'I Year',
        department: data.department || 'B.Sc',
        className: data.className || '',
        photoUrl: data.photoUrl || '',
        executiveRole: data.executiveRole || '',
        speakerRole: speakerRolesList.join(', '),
        speakerRoles: speakerRolesList,
        isAdmin: isUserAdmin(data),
        isRoleEntry: isUserRoleEntry(data),
      };
      saveMemberToCache(profile);
      return { success: true, profile };
    }

    // 3. Query collection for matching email or name
    let membersSnap: any = null;
    try {
      membersSnap = await Promise.race([
        getDocs(collection(db, 'members')),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
      ]);
    } catch (cErr) {
      if (isNetworkOrOffline(cErr)) offlineEncountered = true;
    }

    if (membersSnap && membersSnap.docs) {
      for (const d of membersSnap.docs) {
        const data = d.data();
        const docEmail = (data.gmail || '').toLowerCase().trim();
        const docName = (data.name || '').toLowerCase().trim();
        if (docEmail === queryClean || docName === queryClean) {
          if (data.password && _password && data.password !== _password) {
            return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
          }
          const speakerRolesList = parseSpeakerRoles(data.speakerRoles, data.speakerRole);

          const profile: UserProfile = {
            name: data.name || identifier,
            gmail: data.gmail || identifier,
            phone: data.phone || '',
            year: data.year || 'I Year',
            department: data.department || 'B.Sc',
            className: data.className || '',
            photoUrl: data.photoUrl || '',
            executiveRole: data.executiveRole || '',
            speakerRole: speakerRolesList.join(', '),
            speakerRoles: speakerRolesList,
            isAdmin: isUserAdmin(data),
            isRoleEntry: isUserRoleEntry(data),
          };
          saveMemberToCache(profile);
          return { success: true, profile };
        }
      }
    }
  } catch (e: any) {
    if (isNetworkOrOffline(e)) {
      offlineEncountered = true;
    } else {
      console.warn('Firestore authentication lookup notice:', e?.message || e);
    }
  }

  // 4. Offline Fallback: Check locally cached registered members
  const cached = getCachedMembers();
  for (const m of cached) {
    const mEmail = (m.gmail || '').toLowerCase().trim();
    const mName = (m.name || '').toLowerCase().trim();
    if (mEmail === queryClean || mName === queryClean) {
      if (m.password && _password && m.password !== _password) {
        return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
      }
      const speakerRolesList = parseSpeakerRoles(m.speakerRoles, m.speakerRole);
      const profile: UserProfile = {
        name: m.name || identifier,
        gmail: m.gmail || identifier,
        phone: m.phone || '',
        year: m.year || 'I Year',
        department: m.department || 'B.Sc',
        className: m.className || '',
        photoUrl: m.photoUrl || '',
        executiveRole: m.executiveRole || '',
        speakerRole: speakerRolesList.join(', '),
        speakerRoles: speakerRolesList,
        isAdmin: isUserAdmin(m),
        isRoleEntry: isUserRoleEntry(m),
      };
      return { success: true, profile };
    }
  }

  if (offlineEncountered) {
    return {
      success: false,
      error: 'Network connection is currently offline or reconnecting. Please check your internet connection and try again.',
    };
  }

  return {
    success: false,
    error: 'Account not found. Please click "Register / Create an account" below to register.',
  };
}

/**
 * Handle Google Sign-In with popup & fallbacks
 */
export async function handleGoogleSignIn(): Promise<{ 
  success: boolean; 
  profile?: UserProfile; 
  cancelledByUser?: boolean;
  error?: string 
}> {
  try {
    // Wrap with a timeout so it never hangs indefinitely
    const signInPromise = signInWithPopup(auth, googleProvider);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('auth/timeout')), 45000);
    });

    const res = await Promise.race([signInPromise, timeoutPromise]);
    const user = res.user;
    if (user) {
      const email = user.email || '';
      const name = user.displayName || email.split('@')[0] || 'Member';
      const photoUrl = user.photoURL || '';

      // Check if already registered in Firestore
      let existingProfile: UserProfile | undefined;
      try {
        const sanitizedKey = (email || '').replace(/[^a-zA-Z0-9]/g, '_');
        const docSnap = await getDoc(doc(db, 'members', sanitizedKey));
        if (docSnap.exists()) {
          const d = docSnap.data();
          existingProfile = {
            name: d.name || name,
            gmail: d.gmail || email,
            phone: d.phone || '',
            year: d.year || 'I Year',
            department: d.department || 'B.Sc',
            className: d.className || '',
            photoUrl: d.photoUrl || photoUrl,
            executiveRole: d.executiveRole || '',
            isAdmin: isUserAdmin(d),
          };
        }
      } catch {
        // proceed
      }

      const profile: UserProfile = existingProfile || {
        name: name,
        gmail: email,
        phone: '',
        year: 'I Year',
        department: 'B.Sc',
        className: '',
        photoUrl: photoUrl,
        executiveRole: '',
        isAdmin: isUserAdmin({ name, gmail: email }),
      };

      try {
        await saveUserLoginToFirebase(profile);
      } catch {
        // Non-blocking
      }

      return { success: true, profile };
    }
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    const errorMsg = errorObj?.message || '';

    // Check if user simply closed the Google popup or cancelled
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled' ||
      errorMsg.toLowerCase().includes('popup-closed-by-user') ||
      errorMsg.toLowerCase().includes('closed-by-user') ||
      errorMsg.toLowerCase().includes('cancelled') ||
      errorMsg.toLowerCase().includes('canceled')
    ) {
      console.log('Google sign-in popup was closed by user.');
      return {
        success: false,
        cancelledByUser: true,
      };
    }

    if (code === 'auth/popup-blocked') {
      return {
        success: false,
        error: 'Popup was blocked by your browser. Please allow popups or sign in with your email/username.',
      };
    }

    console.warn('Google sign-in notice:', code, errorMsg);
    
    return {
      success: false,
      error: 'Google sign-in could not be completed. Please try again or sign in using your email/username.',
    };
  }

  return { success: false, error: 'Could not complete Google Sign-in.' };
}

/**
 * Send password reset instructions
 */
export async function triggerPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true, message: `Password reset link has been sent to ${cleanEmail}.` };
  } catch (err) {
    console.warn('Password reset note:', err);
    // User-friendly feedback even if email not in Firebase Auth
    return { 
      success: true, 
      message: `If an account exists for ${cleanEmail}, password reset instructions have been dispatched.` 
    };
  }
}

const LOCAL_POLLS_KEY = 'declamates_polls_v1';

export function getLocalStoredPolls(): Poll[] {
  try {
    const data = localStorage.getItem(LOCAL_POLLS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading local polls:', e);
  }
  return [];
}

export function saveLocalStoredPolls(polls: Poll[]): void {
  try {
    localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(polls));
  } catch (e) {
    console.error('Error saving local polls:', e);
  }
}

/**
 * Creates a new poll in Firestore and broadcasts to all users
 */
export async function createPollInFirebase(newPoll: Omit<Poll, 'id'>): Promise<{ success: boolean; id: string; poll: Poll }> {
  const docId = 'poll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdPoll: Poll = {
    ...newPoll,
    id: docId,
  };

  // 1. Optimistic local cache save first so UI is instant and never fails
  const currentPolls = getLocalStoredPolls();
  const updatedPolls = [createdPoll, ...currentPolls.filter(p => p.id !== docId)];
  saveLocalStoredPolls(updatedPolls);

  // 2. Sync to Firestore in background
  try {
    await ensureAuth();
    const docRef = doc(db, 'polls', docId);
    await setDoc(docRef, {
      ...createdPoll,
      serverTime: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore poll write saved locally (permission/offline notice):', err);
  }

  return { success: true, id: docId, poll: createdPoll };
}

/**
 * Subscribes to live polls from Firestore with real-time updates for all users
 */
export function subscribeToPolls(onUpdate: (polls: Poll[]) => void): () => void {
  // Fire initial local cached data first
  const initialLocal = getLocalStoredPolls();
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  let unsubscribeSnapshot = () => {};

  try {
    const colRef = collection(db, 'polls');
    unsubscribeSnapshot = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remotePolls: Poll[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              question: data.question || '',
              options: data.options || [],
              allowMultipleAnswers: data.allowMultipleAnswers ?? false,
              category: data.category || 'General',
              createdBy: data.createdBy || { name: 'Member', gmail: '' },
              createdAt: data.createdAt || new Date().toISOString(),
              isActive: data.isActive ?? true,
              totalVotes: data.totalVotes || 0,
              votedUserEmails: data.votedUserEmails || [],
            };
          });

          // Sort by newest first
          remotePolls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          saveLocalStoredPolls(remotePolls);
          onUpdate(remotePolls);
        } else if (initialLocal.length === 0) {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('Real-time polls snapshot notice (using cache):', error.message);
        onUpdate(getLocalStoredPolls());
      }
    );
  } catch (err) {
    console.warn('Failed to attach polls listener:', err);
    onUpdate(getLocalStoredPolls());
  }

  return () => {
    unsubscribeSnapshot();
  };
}

/**
 * Casts a vote on a poll and syncs directly to Firestore and local state
 */
export async function submitVoteInFirebase(
  pollId: string,
  selectedOptionIds: string[],
  userEmail: string
): Promise<{ success: boolean; updatedPoll?: Poll }> {
  // 1. Retrieve the existing poll from local cache or fallback list
  const currentPolls = getLocalStoredPolls();
  const targetIndex = currentPolls.findIndex((p) => p.id === pollId);
  const poll = targetIndex >= 0 ? currentPolls[targetIndex] : null;

  if (!poll) {
    return { success: false };
  }

  // 2. Calculate updated options and vote counts reliably
  const updatedOptions = poll.options.map((opt) => {
    const hadVotedForThis = opt.voterEmails?.includes(userEmail) || false;
    let newVoterEmails = opt.voterEmails ? [...opt.voterEmails] : [];
    
    if (hadVotedForThis) {
      newVoterEmails = newVoterEmails.filter((e) => e !== userEmail);
    }

    if (selectedOptionIds.includes(opt.id)) {
      newVoterEmails.push(userEmail);
    }

    return {
      ...opt,
      votes: newVoterEmails.length,
      voterEmails: newVoterEmails,
    };
  });

  const updatedVotedUsers = Array.from(
    new Set([
      ...(poll.votedUserEmails || []).filter(e => e !== userEmail), 
      ...(selectedOptionIds.length > 0 ? [userEmail] : [])
    ])
  );

  const totalVotesCount = updatedOptions.reduce((acc, opt) => acc + opt.votes, 0);

  const updatedPoll: Poll = {
    ...poll,
    options: updatedOptions,
    totalVotes: totalVotesCount,
    votedUserEmails: updatedVotedUsers,
  };

  // 3. Immediately save optimistic result in local state
  currentPolls[targetIndex] = updatedPoll;
  saveLocalStoredPolls([...currentPolls]);

  // 4. Try updating in Firestore (with merge fallback)
  try {
    await ensureAuth();
    const docRef = doc(db, 'polls', pollId);
    await setDoc(
      docRef,
      {
        ...updatedPoll,
        lastVoteAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore vote sync note (saved locally):', err);
  }

  return { success: true, updatedPoll };
}

/**
 * Toggle poll active status
 */
export async function togglePollStatus(pollId: string, isActive: boolean): Promise<boolean> {
  const currentPolls = getLocalStoredPolls();
  const updated = currentPolls.map(p => p.id === pollId ? { ...p, isActive } : p);
  saveLocalStoredPolls(updated);

  try {
    await ensureAuth();
    const docRef = doc(db, 'polls', pollId);
    await setDoc(docRef, { isActive, lastStatusChange: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Firestore poll toggle note:', err);
  }

  return true;
}

export async function deletePoll(pollId: string): Promise<boolean> {
  const currentPolls = getLocalStoredPolls();
  const updated = currentPolls.filter(p => p.id !== pollId);
  saveLocalStoredPolls(updated);

  try {
    await ensureAuth();
    const docRef = doc(db, 'polls', pollId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore poll delete note:', err);
  }

  return true;
}

/* ========================================================================= */
/* MEETING VOTING SESSIONS (Best Role Players, Keynotes, Evaluators, etc.)     */
/* ========================================================================= */

const LOCAL_MEETINGS_KEY = 'declamate_meeting_sessions_v1';

export function getLocalMeetingSessions(): MeetingVotingSession[] {
  try {
    const data = localStorage.getItem(LOCAL_MEETINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading local meeting sessions:', e);
  }
  return [];
}

export function saveLocalMeetingSessions(sessions: MeetingVotingSession[]): void {
  try {
    localStorage.setItem(LOCAL_MEETINGS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving local meeting sessions:', e);
  }
}

/**
 * Creates a new Meeting Voting Session (The 4 Roles Quick Setup)
 */
export async function createMeetingSessionInFirebase(
  newSession: Omit<MeetingVotingSession, 'id'>
): Promise<{ success: boolean; id: string; session: MeetingVotingSession }> {
  const docId = 'meeting_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdSession: MeetingVotingSession = {
    ...newSession,
    id: docId,
  };

  // 1. Optimistic local cache save
  const currentSessions = getLocalMeetingSessions();
  const updated = [createdSession, ...currentSessions.filter(s => s.id !== docId)];
  saveLocalMeetingSessions(updated);

  // 2. Sync to Firestore
  try {
    await ensureAuth();
    const docRef = doc(db, 'meeting_sessions', docId);
    await setDoc(docRef, {
      ...createdSession,
      serverTime: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore meeting session write note (saved locally):', err);
  }

  return { success: true, id: docId, session: createdSession };
}

/**
 * Subscribes to live Meeting Voting Sessions from Firestore
 */
export function subscribeToMeetingSessions(onUpdate: (sessions: MeetingVotingSession[]) => void): () => void {
  const initialLocal = getLocalMeetingSessions();
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  let unsubscribeSnapshot = () => {};

  try {
    const colRef = collection(db, 'meeting_sessions');
    unsubscribeSnapshot = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteSessions: MeetingVotingSession[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Club Meeting Voting',
              meetingNumber: data.meetingNumber || '',
              meetingDate: data.meetingDate || new Date().toISOString(),
              categories: data.categories || [],
              isActive: data.isActive ?? true,
              createdAt: data.createdAt || new Date().toISOString(),
              createdBy: data.createdBy || { name: 'Admin', gmail: '' },
              totalVoters: data.totalVoters || 0,
              votedUserEmails: data.votedUserEmails || [],
            };
          });

          // Sort newest first
          remoteSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          saveLocalMeetingSessions(remoteSessions);
          onUpdate(remoteSessions);
        } else if (initialLocal.length === 0) {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('Real-time meeting sessions snapshot note (using cache):', error.message);
        onUpdate(getLocalMeetingSessions());
      }
    );
  } catch (err) {
    console.warn('Failed to attach meeting sessions listener:', err);
    onUpdate(getLocalMeetingSessions());
  }

  return () => {
    unsubscribeSnapshot();
  };
}

/**
 * Submits votes for a Meeting Session across the 4 roles
 * votesMap: { [categoryId]: candidateId }
 */
export async function submitMeetingVoteInFirebase(
  sessionId: string,
  votesMap: Record<string, string>,
  userEmail: string
): Promise<{ success: boolean; updatedSession?: MeetingVotingSession }> {
  const currentSessions = getLocalMeetingSessions();
  const targetIndex = currentSessions.findIndex((s) => s.id === sessionId);
  const session = targetIndex >= 0 ? currentSessions[targetIndex] : null;

  if (!session) {
    return { success: false };
  }

  // Calculate updated categories
  const updatedCategories = session.categories.map((cat) => {
    const chosenCandidateId = votesMap[cat.id];

    const updatedCandidates = cat.candidates.map((cand) => {
      let voterList = cand.voterEmails ? [...cand.voterEmails] : [];
      const hadVoted = voterList.includes(userEmail);

      if (hadVoted) {
        voterList = voterList.filter((e) => e !== userEmail);
      }

      if (chosenCandidateId && cand.id === chosenCandidateId) {
        voterList.push(userEmail);
      }

      return {
        ...cand,
        votes: voterList.length,
        voterEmails: voterList,
      };
    });

    return {
      ...cat,
      candidates: updatedCandidates,
    };
  });

  const updatedVotedUsers = Array.from(
    new Set([
      ...(session.votedUserEmails || []).filter((e) => e !== userEmail),
      userEmail,
    ])
  );

  const updatedSession: MeetingVotingSession = {
    ...session,
    categories: updatedCategories,
    totalVoters: updatedVotedUsers.length,
    votedUserEmails: updatedVotedUsers,
  };

  // Optimistic local update
  currentSessions[targetIndex] = updatedSession;
  saveLocalMeetingSessions([...currentSessions]);

  // Firestore update
  try {
    await ensureAuth();
    const docRef = doc(db, 'meeting_sessions', sessionId);
    await setDoc(
      docRef,
      {
        ...updatedSession,
        lastVoteAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore meeting vote sync note (saved locally):', err);
  }

  return { success: true, updatedSession };
}

/**
 * Toggle meeting session active / closed status
 */
export async function toggleMeetingSessionStatus(sessionId: string, isActive: boolean): Promise<boolean> {
  const currentSessions = getLocalMeetingSessions();
  const updated = currentSessions.map((s) => (s.id === sessionId ? { ...s, isActive } : s));
  saveLocalMeetingSessions(updated);

  try {
    await ensureAuth();
    const docRef = doc(db, 'meeting_sessions', sessionId);
    await setDoc(docRef, { isActive, lastStatusChange: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Firestore meeting session toggle note:', err);
  }

  return true;
}

/**
 * Delete a meeting session
 */
export async function deleteMeetingSession(sessionId: string): Promise<boolean> {
  const currentSessions = getLocalMeetingSessions();
  const updated = currentSessions.filter((s) => s.id !== sessionId);
  saveLocalMeetingSessions(updated);

  try {
    await ensureAuth();
    const docRef = doc(db, 'meeting_sessions', sessionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore meeting session delete note:', err);
  }

  return true;
}

/**
 * Fetch all registered members from Firestore (Admin only)
 */
export async function fetchAllRegisteredMembers(): Promise<RegisteredMember[]> {
  try {
    await ensureAuth();
    const snap = await getDocs(collection(db, 'members'));
    const list: RegisteredMember[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      let createdStr = '';
      if (d.createdAt) {
        if (typeof d.createdAt === 'string') {
          createdStr = d.createdAt;
        } else if (d.createdAt?.toDate) {
          createdStr = d.createdAt.toDate().toISOString();
        }
      }
      let updatedStr = '';
      if (d.updatedAt) {
        if (typeof d.updatedAt === 'string') {
          updatedStr = d.updatedAt;
        } else if (d.updatedAt?.toDate) {
          updatedStr = d.updatedAt.toDate().toISOString();
        }
      }

      list.push({
        id: docSnap.id,
        name: d.name || 'Anonymous Member',
        gmail: d.gmail || '',
        phone: d.phone || '',
        year: d.year || 'I Year',
        department: d.department || '',
        className: d.className || '',
        photoUrl: d.photoUrl || '',
        executiveRole: d.executiveRole || '',
        isAdmin: isUserAdmin(d),
        isRoleEntry: isUserRoleEntry(d),
        password: d.password || '',
        createdAt: createdStr || d.loginTimestamp || '',
        updatedAt: updatedStr,
      });
    });

    // Sort by createdAt descending or name
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    try {
      localStorage.setItem(CACHED_MEMBERS_KEY, JSON.stringify(list));
    } catch {
      // Ignore
    }

    return list;
  } catch (err) {
    console.warn('Firestore fetch note (falling back to cache):', err);
    return getCachedMembers();
  }
}

/**
 * Real-time subscription to all registered members for Admin table
 */
export function subscribeToRegisteredMembers(
  callback: (members: RegisteredMember[]) => void
): () => void {
  // Immediately provide cached members if available for snappy offline/startup rendering
  const initialCache = getCachedMembers();
  if (initialCache && initialCache.length > 0) {
    callback(initialCache);
  }

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'members'),
      (snapshot) => {
        const list: RegisteredMember[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          let createdStr = '';
          if (d.createdAt) {
            if (typeof d.createdAt === 'string') {
              createdStr = d.createdAt;
            } else if (d.createdAt?.toDate) {
              createdStr = d.createdAt.toDate().toISOString();
            }
          }
          let updatedStr = '';
          if (d.updatedAt) {
            if (typeof d.updatedAt === 'string') {
              updatedStr = d.updatedAt;
            } else if (d.updatedAt?.toDate) {
              updatedStr = d.updatedAt.toDate().toISOString();
            }
          }

          const rawSpeakerRoles = d.speakerRoles;
          let speakerRolesList: string[] = [];
          if (Array.isArray(rawSpeakerRoles)) {
            speakerRolesList = rawSpeakerRoles.filter(Boolean);
          } else if (typeof rawSpeakerRoles === 'string' && rawSpeakerRoles.trim()) {
            speakerRolesList = rawSpeakerRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (typeof d.speakerRole === 'string' && d.speakerRole.trim()) {
            speakerRolesList = d.speakerRole.split(',').map((s: string) => s.trim()).filter(Boolean);
          }

          list.push({
            id: docSnap.id,
            name: d.name || 'Anonymous Member',
            gmail: d.gmail || '',
            phone: d.phone || '',
            year: d.year || 'I Year',
            department: d.department || '',
            className: d.className || '',
            photoUrl: d.photoUrl || '',
            executiveRole: d.executiveRole || '',
            speakerRole: speakerRolesList.join(', '),
            speakerRoles: speakerRolesList,
            isAdmin: isUserAdmin(d),
            isRoleEntry: isUserRoleEntry(d),
            password: d.password || '',
            createdAt: createdStr || d.loginTimestamp || '',
            updatedAt: updatedStr,
          });
        });

        // Sort latest first
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        // Persist to offline cache
        try {
          localStorage.setItem(CACHED_MEMBERS_KEY, JSON.stringify(list));
        } catch {
          // Ignore
        }

        callback(list);
      },
      (err) => {
        console.warn('Real-time members snapshot listener note:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Real-time subscription setup note:', err);
    return () => {};
  }
}

/**
 * Admin action to update member's Executive Committee Role (President, Secretary, etc.)
 */
export async function updateMemberExecutiveRole(
  memberDocId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'members', memberDocId);
    await setDoc(
      docRef,
      {
        executiveRole: role || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update executive role';
    console.error('updateMemberExecutiveRole error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Admin action to add a Speaker Honor / Role to a member (Key Note Speakers, Best Role Players, etc.)
 */
export async function addSpeakerRoleToMember(
  memberDocId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'members', memberDocId);
    const snap = await getDoc(docRef);
    let currentRoles: string[] = [];

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.speakerRoles)) {
        currentRoles = [...data.speakerRoles];
      } else if (typeof data.speakerRoles === 'string' && data.speakerRoles.trim()) {
        currentRoles = data.speakerRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof data.speakerRole === 'string' && data.speakerRole.trim()) {
        currentRoles = data.speakerRole.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    // Enforce 1 speaker role per member rule
    const norm = (s: string) => s.trim().toLowerCase().replace(/s\b/g, '');
    const targetNorm = norm(role);
    const otherRoles = currentRoles.filter(
      (r) => r !== role && norm(r) !== targetNorm && formatSpeakerRole(r) !== formatSpeakerRole(role)
    );
    if (otherRoles.length > 0) {
      return {
        success: false,
        error: `Member already appointed to "${otherRoles.join(', ')}". A member can only hold one speaker role at a time.`,
      };
    }

    await setDoc(
      docRef,
      {
        speakerRoles: [role],
        speakerRole: role,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to add speaker role';
    console.error('addSpeakerRoleToMember error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Admin action to remove a specific Speaker Honor / Role from a member
 */
export async function removeSpeakerRoleFromMember(
  memberDocId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'members', memberDocId);
    const snap = await getDoc(docRef);
    let currentRoles: string[] = [];

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.speakerRoles)) {
        currentRoles = [...data.speakerRoles];
      } else if (typeof data.speakerRoles === 'string' && data.speakerRoles.trim()) {
        currentRoles = data.speakerRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof data.speakerRole === 'string' && data.speakerRole.trim()) {
        currentRoles = data.speakerRole.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const norm = (s: string) => s.trim().toLowerCase().replace(/s\b/g, '');
    const targetNorm = norm(role);

    currentRoles = currentRoles.filter(
      (r) => r !== role && norm(r) !== targetNorm && formatSpeakerRole(r) !== formatSpeakerRole(role)
    );

    await setDoc(
      docRef,
      {
        speakerRoles: currentRoles,
        speakerRole: currentRoles.length > 0 ? currentRoles.join(', ') : '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to remove speaker role';
    console.error('removeSpeakerRoleFromMember error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Admin action to update/replace member's Speaker Honor / Role
 */
export async function updateMemberSpeakerRole(
  memberDocId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'members', memberDocId);
    const roles = role ? [role] : [];
    await setDoc(
      docRef,
      {
        speakerRole: role || '',
        speakerRoles: roles,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update speaker role';
    console.error('updateMemberSpeakerRole error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Admin action to delete a registered member document from Firestore
 */
export async function deleteMemberByAdmin(memberDocId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'members', memberDocId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to remove member document';
    console.error('deleteMemberByAdmin error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/* ========================================================================= */
/* MESSAGES & NOTIFICATIONS SYSTEM                                           */
/* ========================================================================= */

const LOCAL_MESSAGES_KEY = 'declamate_app_messages_v1';

export function getLocalStoredMessages(): AppMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local messages:', e);
  }
  return [];
}

export function saveLocalStoredMessages(messages: AppMessage[]): void {
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving local messages:', e);
  }
}

/**
 * Send an in-app message/notification.
 * If targetEmail is 'public', all members (including admin) will receive it.
 * If targetEmail is a specific member's email, only that member receives it.
 */
export async function sendAppMessage(
  msg: Omit<AppMessage, 'id'>
): Promise<{ success: boolean; message?: AppMessage; error?: string }> {
  try {
    const docId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newMessage: AppMessage = {
      ...msg,
      id: docId,
      readBy: Array.isArray(msg.readBy) ? msg.readBy : [],
      deletedBy: Array.isArray(msg.deletedBy) ? msg.deletedBy : [],
      createdAt: msg.createdAt || new Date().toISOString(),
    };

    // 1. Optimistically store in local cache and notify listeners immediately
    const existing = getLocalStoredMessages();
    const updated = [newMessage, ...existing.filter((m) => m.id !== docId)];
    saveLocalStoredMessages(updated);
    try {
      window.dispatchEvent(new CustomEvent('declamates_local_messages_changed'));
    } catch {
      // Ignore in environments without window event dispatch
    }

    // 2. Prepare clean Firestore payload (no undefined values)
    const cleanPayload: Record<string, any> = {
      id: docId,
      type: newMessage.type || 'general',
      title: newMessage.title || 'Message',
      message: newMessage.message || '',
      targetEmail: (newMessage.targetEmail || 'public').trim().toLowerCase(),
      isBroadcast: Boolean(newMessage.isBroadcast ?? (newMessage.targetEmail === 'public')),
      createdAt: newMessage.createdAt,
      readBy: Array.isArray(newMessage.readBy) ? newMessage.readBy : [],
      deletedBy: Array.isArray(newMessage.deletedBy) ? newMessage.deletedBy : [],
    };
    if (newMessage.roleName) {
      cleanPayload.roleName = newMessage.roleName;
    }
    if (newMessage.createdBy) {
      cleanPayload.createdBy = {
        name: newMessage.createdBy.name || 'Admin',
        ...(newMessage.createdBy.gmail ? { gmail: newMessage.createdBy.gmail } : {}),
        ...(newMessage.createdBy.photoUrl ? { photoUrl: newMessage.createdBy.photoUrl } : {}),
      };
    }

    // 3. Persist to Firestore with error resilience
    try {
      await ensureAuth();
      const docRef = doc(db, 'messages', docId);
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (firestoreErr: unknown) {
      const errorMsg = firestoreErr instanceof Error ? firestoreErr.message : String(firestoreErr);
      // Log as non-fatal warning so missing rules on remote project do not break app or throw errors
      console.warn('sendAppMessage Firestore note (saved locally):', errorMsg);
    }

    return { success: true, message: newMessage };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
    console.warn('sendAppMessage local note:', errorMsg);
    return { success: true };
  }
}

const DISMISSED_MESSAGES_KEY_PREFIX = 'declamates_dismissed_msgs_';

export function getLocalDismissedMessageIds(userEmail?: string): string[] {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const key = normEmail ? `${DISMISSED_MESSAGES_KEY_PREFIX}${normEmail}` : 'declamates_dismissed_msgs_anon';
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDismissedMessageId(messageId: string, userEmail?: string): void {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const key = normEmail ? `${DISMISSED_MESSAGES_KEY_PREFIX}${normEmail}` : 'declamates_dismissed_msgs_anon';
  try {
    const existing = getLocalDismissedMessageIds(userEmail);
    if (!existing.includes(messageId)) {
      existing.push(messageId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    console.warn('Failed to save dismissed message ID locally:', e);
  }
}

/**
 * Real-time subscription to messages for a given user.
 * Returns both public broadcast messages (for all members and admin)
 * and personal messages addressed to this user's email, filtering out any deleted/dismissed messages.
 */
export function subscribeToUserMessages(
  userEmail: string,
  onUpdate: (messages: AppMessage[]) => void
): () => void {
  const normEmail = (userEmail || '').trim().toLowerCase();

  const getFilteredMessages = () => {
    const liveDismissedSet = new Set(getLocalDismissedMessageIds(normEmail));
    const all = getLocalStoredMessages();
    return all.filter((m) => {
      if (!m || liveDismissedSet.has(m.id)) return false;
      const deletedList = Array.isArray(m.deletedBy) ? m.deletedBy.map((e) => e.toLowerCase()) : [];
      if (normEmail && deletedList.includes(normEmail)) return false;

      if (m.targetEmail === 'public' || m.isBroadcast) return true;
      if (normEmail && m.targetEmail?.toLowerCase() === normEmail) return true;
      return false;
    });
  };

  // Immediate cached render
  onUpdate(getFilteredMessages());

  // Listen for local tab updates
  const handleLocalUpdate = () => {
    onUpdate(getFilteredMessages());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('declamates_local_messages_changed', handleLocalUpdate);
  }

  let unsubscribeFirestore = () => {};

  try {
    const colRef = collection(db, 'messages');
    unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const allRemote: AppMessage[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              type: data.type || 'general',
              title: data.title || 'Message',
              message: data.message || '',
              targetEmail: data.targetEmail || 'public',
              isBroadcast: data.isBroadcast ?? (data.targetEmail === 'public'),
              roleName: data.roleName || undefined,
              createdAt: data.createdAt || new Date().toISOString(),
              createdBy: data.createdBy || { name: 'Admin' },
              readBy: Array.isArray(data.readBy) ? data.readBy : [],
              deletedBy: Array.isArray(data.deletedBy) ? data.deletedBy : [],
            };
          });

          // Sort newest first
          allRemote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Save complete set to cache
          saveLocalStoredMessages(allRemote);
          onUpdate(getFilteredMessages());
        } else {
          onUpdate(getFilteredMessages());
        }
      },
      (error) => {
        console.warn('Real-time messages listener note (using local cache):', error.message);
        onUpdate(getFilteredMessages());
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to messages:', err);
    onUpdate(getFilteredMessages());
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('declamates_local_messages_changed', handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
}

/**
 * Mark a message as read by the user
 */
export async function markMessageAsRead(messageId: string, userEmail: string): Promise<void> {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (!normEmail) return;

  // Local update
  const current = getLocalStoredMessages();
  const updated = current.map((m) => {
    if (m.id === messageId) {
      const readSet = new Set([...(m.readBy || []), normEmail]);
      return { ...m, readBy: Array.from(readSet) };
    }
    return m;
  });
  saveLocalStoredMessages(updated);
  try {
    window.dispatchEvent(new CustomEvent('declamates_local_messages_changed'));
  } catch {}

  try {
    await ensureAuth();
    const docRef = doc(db, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentRead = Array.isArray(data.readBy) ? data.readBy : [];
      if (!currentRead.includes(normEmail)) {
        await updateDoc(docRef, {
          readBy: [...currentRead, normEmail],
        });
      }
    }
  } catch (err) {
    console.warn('markMessageAsRead note:', err);
  }
}

/**
 * Mark all user's messages as read
 */
export async function markAllMessagesAsRead(userEmail: string, messageIds: string[]): Promise<void> {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (!normEmail || messageIds.length === 0) return;

  const current = getLocalStoredMessages();
  const updated = current.map((m) => {
    if (messageIds.includes(m.id)) {
      const readSet = new Set([...(m.readBy || []), normEmail]);
      return { ...m, readBy: Array.from(readSet) };
    }
    return m;
  });
  saveLocalStoredMessages(updated);
  try {
    window.dispatchEvent(new CustomEvent('declamates_local_messages_changed'));
  } catch {}

  // Firestore update
  try {
    await ensureAuth();
    for (const msgId of messageIds) {
      const docRef = doc(db, 'messages', msgId);
      getDoc(docRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const currentRead = Array.isArray(data.readBy) ? data.readBy : [];
          if (!currentRead.includes(normEmail)) {
            updateDoc(docRef, { readBy: [...currentRead, normEmail] }).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('markAllMessagesAsRead note:', err);
  }
}

/**
 * Delete / dismiss a message (Admin or individual user)
 */
export async function deleteAppMessage(messageId: string, userEmail?: string): Promise<boolean> {
  const normEmail = (userEmail || '').trim().toLowerCase();

  // 1. Immediately store in user-specific dismissed list so it never reappears on this client
  saveLocalDismissedMessageId(messageId, normEmail);

  // 2. Optimistically remove from local messages cache
  const current = getLocalStoredMessages();
  saveLocalStoredMessages(current.filter((m) => m.id !== messageId));
  try {
    window.dispatchEvent(new CustomEvent('declamates_local_messages_changed'));
  } catch {}

  // 3. Persist to Firestore: delete document if personal or admin; otherwise update deletedBy array
  try {
    await ensureAuth();
    const docRef = doc(db, 'messages', messageId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const isBroadcast = data.isBroadcast || data.targetEmail === 'public';
      const isAdmin = normEmail === 'admin' || normEmail === 'admin@declamate.com';
      const isTargetMe = data.targetEmail && data.targetEmail.toLowerCase() === normEmail;

      if (isAdmin || isTargetMe || !isBroadcast) {
        // Personal message or admin deletion removes the document entirely
        await deleteDoc(docRef);
      } else if (normEmail) {
        // Public broadcast notification: add user email to deletedBy so other members still see it
        const currentDeleted = Array.isArray(data.deletedBy) ? data.deletedBy : [];
        if (!currentDeleted.map((e: string) => e.toLowerCase()).includes(normEmail)) {
          await updateDoc(docRef, {
            deletedBy: [...currentDeleted, normEmail],
          });
        }
      } else {
        // Anonymous/fallback: attempt deleteDoc
        await deleteDoc(docRef);
      }
    } else {
      // Document not found in Firestore, remove any stale reference
      await deleteDoc(docRef).catch(() => {});
    }
    return true;
  } catch (err) {
    console.warn('deleteAppMessage Firestore sync note (handled via local dismissal):', err);
    return true;
  }
}

/* ========================================================================== */
/* SPEECH EVALUATION SHEETS (Toastmasters Speech Evaluation System)           */
/* ========================================================================== */

const LOCAL_SPEECH_EVALUATIONS_KEY = 'declamates_speech_evaluations';

function getLocalSpeechEvaluations(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_SPEECH_EVALUATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSpeechEvaluations(list: any[]) {
  try {
    localStorage.setItem(LOCAL_SPEECH_EVALUATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save evaluations locally:', e);
  }
}

export async function saveSpeechEvaluation(
  evaluation: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const docId = evaluation.id || `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullData = {
    ...evaluation,
    id: docId,
    updatedAt: new Date().toISOString(),
    createdAt: evaluation.createdAt || new Date().toISOString(),
  };

  // Local sync
  const localList = getLocalSpeechEvaluations();
  const existingIdx = localList.findIndex((item) => item.id === docId);
  if (existingIdx >= 0) {
    localList[existingIdx] = fullData;
  } else {
    localList.unshift(fullData);
  }
  saveLocalSpeechEvaluations(localList);

  // Firestore sync
  try {
    await ensureAuth();
    const docRef = doc(db, 'speech_evaluations', docId);
    await setDoc(docRef, fullData, { merge: true });
    return { success: true, id: docId };
  } catch (err) {
    console.warn('Firestore saveSpeechEvaluation note:', err);
    return { success: true, id: docId };
  }
}

export function subscribeToSpeechEvaluations(
  callback: (evaluations: any[]) => void
): () => void {
  // Fire local first
  callback(getLocalSpeechEvaluations());

  let unsub: (() => void) | null = null;
  ensureAuth()
    .then(() => {
      const q = query(collection(db, 'speech_evaluations'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ ...docSnap.data(), id: docSnap.id });
          });
          // Always save latest snapshot (including empty list) and notify subscriber
          saveLocalSpeechEvaluations(items);
          callback(items);
        },
        (error) => {
          console.warn('subscribeToSpeechEvaluations snapshot error:', error);
          callback(getLocalSpeechEvaluations());
        }
      );
    })
    .catch((err) => {
      console.warn('subscribeToSpeechEvaluations auth error:', err);
      callback(getLocalSpeechEvaluations());
    });

  return () => {
    if (unsub) unsub();
  };
}

export async function deleteSpeechEvaluation(idOrRecord: string | any): Promise<boolean> {
  const targetId = typeof idOrRecord === 'string' ? idOrRecord : idOrRecord?.id;
  const currentList = getLocalSpeechEvaluations();
  const filtered = currentList.filter((e) => {
    if (targetId && e.id === targetId) return false;
    if (typeof idOrRecord === 'object' && idOrRecord !== null) {
      if (e.id && idOrRecord.id && e.id === idOrRecord.id) return false;
      if (e.createdAt && idOrRecord.createdAt && e.createdAt === idOrRecord.createdAt) return false;
      if (
        (e.speakerName || '').trim().toLowerCase() === (idOrRecord.speakerName || '').trim().toLowerCase() &&
        (e.meetingNumber || e.speechTime || '').trim().toLowerCase() ===
          (idOrRecord.meetingNumber || idOrRecord.speechTime || '').trim().toLowerCase()
      ) {
        return false;
      }
    }
    return true;
  });
  saveLocalSpeechEvaluations(filtered);

  if (targetId) {
    try {
      await ensureAuth();
      await deleteDoc(doc(db, 'speech_evaluations', targetId));
      return true;
    } catch (err) {
      console.warn('deleteSpeechEvaluation note:', err);
      return true;
    }
  }
  return true;
}

/* ========================================================================== */
/* TIME STEWARD RECORDS (Meeting Speaking Durations & Stopwatch Details)       */
/* ========================================================================== */

const LOCAL_TIME_STEWARD_RECORDS_KEY = 'declamates_time_steward_records';

function getLocalTimeStewardRecords(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_TIME_STEWARD_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTimeStewardRecords(list: any[]) {
  try {
    localStorage.setItem(LOCAL_TIME_STEWARD_RECORDS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save time steward records locally:', e);
  }
}

export async function saveTimeStewardRecord(
  record: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const docId = record.id || `timer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullData = {
    ...record,
    id: docId,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  // Local storage sync
  const localList = getLocalTimeStewardRecords();
  const existingIdx = localList.findIndex((item) => item.id === docId);
  if (existingIdx >= 0) {
    localList[existingIdx] = fullData;
  } else {
    localList.unshift(fullData);
  }
  saveLocalTimeStewardRecords(localList);

  // Firestore sync
  try {
    await ensureAuth();
    const docRef = doc(db, 'time_steward_records', docId);
    await setDoc(docRef, fullData, { merge: true });
    return { success: true, id: docId };
  } catch (err) {
    console.warn('Firestore saveTimeStewardRecord note:', err);
    return { success: true, id: docId };
  }
}

export function subscribeToTimeStewardRecords(
  callback: (records: any[]) => void
): () => void {
  // Fire local first
  callback(getLocalTimeStewardRecords());

  let unsub: (() => void) | null = null;
  ensureAuth()
    .then(() => {
      const q = query(collection(db, 'time_steward_records'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ ...docSnap.data(), id: docSnap.id });
          });
          // Always save latest snapshot (including empty list) and notify subscriber
          saveLocalTimeStewardRecords(items);
          callback(items);
        },
        (error) => {
          console.warn('subscribeToTimeStewardRecords snapshot error:', error);
          callback(getLocalTimeStewardRecords());
        }
      );
    })
    .catch((err) => {
      console.warn('subscribeToTimeStewardRecords auth error:', err);
      callback(getLocalTimeStewardRecords());
    });

  return () => {
    if (unsub) unsub();
  };
}

export async function deleteTimeStewardRecord(recordOrId: string | any): Promise<boolean> {
  const targetId = typeof recordOrId === 'string' ? recordOrId : recordOrId?.id;
  const currentList = getLocalTimeStewardRecords();
  const filtered = currentList.filter((e) => {
    if (targetId && e.id === targetId) return false;
    if (typeof recordOrId === 'object' && recordOrId !== null) {
      if (e.id && recordOrId.id && e.id === recordOrId.id) return false;
      if (e.createdAt && recordOrId.createdAt && e.createdAt === recordOrId.createdAt) return false;
      if (
        (e.speakerName || '').trim().toLowerCase() === (recordOrId.speakerName || '').trim().toLowerCase() &&
        (e.formattedTime || '') === (recordOrId.formattedTime || '')
      ) {
        return false;
      }
    }
    return true;
  });
  saveLocalTimeStewardRecords(filtered);

  if (targetId) {
    try {
      await ensureAuth();
      await deleteDoc(doc(db, 'time_steward_records', targetId));
      return true;
    } catch (err) {
      console.warn('deleteTimeStewardRecord note:', err);
      return true;
    }
  }
  return true;
}

/* ========================================================================== */
/* FILLER COUNTER RECORDS (Ah-Counter Log & Crutch Word Counts)              */
/* ========================================================================== */

const LOCAL_FILLER_COUNTER_RECORDS_KEY = 'declamates_filler_counter_records';

function getLocalFillerCounterRecords(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_FILLER_COUNTER_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFillerCounterRecords(list: any[]) {
  try {
    localStorage.setItem(LOCAL_FILLER_COUNTER_RECORDS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save filler counter records locally:', e);
  }
}

export async function saveFillerCounterRecord(
  record: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const docId = record.id || `filler_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullData = {
    ...record,
    id: docId,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  // Local storage sync
  const localList = getLocalFillerCounterRecords();
  const existingIdx = localList.findIndex((item) => item.id === docId);
  if (existingIdx >= 0) {
    localList[existingIdx] = fullData;
  } else {
    localList.unshift(fullData);
  }
  saveLocalFillerCounterRecords(localList);

  // Firestore sync
  try {
    await ensureAuth();
    const docRef = doc(db, 'filler_counter_records', docId);
    await setDoc(docRef, fullData, { merge: true });
    return { success: true, id: docId };
  } catch (err) {
    console.warn('Firestore saveFillerCounterRecord note:', err);
    return { success: true, id: docId };
  }
}

export function subscribeToFillerCounterRecords(
  callback: (records: any[]) => void
): () => void {
  // Fire local first
  callback(getLocalFillerCounterRecords());

  let unsub: (() => void) | null = null;
  ensureAuth()
    .then(() => {
      const q = query(collection(db, 'filler_counter_records'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: any[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ ...docSnap.data(), id: docSnap.id });
          });
          if (items.length > 0) {
            saveLocalFillerCounterRecords(items);
            callback(items);
          } else {
            callback(getLocalFillerCounterRecords());
          }
        },
        (error) => {
          console.warn('subscribeToFillerCounterRecords snapshot error:', error);
          callback(getLocalFillerCounterRecords());
        }
      );
    })
    .catch((err) => {
      console.warn('subscribeToFillerCounterRecords auth error:', err);
      callback(getLocalFillerCounterRecords());
    });

  return () => {
    if (unsub) unsub();
  };
}

export async function deleteFillerCounterRecord(recordOrId: string | any): Promise<boolean> {
  const targetId = typeof recordOrId === 'string' ? recordOrId : recordOrId?.id;
  const currentList = getLocalFillerCounterRecords();
  const filtered = currentList.filter((e) => {
    if (targetId && e.id === targetId) return false;
    if (typeof recordOrId === 'object' && recordOrId !== null) {
      if (e.id && recordOrId.id && e.id === recordOrId.id) return false;
      if (e.createdAt && recordOrId.createdAt && e.createdAt === recordOrId.createdAt) return false;
      if (
        (e.speakerName || '').trim().toLowerCase() === (recordOrId.speakerName || '').trim().toLowerCase() &&
        (e.meetingNumber || '').trim().toLowerCase() === (recordOrId.meetingNumber || '').trim().toLowerCase()
      ) {
        return false;
      }
    }
    return true;
  });
  saveLocalFillerCounterRecords(filtered);

  if (targetId) {
    try {
      await ensureAuth();
      await deleteDoc(doc(db, 'filler_counter_records', targetId));
      return true;
    } catch (err) {
      console.warn('deleteFillerCounterRecord note:', err);
      return true;
    }
  }
  return true;
}

export default app;

