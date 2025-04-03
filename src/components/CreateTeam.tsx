import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './CreateTeam.scss';

interface Role {
  name: string;
  filled: boolean;
  userId?: string;
}

interface UserProfile {
  username?: string;
  userId: string;
  teams?: string[];
  discordLink?: string;
  summonerName: string;
  email?: string;
}

export default function CreateTeam() {
  const [teamName, setTeamName] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // If we reach here, the user somehow bypassed summoner verification
          navigate('/summoner-verification');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user, navigate]);

  const roles: Role[] = [
    { name: 'Top', filled: false },
    { name: 'Jungle', filled: false },
    { name: 'Mid', filled: false },
    { name: 'ADC', filled: false },
    { name: 'Support', filled: false }
  ];

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    try {
      // Create team document
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: teamName,
        creatorId: user.uid,
        summonerName: userProfile.summonerName,
        roles: roles,
        createdAt: new Date(),
        discordLink: discordLink || null,
        members: [] // Start with empty members array - creator is tracked separately by creatorId
      });

      // Create or update user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        teams: arrayUnion({
          teamId: teamRef.id,
          role: 'Creator',
          joinedAt: new Date()
        })
      });

      navigate(`/teams/${teamRef.id}`);
    } catch (err) {
      console.error('Error creating team:', err);
      setError('Failed to create team');
    }
  };

  return (
    <div className="create-team">
      <div className="create-team-container">
        <h2>Create New Team</h2>
        <form onSubmit={handleCreateTeam}>
          <div className="form-group">
            <label htmlFor="teamName">Team Name</label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              placeholder="Enter team name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="discordLink">Discord Link (Optional)</label>
            <input
              type="url"
              id="discordLink"
              value={discordLink}
              onChange={(e) => setDiscordLink(e.target.value)}
              placeholder="Enter Discord invite link"
            />
          </div>
          <div className="roles-preview">
            <h3>Available Roles</h3>
            <ul>
              {roles.map((role) => (
                <li key={role.name}>
                  <span className="role-name">{role.name}</span>
                  <span className="role-status">Open</span>
                </li>
              ))}
            </ul>
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="create-button">
            Create Team
          </button>
        </form>
      </div>
    </div>
  );
} 