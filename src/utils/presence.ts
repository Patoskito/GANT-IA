import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

/**
 * Records or updates user login timestamp in Firestore
 */
export async function recordUserLogin(email: string, name?: string, role?: string, photoURL?: string) {
  if (!email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  try {
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const existingData = userDoc.data();
      await updateDoc(doc(db, 'users', userDoc.id), {
        lastLoginAt: nowIso,
        lastActiveAt: nowIso,
        isOnline: true,
        ...(photoURL ? { photoURL } : {}),
        ...(name && !existingData.name ? { name } : {}),
        ...(role && !existingData.role ? { role } : {}),
      });
    } else {
      await addDoc(collection(db, 'users'), {
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: role || (normalizedEmail === 'kayme@flesan.com.pe' ? 'Administrador' : 'Usuario'),
        lastLoginAt: nowIso,
        lastActiveAt: nowIso,
        isOnline: true,
        photoURL: photoURL || '',
      });
    }

    // Also update localStorage for instant offline access
    localStorage.setItem(`user_last_login_${normalizedEmail}`, nowIso);
  } catch (error) {
    console.error("Error recording user login in Firestore:", error);
  }
}

/**
 * Periodically updates the user's heartbeat (last active timestamp)
 */
export async function recordUserHeartbeat(email: string) {
  if (!email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  try {
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        lastActiveAt: nowIso,
        isOnline: true,
      });
    }
  } catch (error) {
    // Non-blocking background error
    console.debug("Error updating heartbeat:", error);
  }
}

/**
 * Records user logout timestamp and marks user as offline in Firestore
 */
export async function recordUserLogout(email: string, reason: 'manual' | 'inactivity' = 'manual') {
  if (!email) return;
  const normalizedEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();

  try {
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        isOnline: false,
        lastLogoutAt: nowIso,
        lastActiveAt: nowIso,
        logoutReason: reason,
      });
    }

    localStorage.setItem(`user_last_logout_${normalizedEmail}`, nowIso);
    localStorage.removeItem(`user_last_login_${normalizedEmail}`);
  } catch (error) {
    console.error("Error recording user logout in Firestore:", error);
  }
}

/**
 * Checks whether a user is genuinely currently online:
 * - isOnline must NOT be false
 * - if lastLogoutAt is greater than or equal to lastLoginAt, they have logged out
 * - must have active heartbeat/activity within maxMinutes (default 15)
 */
export function isUserActuallyOnline(
  user: {
    isOnline?: boolean;
    lastActiveAt?: string;
    lastLoginAt?: string;
    lastLogoutAt?: string;
  },
  maxMinutes = 15
): boolean {
  if (user.isOnline === false) return false;

  // Si tiene registro de cierre de sesión posterior a su último ingreso, está desconectado
  if (user.lastLogoutAt && user.lastLoginAt) {
    const logoutTime = new Date(user.lastLogoutAt).getTime();
    const loginTime = new Date(user.lastLoginAt).getTime();
    if (!isNaN(logoutTime) && !isNaN(loginTime) && logoutTime >= loginTime) {
      return false;
    }
  }

  return isUserRecentlyActive(user.lastActiveAt, maxMinutes);
}

/**
 * Helper to check if a user is currently active (within last N minutes)
 */
export function isUserRecentlyActive(lastActiveAt?: string, maxMinutes = 15): boolean {
  if (!lastActiveAt) return false;
  const timestamp = new Date(lastActiveAt).getTime();
  if (isNaN(timestamp)) return false;
  const diffMinutes = (Date.now() - timestamp) / (1000 * 60);
  return diffMinutes <= maxMinutes;
}

/**
 * Helper to check if a user logged in or was active today
 */
export function hasUserLoggedInToday(lastLoginAt?: string, lastActiveAt?: string): boolean {
  const targetDate = lastActiveAt || lastLoginAt;
  if (!targetDate) return false;
  const date = new Date(targetDate);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format a timestamp into friendly display for UI:
 * e.g. "Hoy, 09:15 AM", "Ayer, 18:20 PM", "12/10/2026, 14:30"
 */
export function formatConnectionTimestamp(isoString?: string): {
  badge: string;
  details: string;
  isToday: boolean;
  isRecent: boolean;
} {
  if (!isoString) {
    return {
      badge: "Sin conexión registrada",
      details: "Nunca ha iniciado sesión",
      isToday: false,
      isRecent: false,
    };
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return {
      badge: "Fecha no válida",
      details: "",
      isToday: false,
      isRecent: false,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
  const timeStr = `${formattedHours}:${minutes} ${ampm}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const isRecent = diffMinutes < 15;

  let badge = "";
  let details = "";

  if (diffMinutes < 1) {
    badge = "Conectado ahora";
    details = `A las ${timeStr}`;
  } else if (diffMinutes < 60) {
    badge = `Hace ${diffMinutes} min`;
    details = `Hoy a las ${timeStr}`;
  } else if (isToday) {
    badge = `Hoy a las ${timeStr}`;
    details = `Hace ${diffHours} h`;
  } else if (isYesterday) {
    badge = `Ayer a las ${timeStr}`;
    details = "Día anterior";
  } else {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    badge = `${day}/${month}/${year}`;
    details = `${timeStr}`;
  }

  return { badge, details, isToday, isRecent };
}
