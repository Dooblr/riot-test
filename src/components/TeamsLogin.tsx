import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './TeamsLogin.scss';

export default function TeamsLogin() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const checkAuthState = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('User already logged in:', currentUser.uid);
        
        // Check if user has a profile with summoner name
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().summonerName) {
            console.log('User has summoner name, redirecting to teams');
            navigate('/teams');
          } else {
            console.log('User needs to set summoner name');
            navigate('/summoner-verification');
          }
        } catch (err) {
          console.error('Error checking user profile:', err);
        }
      }
    };
    
    checkAuthState();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      console.log('Starting Google sign in...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('User signed in:', user.uid);
      
      // Check if user already has a profile with a summoner name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists() && userDoc.data().summonerName) {
        // User already has a profile with summoner name, navigate to teams
        console.log('User has summoner name, redirecting to teams');
        navigate('/teams', { replace: true });
      } else {
        // New user or user without summoner name, redirect to verification
        console.log('User needs to set summoner name, redirecting to verification');
        navigate('/summoner-verification', { replace: true });
      }
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teams-login">
      <div className="login-container">
        <h1>Teams Login</h1>
        <p>Sign in to access the Teams feature</p>
        <button 
          onClick={handleGoogleSignIn} 
          className="google-sign-in"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
} 