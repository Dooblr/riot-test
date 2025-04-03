import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Profile.scss';

interface UserProfile {
  username: string;
  userId: string;
  teams: string[];
  discordLink?: string;
  summonerName: string;
  email?: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    summonerName: '',
    discordLink: '',
  });
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setProfile(userData);
          setFormData({
            summonerName: userData.summonerName || '',
            discordLink: userData.discordLink || '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const checkSummonerNameUnique = async (name: string) => {
    // If unchanged, no need to check
    if (profile && name === profile.summonerName) {
      return true;
    }
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('summonerName', '==', name));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validate summoner name
      if (!formData.summonerName.trim()) {
        setError('Summoner name is required');
        setLoading(false);
        return;
      }
      
      // Check for uniqueness if changed
      const isUnique = await checkSummonerNameUnique(formData.summonerName);
      if (!isUnique) {
        setError('This summoner name is already taken');
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        summonerName: formData.summonerName,
        discordLink: formData.discordLink,
      });

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="profile">
      <div className="profile-container">
        <h1>Edit Profile</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="summonerName">Summoner Name</label>
            <input
              type="text"
              id="summonerName"
              value={formData.summonerName}
              onChange={(e) => setFormData(prev => ({ ...prev, summonerName: e.target.value }))}
              placeholder="Enter your summoner name"
              required
            />
            <div className="form-hint">
              This name will be displayed to other users and must be unique
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="discordLink">Discord Link</label>
            <input
              type="url"
              id="discordLink"
              value={formData.discordLink}
              onChange={(e) => setFormData(prev => ({ ...prev, discordLink: e.target.value }))}
              placeholder="Enter your Discord invite link"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/teams')} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 