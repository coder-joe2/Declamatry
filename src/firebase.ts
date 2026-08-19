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
import { UserProfile, Poll } from './types';

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

const LOCAL_USERS_KEY = 'declamate_registered_members_v1';

export function getLocalRegisteredMembers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local members:', e);
  }
  return [];
}

export function saveLocalRegisteredMember(profile: UserProfile): void {
  try {
    const list = getLocalRegisteredMembers();
    const existingIndex = list.findIndex(
      (m) => m.gmail.toLowerCase() === profile.gmail.toLowerCase() || (m.name && m.name.toLowerCase() === profile.name.toLowerCase())
    );
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...profile };
    } else {
      list.push(profile);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local member:', e);
  }
}

/**
 * Saves login / member details to Firestore with timeout and offline caching fallback
 */
export async function saveUserLoginToFirebase(profile: UserProfile): Promise<{ success: boolean; id?: string; error?: string; permissionIssue?: boolean }> {
  try {
    // Also save in localStorage for instant local access
    try {
      localStorage.setItem('declamate_member_profile', JSON.stringify(profile));
      saveLocalRegisteredMember(profile);
    } catch {
      // ignore storage quota error if image is large
    }

    await ensureAuth();

    const sanitizedEmail = profile.gmail.trim().toLowerCase();
    const payload = {
      name: profile.name.trim(),
      gmail: profile.gmail.trim(),
      phone: profile.phone.trim(),
      year: profile.year || '',
      department: profile.department || '',
      photoUrl: profile.photoUrl || '',
      updatedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };

    // Timeout promise (3.5 seconds) so login never hangs
    const savePromise = (async () => {
      if (sanitizedEmail) {
        const userDocRef = doc(db, 'members', sanitizedEmail.replace(/[^a-zA-Z0-9]/g, '_'));
        await setDoc(userDocRef, payload, { merge: true });
        
        try {
          await addDoc(collection(db, 'login_activity'), {
            ...payload,
            loginTimestamp: new Date().toISOString(),
          });
        } catch {
          // secondary log failure is non-blocking
        }

        return { success: true, id: userDocRef.id };
      } else {
        const docRef = await addDoc(collection(db, 'members'), payload);
        return { success: true, id: docRef.id };
      }
    })();

    const timeoutPromise = new Promise<{ success: boolean; error: string }>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase operation timed out')), 3500)
    );

    const result = await Promise.race([savePromise, timeoutPromise]);
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error saving to Firebase';
    const isPermissionError = errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('insufficient');
    
    console.warn('Firebase sync status:', errorMsg);
    return { success: false, error: errorMsg, permissionIssue: isPermissionError };
  }
}

/**
 * Looks up member by email or username from local store and Firestore
 */
export async function authenticateMember(
  identifier: string,
  _password?: string
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  const queryClean = identifier.trim().toLowerCase();
  if (!queryClean) {
    return { success: false, error: 'Please enter your username or email address.' };
  }

  // 1. Check local storage first
  const localMembers = getLocalRegisteredMembers();
  const matchedLocal = localMembers.find(
    (m) =>
      m.gmail.toLowerCase() === queryClean ||
      m.name.toLowerCase() === queryClean ||
      m.gmail.toLowerCase().startsWith(queryClean) ||
      queryClean.startsWith(m.gmail.toLowerCase())
  );

  if (matchedLocal) {
    return { success: true, profile: matchedLocal };
  }

  // 2. Try Firestore lookup
  try {
    const sanitizedKey = queryClean.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, 'members', sanitizedKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const profile: UserProfile = {
        name: data.name || identifier,
        gmail: data.gmail || identifier,
        phone: data.phone || '',
        year: data.year || 'I Year',
        department: data.department || 'B.Sc',
        photoUrl: data.photoUrl || '',
        isAdmin: (data.gmail || '').toLowerCase() === 'vjana537@gmail.com',
      };
      saveLocalRegisteredMember(profile);
      return { success: true, profile };
    }
  } catch (e) {
    console.warn('Firestore member lookup note:', e);
  }

  // 3. If member not found in existing records, generate clean default session or ask to register
  return {
    success: false,
    error: 'Account not found. Please click "Register / Create Account" below to register your full details.'
  };
}

/**
 * Handle Google Sign-In with popup & fallbacks
 */
export async function handleGoogleSignIn(): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;
    if (user) {
      const email = user.email || '';
      const name = user.displayName || email.split('@')[0] || 'Member';
      const photoUrl = user.photoURL || '';

      // Check if already registered
      const localMembers = getLocalRegisteredMembers();
      const found = localMembers.find(m => m.gmail.toLowerCase() === email.toLowerCase());

      const profile: UserProfile = found || {
        name: name,
        gmail: email,
        phone: '',
        year: 'I Year',
        department: 'B.Sc',
        photoUrl: photoUrl,
        isAdmin: email.toLowerCase() === 'vjana537@gmail.com',
      };

      await saveUserLoginToFirebase(profile);
      return { success: true, profile };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Google sign-in canceled or unavailable';
    console.warn('Google sign-in popup notice:', errorMsg);
    
    // If popup is blocked in iframe / preview, provide helpful simulated login with prompt
    return {
      success: false,
      error: 'Google Sign-In popup could not complete. You can sign in using your email/username or register below.'
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
 * Creates a new poll in Firestore and synchronizes with local storage
 */
export async function createPollInFirebase(newPoll: Omit<Poll, 'id'>): Promise<{ success: boolean; id: string; poll: Poll }> {
  const localId = 'poll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdPoll: Poll = {
    ...newPoll,
    id: localId,
  };

  // Immediate optimistic local save
  const currentPolls = getLocalStoredPolls();
  const updatedPolls = [createdPoll, ...currentPolls];
  saveLocalStoredPolls(updatedPolls);

  try {
    await ensureAuth();
    const docRef = await addDoc(collection(db, 'polls'), {
      ...newPoll,
      createdAtServer: serverTimestamp(),
    });
    
    // Update local ID if firestore returned docRef.id
    if (docRef.id) {
      createdPoll.id = docRef.id;
      const synced = updatedPolls.map(p => p.id === localId ? createdPoll : p);
      saveLocalStoredPolls(synced);
    }

    return { success: true, id: docRef.id || localId, poll: createdPoll };
  } catch (err) {
    console.warn('Firestore poll write saved locally fallback:', err);
    return { success: true, id: localId, poll: createdPoll };
  }
}

/**
 * Subscribes to live polls from Firestore with real-time updates and local fallback
 */
export function subscribeToPolls(onUpdate: (polls: Poll[]) => void): () => void {
  // Fire initial local cached data first
  const initialLocal = getLocalStoredPolls();
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  let unsubscribeSnapshot = () => {};

  try {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    unsubscribeSnapshot = onSnapshot(
      q,
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

          saveLocalStoredPolls(remotePolls);
          onUpdate(remotePolls);
        } else if (initialLocal.length === 0) {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('Real-time polls snapshot note (using local cache):', error.message);
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
 * Casts a vote on a poll
 */
export async function submitVoteInFirebase(
  pollId: string,
  selectedOptionIds: string[],
  userEmail: string
): Promise<{ success: boolean; updatedPoll?: Poll }> {
  const currentPolls = getLocalStoredPolls();
  const targetIndex = currentPolls.findIndex((p) => p.id === pollId);

  if (targetIndex === -1) {
    return { success: false };
  }

  const poll = currentPolls[targetIndex];
  const userAlreadyVoted = poll.votedUserEmails?.includes(userEmail);

  // Recalculate options
  const updatedOptions = poll.options.map((opt) => {
    // If user previously voted, remove their prior vote from option
    const hadVotedForThis = opt.voterEmails?.includes(userEmail) || false;
    let newVoterEmails = opt.voterEmails ? [...opt.voterEmails] : [];
    
    if (hadVotedForThis) {
      newVoterEmails = newVoterEmails.filter((e) => e !== userEmail);
    }

    // If selected in current vote, add them
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
    new Set([...(poll.votedUserEmails || []).filter(e => e !== userEmail), ...(selectedOptionIds.length > 0 ? [userEmail] : [])])
  );

  const totalVotesCount = updatedOptions.reduce((acc, opt) => acc + opt.votes, 0);

  const updatedPoll: Poll = {
    ...poll,
    options: updatedOptions,
    totalVotes: totalVotesCount,
    votedUserEmails: updatedVotedUsers,
  };

  currentPolls[targetIndex] = updatedPoll;
  saveLocalStoredPolls(currentPolls);

  // Update in Firestore
  try {
    await ensureAuth();
    const docRef = doc(db, 'polls', pollId);
    await updateDoc(docRef, {
      options: updatedOptions,
      totalVotes: totalVotesCount,
      votedUserEmails: updatedVotedUsers,
    });
  } catch (err) {
    console.warn('Firestore vote sync note (saved locally):', err);
  }

  return { success: true, updatedPoll };
}

/**
 * Toggle poll active status or delete
 */
export async function togglePollStatus(pollId: string, isActive: boolean): Promise<boolean> {
  const currentPolls = getLocalStoredPolls();
  const updated = currentPolls.map(p => p.id === pollId ? { ...p, isActive } : p);
  saveLocalStoredPolls(updated);

  try {
    await ensureAuth();
    await updateDoc(doc(db, 'polls', pollId), { isActive });
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
    await deleteDoc(doc(db, 'polls', pollId));
  } catch (err) {
    console.warn('Firestore poll delete note:', err);
  }
  return true;
}

export default app;

