import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Initiative } from '../types';
import { initialInitiatives } from '../data';

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
              await setDoc(doc(db, 'initiatives', init.id), init);
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
    await setDoc(doc(db, 'initiatives', initiative.id), initiative);
  };

  const updateInitiative = async (id: string, field: keyof Initiative, value: any) => {
    await updateDoc(doc(db, 'initiatives', id), { [field]: value });
  };

  const updateFullInitiative = async (initiative: Initiative) => {
    await setDoc(doc(db, 'initiatives', initiative.id), initiative);
  };

  const deleteInitiative = async (id: string) => {
    await deleteDoc(doc(db, 'initiatives', id));
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
