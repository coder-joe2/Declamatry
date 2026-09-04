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
import { UserProfile, Poll, RegisteredMember, MeetingVotingSession, formatSpeakerRole, AppMessage } from './types';

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
      executiveRole: profile.executiveRole || '',
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
      const rawSpeakerRoles = data.speakerRoles;
      let speakerRolesList: string[] = [];
      if (Array.isArray(rawSpeakerRoles)) {
        speakerRolesList = rawSpeakerRoles.filter(Boolean);
      } else if (typeof rawSpeakerRoles === 'string' && rawSpeakerRoles.trim()) {
        speakerRolesList = rawSpeakerRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof data.speakerRole === 'string' && data.speakerRole.trim()) {
        speakerRolesList = data.speakerRole.split(',').map((s: string) => s.trim()).filter(Boolean);
      }

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
        const rawSpeakerRoles = data.speakerRoles;
        let speakerRolesList: string[] = [];
        if (Array.isArray(rawSpeakerRoles)) {
          speakerRolesList = rawSpeakerRoles.filter(Boolean);
        } else if (typeof rawSpeakerRoles === 'string' && rawSpeakerRoles.trim()) {
          speakerRolesList = rawSpeakerRoles.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof data.speakerRole === 'string' && data.speakerRole.trim()) {
          speakerRolesList = data.speakerRole.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

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
            executiveRole: d.executiveRole || '',
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
        executiveRole: '',
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
      readBy: msg.readBy || [],
      createdAt: msg.createdAt || new Date().toISOString(),
    };

    // 1. Optimistically store in local cache
    const existing = getLocalStoredMessages();
    const updated = [newMessage, ...existing.filter((m) => m.id !== docId)];
    saveLocalStoredMessages(updated);

    // 2. Persist to Firestore
    await ensureAuth();
    const docRef = doc(db, 'messages', docId);
    await setDoc(
      docRef,
      {
        ...newMessage,
        serverTime: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, message: newMessage };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
    console.error('sendAppMessage error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Real-time subscription to messages for a given user.
 * Returns both public broadcast messages (for all members and admin)
 * and personal messages addressed to this user's email.
 */
export function subscribeToUserMessages(
  userEmail: string,
  onUpdate: (messages: AppMessage[]) => void
): () => void {
  const normEmail = (userEmail || '').trim().toLowerCase();

  // Initial cached render
  const initialLocal = getLocalStoredMessages();
  const filteredInitial = initialLocal.filter((m) => {
    if (!m) return false;
    if (m.targetEmail === 'public' || m.isBroadcast) return true;
    if (normEmail && m.targetEmail?.toLowerCase() === normEmail) return true;
    return false;
  });
  if (filteredInitial.length > 0) {
    onUpdate(filteredInitial);
  }

  let unsubscribe = () => {};

  try {
    const colRef = collection(db, 'messages');
    unsubscribe = onSnapshot(
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
              readBy: data.readBy || [],
            };
          });

          // Sort newest first
          allRemote.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Save complete set to cache
          saveLocalStoredMessages(allRemote);

          // Filter for current user
          const forUser = allRemote.filter((m) => {
            if (m.targetEmail === 'public' || m.isBroadcast) return true;
            if (normEmail && m.targetEmail?.toLowerCase() === normEmail) return true;
            return false;
          });

          onUpdate(forUser);
        } else {
          onUpdate([]);
        }
      },
      (error) => {
        console.warn('Real-time messages listener note (using cache):', error.message);
        onUpdate(filteredInitial);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to messages:', err);
    onUpdate(filteredInitial);
  }

  return () => {
    unsubscribe();
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
 * Delete a message (Admin or user)
 */
export async function deleteAppMessage(messageId: string): Promise<boolean> {
  const current = getLocalStoredMessages();
  saveLocalStoredMessages(current.filter((m) => m.id !== messageId));

  try {
    await ensureAuth();
    const docRef = doc(db, 'messages', messageId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('deleteAppMessage note:', err);
    return true;
  }
}

export default app;

