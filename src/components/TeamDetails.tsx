import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './TeamDetails.scss';

interface Team {
  id: string;
  name: string;
  creatorId: string;
  summonerName: string;
  roles: {
    name: string;
    filled: boolean;
    userId?: string;
  }[];
  members: {
    userId: string;
    role: string;
    joinedAt: Date;
  }[];
  createdAt: Date;
  discordLink?: string;
}

interface RoleUser {
  userId: string;
  username: string;
}

// Role icon mapping
const roleIcons: Record<string, string> = {
  'Top': '🛡️',
  'Jungle': '🌲',
  'Mid': '✨',
  'ADC': '🏹',
  'Support': '💖',
};

export default function TeamDetails() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [roleUsers, setRoleUsers] = useState<Record<string, RoleUser>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);
  const [discordLink, setDiscordLink] = useState('');
  const [isEditingDiscord, setIsEditingDiscord] = useState(false);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchTeamDetails = async () => {
      if (!teamId) return;

      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (!teamDoc.exists()) {
          setError('Team not found');
          return;
        }

        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;

        setTeam(teamData);
        setDiscordLink(teamData.discordLink || '');

        // Fetch user information for all filled roles
        const userIds = new Set<string>();
        teamData.roles.forEach(role => {
          if (role.userId) userIds.add(role.userId);
        });

        const userProfiles: Record<string, RoleUser> = {};
        for (const userId of userIds) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfiles[userId] = {
              userId,
              username: userData.summonerName || 'Unknown'
            };
          }
        }
        setRoleUsers(userProfiles);
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [teamId]);

  const getRoleUser = (userId: string | null) => {
    if (!userId) return null;
    return roleUsers[userId] || null;
  };

  const getOpenRolesCount = () => {
    if (!team) return 0;
    return team.roles.filter(role => !role.filled).length;
  };

  const getUserRole = () => {
    if (!user || !team) return null;
    const userRole = team.roles.find(role => role.userId === user.uid);
    return userRole ? userRole.name : null;
  };

  const isUserInAnyRole = (userId: string | null) => {
    if (!userId || !team) return false;
    return team.roles.some(role => role.userId === userId);
  };

  const isTeamOwner = () => {
    return user?.uid === team?.creatorId;
  };

  const handleJoinRole = async (roleName: string) => {
    if (!user || !team) {
      setJoinError('You must be logged in to join a role');
      return;
    }

    try {
      // Check if the user is already in any role in this team
      if (isUserInAnyRole(user.uid)) {
        setJoinError('You are already in a role in this team');
        return;
      }

      // Check if the role is already filled
      const roleIndex = team.roles.findIndex(r => r.name === roleName);
      if (roleIndex === -1 || team.roles[roleIndex].filled) {
        setJoinError('This role is already filled');
        return;
      }

      // Update the team with the new role
      const teamRef = doc(db, 'teams', team.id);
      const updatedRoles = [...team.roles];
      updatedRoles[roleIndex] = {
        ...updatedRoles[roleIndex],
        filled: true,
        userId: user.uid
      };

      await updateDoc(teamRef, {
        roles: updatedRoles,
        members: arrayUnion({
          userId: user.uid,
          role: roleName,
          joinedAt: new Date()
        })
      });

      // Refresh the team data
      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;
        setTeam(teamData);

        // Update role users
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRoleUsers(prev => ({
            ...prev,
            [user.uid]: {
              userId: user.uid,
              username: userData.summonerName || userData.username || 'Unknown'
            }
          }));
        }
      }

      setJoinError(null);
    } catch (err) {
      console.error('Error joining role:', err);
      setJoinError('Failed to join role');
    }
  };

  const handleSwapRole = async (newRoleName: string) => {
    if (!user || !team) {
      setJoinError('You must be logged in to swap roles');
      return;
    }

    setIsSwapping(true);
    setJoinError(null);

    try {
      // Find current user role
      const currentRole = team.roles.find(role => role.userId === user.uid);
      if (!currentRole) {
        setJoinError('You are not currently in any role');
        setIsSwapping(false);
        return;
      }

      // Find new role
      const newRoleIndex = team.roles.findIndex(r => r.name === newRoleName);
      if (newRoleIndex === -1) {
        setJoinError('Selected role does not exist');
        setIsSwapping(false);
        return;
      }

      // Check if new role is already filled
      if (team.roles[newRoleIndex].filled) {
        setJoinError('The selected role is already filled');
        setIsSwapping(false);
        return;
      }

      // Update the team with the role swap
      const teamRef = doc(db, 'teams', team.id);
      const updatedRoles = [...team.roles];
      
      // Remove user from current role
      const currentRoleIndex = updatedRoles.findIndex(r => r.userId === user.uid);
      updatedRoles[currentRoleIndex] = {
        ...updatedRoles[currentRoleIndex],
        filled: false,
        userId: null
      };
      
      // Add user to new role
      updatedRoles[newRoleIndex] = {
        ...updatedRoles[newRoleIndex],
        filled: true,
        userId: user.uid
      };

      // Update members array
      const oldMember = team.members.find(m => m.userId === user.uid && m.role === currentRole.name);
      const newMember = {
        userId: user.uid,
        role: newRoleName,
        joinedAt: new Date()
      };

      await updateDoc(teamRef, {
        roles: updatedRoles,
        members: arrayRemove(oldMember)
      });

      await updateDoc(teamRef, {
        members: arrayUnion(newMember)
      });

      // Refresh the team data
      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;
        setTeam(teamData);
      }
    } catch (err) {
      console.error('Error swapping roles:', err);
      setJoinError('Failed to swap roles');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleUpdateDiscordLink = async () => {
    if (!team || !user) return;
    
    // Check if user is the team owner
    if (user.uid !== team.creatorId) {
      setDiscordError('Only the team owner can update the Discord link');
      return;
    }

    setDiscordError(null);
    
    try {
      // Validate discord link
      let formattedLink = discordLink.trim();
      if (formattedLink && !formattedLink.startsWith('http')) {
        formattedLink = `https://${formattedLink}`;
      }

      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, {
        discordLink: formattedLink
      });

      // Refresh team data
      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;
        setTeam(teamData);
      }

      setIsEditingDiscord(false);
    } catch (err) {
      console.error('Error updating Discord link:', err);
      setDiscordError('Failed to update Discord link');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !user) return;

    if (deleteConfirmation !== team.name) {
      setDeleteError('Team name does not match');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDoc(doc(db, 'teams', team.id));
      navigate('/teams');
    } catch (err) {
      console.error('Error deleting team:', err);
      setDeleteError('Failed to delete team');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading team details...</div>;
  }

  if (error || !team) {
    return (
      <div className="error">
        {error || 'Team not found'}
        <button onClick={() => navigate('/teams')} className="back-button">
          Back to Teams
        </button>
      </div>
    );
  }

  const currentUserRole = getUserRole();

  return (
    <div className="team-details">
      <button onClick={() => navigate('/teams')} className="back-button">
        ← Back to Teams
      </button>

      <div className="team-header">
        <h2>{team.name}</h2>
        <div className="team-creator">
          <span>Created by</span>
          <span className="creator-name">{team.summonerName}</span>
          <span className="creator-badge">👑</span>
        </div>
        <div className="team-stats">
          <div className="stat">
            <span className="label">Open Roles</span>
            <span className="value">{getOpenRolesCount()}</span>
          </div>
          <div className="stat">
            <span className="label">Created</span>
            <span className="value">
              {team.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {joinError && <div className="join-error">{joinError}</div>}

      <div className="discord-section">
        <h3>Discord Server</h3>
        {isEditingDiscord ? (
          <div className="discord-edit">
            <input
              type="text"
              value={discordLink}
              onChange={(e) => setDiscordLink(e.target.value)}
              placeholder="Enter Discord invite link"
              className="discord-input"
            />
            {discordError && <div className="discord-error">{discordError}</div>}
            <div className="discord-actions">
              <button 
                onClick={handleUpdateDiscordLink} 
                className="save-discord-button"
              >
                Save Link
              </button>
              <button 
                onClick={() => {
                  setIsEditingDiscord(false);
                  setDiscordLink(team.discordLink || '');
                  setDiscordError(null);
                }} 
                className="cancel-discord-button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="discord-display">
            {team.discordLink ? (
              <>
                <a 
                  href={team.discordLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="discord-link-button"
                >
                  Join Discord Server
                </a>
                {isTeamOwner() && (
                  <button 
                    onClick={() => setIsEditingDiscord(true)} 
                    className="edit-discord-button"
                  >
                    Edit Link
                  </button>
                )}
              </>
            ) : (
              isTeamOwner() ? (
                <button 
                  onClick={() => setIsEditingDiscord(true)} 
                  className="add-discord-button"
                >
                  Add Discord Link
                </button>
              ) : (
                <div className="no-discord">No Discord link provided</div>
              )
            )}
          </div>
        )}
      </div>

      <div className="roles-grid">
        {team.roles.map((role) => (
          <div key={role.name} className={`role-card ${role.name.toLowerCase()}`}>
            <h3>
              <span className="role-icon">{roleIcons[role.name] || '👤'}</span>
              {role.name}
            </h3>
            {role.filled ? (
              <div className="player-info">
                <span className="player-name">
                  {getRoleUser(role.userId)?.username || 'Unknown'}
                </span>
                {role.userId === user?.uid && (
                  <span className="your-role-badge">You</span>
                )}
              </div>
            ) : (
              <div className="role-open">
                <span>Open</span>
                {!isUserInAnyRole(user?.uid) ? (
                  <button 
                    onClick={() => handleJoinRole(role.name)}
                    className="join-button"
                  >
                    Join
                  </button>
                ) : user && currentUserRole ? (
                  <button 
                    onClick={() => handleSwapRole(role.name)}
                    className="select-button"
                    disabled={isSwapping}
                  >
                    {isSwapping ? 'Swapping...' : 'Select'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {isTeamOwner() && (
        <div className="delete-team-container">
          <button 
            onClick={() => setIsDeleteSectionOpen(!isDeleteSectionOpen)} 
            className="delete-toggle-button"
          >
            {isDeleteSectionOpen ? 'Hide Delete Options ▲' : 'Delete Team ▼'}
          </button>
          
          {isDeleteSectionOpen && (
            <div className="delete-team-section">
              <h3>Delete Team</h3>
              <p className="warning">
                This action cannot be undone. All team data will be permanently deleted.
              </p>
              <div className="delete-confirmation">
                <p>To confirm deletion, please type the team name: <strong>{team.name}</strong></p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Enter team name"
                  className="delete-input"
                />
                {deleteError && <div className="delete-error">{deleteError}</div>}
                <button
                  onClick={handleDeleteTeam}
                  disabled={deleteConfirmation !== team.name || isDeleting}
                  className="delete-button"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 