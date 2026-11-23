import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'] as const;

/** Firebase hanya dipakai untuk konektor Google Drive. Bila konfigurasi kosong, fitur itu nonaktif. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const NOT_CONFIGURED_MESSAGE =
  'Google Drive belum dikonfigurasi. Isi firebase-applet-config.json untuk mengaktifkannya.';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

let isSigningIn = false;
// Keep OAuth access token strictly in memory (never localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  const a = getFirebaseAuth();
  if (!a) {
    onAuthFailure?.();
    return () => undefined;
  }
  return onAuthStateChanged(a, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  const a = getFirebaseAuth();
  if (!a) throw new Error(NOT_CONFIGURED_MESSAGE);
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) provider.addScope(scope);
  try {
    isSigningIn = true;
    const result = await signInWithPopup(a, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh token akses Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
};

export const logout = async (): Promise<void> => {
  const a = getFirebaseAuth();
  if (a) await a.signOut();
  cachedAccessToken = null;
};
