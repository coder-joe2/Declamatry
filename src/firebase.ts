import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
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
import { UserProfile, Poll, RegisteredMember } from './types';

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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Attempt anonymous sign-in if enabled on Firebase Console
async function ensureAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch {
    // Anonymous auth might not be enabled in console, proceed to direct write
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
      isAdmin: sanitizedEmail === 'vjana537@gmail.com',
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

  // 1. If identifier looks like email and password provided, try Firebase Auth
  if (queryClean.includes('@') && _password) {
    try {
      await signInWithEmailAndPassword(auth, queryClean, _password);
    } catch (authErr: unknown) {
      const authObj = authErr as { code?: string; message?: string };
      if (authObj?.code === 'auth/wrong-password' || authObj?.code === 'auth/invalid-credential') {
        return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
      }
      // If user-not-found in Firebase Auth, we will still check Firestore
    }
  }

  try {
    await ensureAuth();

    // 2. Direct document lookup by sanitized email ID
    const sanitizedKey = queryClean.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, 'members', sanitizedKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // If user has a password set and password was provided, verify it
      if (data.password && _password && data.password !== _password) {
        return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
      }
      const profile: UserProfile = {
        name: data.name || identifier,
        gmail: data.gmail || identifier,
        phone: data.phone || '',
        year: data.year || 'I Year',
        department: data.department || 'B.Sc',
        className: data.className || '',
        photoUrl: data.photoUrl || '',
        isAdmin: (data.gmail || '').toLowerCase() === 'vjana537@gmail.com',
      };
      return { success: true, profile };
    }

    // 3. Query collection for matching email or name
    const membersSnap = await getDocs(collection(db, 'members'));
    for (const d of membersSnap.docs) {
      const data = d.data();
      const docEmail = (data.gmail || '').toLowerCase().trim();
      const docName = (data.name || '').toLowerCase().trim();
      if (docEmail === queryClean || docName === queryClean) {
        if (data.password && _password && data.password !== _password) {
          return { success: false, error: 'Incorrect password. Please verify your password or use "Forgot password?".' };
        }
        const profile: UserProfile = {
          name: data.name || identifier,
          gmail: data.gmail || identifier,
          phone: data.phone || '',
          year: data.year || 'I Year',
          department: data.department || 'B.Sc',
          className: data.className || '',
          photoUrl: data.photoUrl || '',
          isAdmin: docEmail === 'vjana537@gmail.com',
        };
        return { success: true, profile };
      }
    }
  } catch (e) {
    console.error('Firestore authentication error:', e);
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
            isAdmin: email.toLowerCase() === 'vjana537@gmail.com',
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
        isAdmin: email.toLowerCase() === 'vjana537@gmail.com',
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
        isAdmin: d.isAdmin === true || (d.gmail || '').toLowerCase() === 'vjana537@gmail.com',
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

    return list;
  } catch (err) {
    console.error('Error fetching all members from Firestore:', err);
    return [];
  }
}

/**
 * Real-time subscription to all registered members for Admin table
 */
export function subscribeToRegisteredMembers(
  callback: (members: RegisteredMember[]) => void
): () => void {
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

          list.push({
            id: docSnap.id,
            name: d.name || 'Anonymous Member',
            gmail: d.gmail || '',
            phone: d.phone || '',
            year: d.year || 'I Year',
            department: d.department || '',
            className: d.className || '',
            photoUrl: d.photoUrl || '',
            isAdmin: d.isAdmin === true || (d.gmail || '').toLowerCase() === 'vjana537@gmail.com',
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

        callback(list);
      },
      (err) => {
        console.warn('Real-time members snapshot listener note:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error in subscribeToRegisteredMembers:', err);
    return () => {};
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

export default app;

