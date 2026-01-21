import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../config/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    /**
     * Login dengan email dan password
     */
    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result;
    };

    /**
     * Register user baru dengan email verification
     */
    const register = async (email, password, storeName) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;

        // Send email verification
        try {
            await firebaseSendEmailVerification(user);
        } catch (error) {
            console.error('Error sending verification email:', error);
        }

        // Create user/store document
        const userData = {
            email,
            storeName,
            ownerId: user.uid,
            createdAt: new Date().toISOString(),
            role: 'owner',
            emailVerified: false
        };

        await setDoc(doc(db, 'users', user.uid), userData);
        setUserProfile(userData);
        return res;
    };

    /**
     * Logout user
     */
    const logout = () => {
        return signOut(auth);
    };

    /**
     * Send password reset email
     * @param {string} email - Email address
     */
    const sendPasswordReset = async (email) => {
        return firebaseSendPasswordResetEmail(auth, email);
    };

    /**
     * Resend email verification ke user yang sedang login
     */
    const resendVerificationEmail = async () => {
        if (currentUser && !currentUser.emailVerified) {
            return firebaseSendEmailVerification(currentUser);
        }
        throw new Error('User tidak valid atau email sudah terverifikasi');
    };

    /**
     * Check apakah email sudah diverifikasi
     */
    const isEmailVerified = () => {
        return currentUser?.emailVerified || false;
    };

    /**
     * Reload user untuk update emailVerified status
     */
    const reloadUser = async () => {
        if (currentUser) {
            await currentUser.reload();
            // Force re-render
            setCurrentUser({ ...currentUser });
        }
    };

    const value = {
        currentUser,
        ownerId: currentUser?.uid,
        userProfile,
        login,
        register,
        logout,
        sendPasswordReset,
        resendVerificationEmail,
        isEmailVerified,
        reloadUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
