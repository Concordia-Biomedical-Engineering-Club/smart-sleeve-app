"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/types";

export function useSessions(userId: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", userId, "sessions"),
      orderBy("timestamp", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionList: Session[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as Session;
        });

        setSessions(sessionList);
        setLoading(false);
      },
      (err) => {
        console.error("[useSessions] Error:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { sessions, loading, error };
}
