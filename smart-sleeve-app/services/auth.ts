import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";


// Register user
export const register = async (email: string, password: string) => {
    return await createUserWithEmailAndPassword(auth, email, password);
};

// Login user
export const login = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

// Logout
export const logout = async () => {
    return await signOut(auth);
};