import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import './SummonerVerification.scss';

export default function SummonerVerification() {
  const [summonerName, setSummonerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/teams/login');
      return;
    }

    // Check if user already has a summoner name
    const checkExistingProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().summonerName) {
          console.log('User already has a summoner name, redirecting to teams');
          navigate('/teams');
        }
      } catch (err) {
        console.error('Error checking user profile:', err);
      }
    };

    checkExistingProfile();
  }, [user, navigate]);

  const checkSummonerName = async (name: string) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('summonerName', '==', name));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Validate summoner name
      if (!summonerName.trim()) {
        setError('Summoner name is required');
        setLoading(false);
        return;
      }

      // Check if summoner name is already taken
      const exists = await checkSummonerName(summonerName);
      if (exists) {
        setError('This summoner name is already taken');
        setLoading(false);
        return;
      }

      console.log('Saving summoner name:', summonerName);
      
      // Save user profile with summoner name
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        summonerName: summonerName,
        email: user.email,
        teams: [],
        createdAt: new Date()
      }, { merge: true });

      console.log('Successfully saved summoner name');
      
      // Indicate we're redirecting
      setRedirecting(true);
      
      // Wait for Firestore to sync
      setTimeout(() => {
        console.log('Redirecting to teams page...');
        navigate('/teams', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('Error saving summoner name:', err);
      setError('Failed to save summoner name');
      setRedirecting(false);
    } finally {
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="summoner-verification">
        <div className="verification-container">
          <h1>Welcome to Teams!</h1>
          <p>Your summoner name has been saved. Redirecting to teams page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="summoner-verification">
      <div className="verification-container">
        <h1>Welcome to Teams!</h1>
        <p>Enter your League of Legends summoner name to continue</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="summonerName">Summoner Name</label>
            <input
              type="text"
              id="summonerName"
              value={summonerName}
              onChange={(e) => setSummonerName(e.target.value)}
              placeholder="Enter your summoner name"
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <button 
            type="submit" 
            className="verify-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
} 