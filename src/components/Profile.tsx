import React, { useState, useEffect } from 'react';
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
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { fetchAllChampions, ChampionData } from '../services/riotApi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Profile.scss';

interface UserProfile {
  username: string;
  userId: string;
  teams: string[];
  discordLink?: string;
  summonerName: string;
  email?: string;
  favoriteChampions?: string[]; // Champion IDs
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    summonerName: '',
    discordLink: '',
  });
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<ChampionData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [favoriteChampions, setFavoriteChampions] = useState<string[]>([]);
  const [loadingChampions, setLoadingChampions] = useState(false);
  const [championsError, setChampionsError] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Available roles for filtering
  const availableRoles = ['Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank'];

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
          setFavoriteChampions(userData.favoriteChampions || []);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchChampionsData = async () => {
      setLoadingChampions(true);
      try {
        const championData = await fetchAllChampions();
        setChampions(championData);
        setFilteredChampions(championData);
      } catch (err) {
        console.error('Error fetching champions:', err);
        setChampionsError('Failed to load champions');
      } finally {
        setLoadingChampions(false);
      }
    };

    fetchProfile();
    fetchChampionsData();
  }, [user]);

  // Filter champions when search term or role changes
  useEffect(() => {
    let filtered = champions;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(champion => 
        champion.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by role
    if (selectedRole) {
      filtered = filtered.filter(champion => 
        champion.roles.includes(selectedRole)
      );
    }
    
    setFilteredChampions(filtered);
  }, [searchTerm, selectedRole, champions]);

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
        favoriteChampions: favoriteChampions
      });

      setSuccess('Profile updated successfully');
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/teams/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to log out');
    }
  };

  const toggleFavoriteChampion = (championId: string) => {
    setFavoriteChampions(prev => {
      if (prev.includes(championId)) {
        return prev.filter(id => id !== championId);
      } else {
        return [...prev, championId];
      }
    });
  };

  const isChampionFavorite = (championId: string) => {
    return favoriteChampions.includes(championId);
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="profile">
      <ToastContainer position="top-right" autoClose={3000} />
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

          <div className="form-group champion-selection">
            <label>My Champion Pool</label>
            <div className="champion-filter">
              <input
                type="text"
                placeholder="Search champions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="champion-search"
              />
              <div className="role-filter">
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="role-select"
                >
                  <option value="">All Roles</option>
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingChampions ? (
              <div className="champions-loading">Loading champions...</div>
            ) : championsError ? (
              <div className="error-message">{championsError}</div>
            ) : (
              <div className="champions-grid">
                {filteredChampions.map(champion => (
                  <div 
                    key={champion.id} 
                    className={`champion-item ${isChampionFavorite(champion.id) ? 'favorite' : ''}`}
                    onClick={() => toggleFavoriteChampion(champion.id)}
                  >
                    <img 
                      src={champion.imageUrl} 
                      alt={champion.name} 
                      className="champion-image" 
                    />
                    <div className="champion-name">{champion.name}</div>
                    <div className="champion-roles">
                      {champion.roles.join(', ')}
                    </div>
                    {isChampionFavorite(champion.id) && (
                      <div className="favorite-badge">✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="selected-champions">
              <h3>Selected Champions ({favoriteChampions.length})</h3>
              <div className="selected-champions-list">
                {favoriteChampions.length === 0 ? (
                  <div className="no-champions">No champions selected</div>
                ) : (
                  <div className="selected-grid">
                    {favoriteChampions.map(id => {
                      const champion = champions.find(c => c.id === id);
                      if (!champion) return null;
                      
                      return (
                        <div key={id} className="selected-champion">
                          <img 
                            src={champion.imageUrl} 
                            alt={champion.name} 
                            className="champion-thumbnail" 
                          />
                          <span>{champion.name}</span>
                          <button 
                            type="button" 
                            className="remove-champion"
                            onClick={() => toggleFavoriteChampion(id)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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
        
        <div className="logout-section">
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile; 