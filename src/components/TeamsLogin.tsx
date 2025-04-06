import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './TeamsLogin.scss';

export default function TeamsLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authMethod, setAuthMethod] = useState<'login' | 'register'>('login');
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

  // Check for redirect result on component mount (for OAuth flows)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // A sign-in with redirect was just completed
          const user = result.user;
          console.log('User signed in after redirect:', user.uid);
          await checkUserProfileAndRedirect(user.uid);
        }
      } catch (err) {
        console.error('Error handling redirect result:', err);
        setError('Authentication after redirect failed. Please try again.');
      }
    };

    handleRedirectResult();
  }, []);

  const checkUserProfileAndRedirect = async (userId: string) => {
    // Check if user already has a profile with a summoner name
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists() && userDoc.data().summonerName) {
      // User already has a profile with summoner name, navigate to teams
      console.log('User has summoner name, redirecting to teams');
      navigate('/teams', { replace: true });
    } else {
      // New user or user without summoner name, redirect to verification
      console.log('User needs to set summoner name, redirecting to verification');
      navigate('/summoner-verification', { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      console.log('Starting Google sign in...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('User signed in:', user.uid);
      
      // Ensure user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          userId: user.uid,
          email: user.email,
          createdAt: new Date(),
          provider: 'google.com'
        });
      }
      
      await checkUserProfileAndRedirect(user.uid);
    } catch (err: any) {
      console.error('Error signing in with Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups for this site.');
      } else {
        setError(`Failed to sign in with Google: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let user;
      if (authMethod === 'register') {
        // Register new user
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        console.log('User registered:', user.uid);
        
        // Create initial user document
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          userId: user.uid,
          createdAt: new Date(),
          provider: 'password'
        });
      } else {
        // Login existing user
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
        console.log('User logged in:', user.uid);
      }
      
      await checkUserProfileAndRedirect(user.uid);
    } catch (err: any) {
      console.error('Error with email/password authentication:', err);
      // Provide user-friendly error messages
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
        setAuthMethod('login');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(`Authentication failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMethod = () => {
    setAuthMethod(prev => prev === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="teams-login">
      <div className="login-container">
        <h1>{authMethod === 'login' ? 'Teams Login' : 'Create Account'}</h1>
        <p>Sign in to access the Teams feature</p>
        
        <form onSubmit={handleEmailPasswordSubmit} className="email-password-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="email-submit-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : authMethod === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-toggle">
          <button onClick={toggleAuthMethod} className="toggle-auth-button">
            {authMethod === 'login' 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
        
        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <div className="social-auth-buttons">
          <button 
            onClick={handleGoogleSignIn} 
            className="google-sign-in"
            disabled={loading}
          >
            <span className="icon">G</span>
            <span>{authMethod === 'login' ? 'Sign in with Google' : 'Continue with Google'}</span>
          </button>
          
          <div className="auth-note">
            <p>We support email and Google authentication methods for secure access.</p>
          </div>
        </div>
        
        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 