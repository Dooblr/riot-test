import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
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
}

interface RoleUser {
  userId: string;
  username: string;
}

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

      <div className="roles-grid">
        {team.roles.map((role) => (
          <div key={role.name} className={`role-card ${role.name.toLowerCase()}`}>
            <h3>{role.name}</h3>
            {role.filled ? (
              <div className="player-info">
                <span className="player-name">
                  {getRoleUser(role.userId)?.username || 'Unknown'}
                </span>
              </div>
            ) : (
              <div className="role-open">
                <span>Open</span>
                <button 
                  onClick={() => handleJoinRole(role.name)}
                  className="join-button"
                  disabled={isUserInAnyRole(user?.uid)}
                >
                  Join
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isTeamOwner() && (
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
  );
} 