import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Initiative } from '../types';
import { initialInitiatives } from '../data';
import { sanitizeForFirestore } from '../lib/firestoreUtils';

export function useInitiatives(userProfile: any) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) {
      setInitiatives([]);
      setLoading(false);
      return;
    }

    const initiativesRef = collection(db, 'initiatives');
    const unsubscribe = onSnapshot(initiativesRef, (snapshot) => {
      const data: Initiative[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as Initiative);
      });
      
      if (data.length === 0 && !snapshot.metadata.fromCache) {
        const seedData = async () => {
          try {
            for (const init of initialInitiatives) {
              await setDoc(doc(db, 'initiatives', init.id), sanitizeForFirestore(init));
            }
          } catch (e) {
            console.warn("Could not seed Firestore, using local fallback:", e);
            setInitiatives(initialInitiatives);
          }
        };
        seedData();
      } else {
        setInitiatives(data.length > 0 ? data : initialInitiatives);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore connection unavailable, operating with local state:", error);
      setInitiatives(initialInitiatives);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const addInitiative = async (initiative: Initiative) => {
    try {
      const clean = sanitizeForFirestore(initiative);
      await setDoc(doc(db, 'initiatives', initiative.id), clean);
    } catch (e) {
      console.warn("Error adding initiative in Firestore, applying local state:", e);
      setInitiatives(prev => [...prev.filter(i => i.id !== initiative.id), initiative]);
    }
  };

  const updateInitiative = async (id: string, field: keyof Initiative | Partial<Initiative>, value?: any) => {
    try {
      const rawUpdates = typeof field === 'string' ? { [field]: value } : field;
      const updates = sanitizeForFirestore(rawUpdates);
      await updateDoc(doc(db, 'initiatives', id), updates);
    } catch (e) {
      console.warn("Error updating initiative in Firestore, applying local update:", e);
      setInitiatives(prev => prev.map(init => {
        if (init.id !== id) return init;
        const rawUpdates = typeof field === 'string' ? { [field]: value } : field;
        return { ...init, ...rawUpdates };
      }));
    }
  };

  const updateFullInitiative = async (initiative: Initiative) => {
    try {
      const clean = sanitizeForFirestore(initiative);
      await setDoc(doc(db, 'initiatives', initiative.id), clean);
    } catch (e) {
      console.warn("Error updating full initiative in Firestore, applying local update:", e);
      setInitiatives(prev => prev.map(init => init.id === initiative.id ? initiative : init));
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'initiatives', id));
    } catch (e) {
      console.warn("Error deleting initiative in Firestore, applying local update:", e);
      setInitiatives(prev => prev.filter(init => init.id !== id));
    }
  };

  return {
    initiatives,
    loading,
    addInitiative,
    updateInitiative,
    updateFullInitiative,
    deleteInitiative
  };
}
