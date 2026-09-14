import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WeeklyTask } from '../types';

export function useWeeklyTasks() {
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const colRef = collection(db, 'weeklyTasks');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const parsed: WeeklyTask[] = [];
        snapshot.forEach((doc) => {
          parsed.push(doc.data() as WeeklyTask);
        });
        setTasks(parsed);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching weekly tasks:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTask = async (task: WeeklyTask) => {
    try {
      await setDoc(doc(db, 'weeklyTasks', task.id), task);
    } catch (e) {
      console.error('Error adding weekly task', e);
    }
  };

  const updateTask = async (id: string, updates: Partial<WeeklyTask>) => {
    try {
      await updateDoc(doc(db, 'weeklyTasks', id), updates);
    } catch (e) {
      console.error('Error updating weekly task', e);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'weeklyTasks', id));
    } catch (e) {
      console.error('Error deleting weekly task', e);
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
}
