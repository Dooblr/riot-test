import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './TeamDetails.scss';

interface Team {
  id: string;
  name: string;
  creatorId: string;
  summonerName: string;
  description?: string;
  roles: {
    name: string;
    filled: boolean;
    userId?: string;
    preferredChampion?: string;
  }[];
  members: {
    userId: string;
    role: string;
    joinedAt: Date;
  }[];
  createdAt: Date;
  discordLink?: string;
  discordAccess?: string[];
  discordRequests?: string[];
  passwordProtected?: boolean;
  password?: string;
}

interface RoleUser {
  userId: string;
  username: string;
}

interface TeamComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
}

interface ChampionData {
  id: string;
  key: string;
  name: string;
  title: string;
  imageUrl: string;
  roles: string[];
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
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamNameError, setTeamNameError] = useState<string | null>(null);
  const user = auth.currentUser;
  const [comments, setComments] = useState<TeamComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userChampions, setUserChampions] = useState<Record<string, ChampionData[]>>({});
  const [loadingChampions, setLoadingChampions] = useState(false);
  const [isSelectingChampion, setIsSelectingChampion] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [updatingChampion, setUpdatingChampion] = useState(false);
  const [requestingDiscord, setRequestingDiscord] = useState(false);
  const [discordRequestSuccess, setDiscordRequestSuccess] = useState(false);
  const [pendingDiscordRequests, setPendingDiscordRequests] = useState<string[]>([]);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchUserChampions = async (userId: string) => {
    try {
      setLoadingChampions(true);
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data();
      const favoriteChampionIds = userData.favoriteChampions || [];
      
      if (favoriteChampionIds.length === 0) {
        return [];
      }
      
      const response = await fetch('https://ddragon.leagueoflegends.com/cdn/13.24.1/data/en_US/champion.json');
      const data = await response.json();
      const allChampions = Object.values(data.data) as any[];
      
      const favoriteChampions = allChampions
        .filter(champion => favoriteChampionIds.includes(champion.id))
        .map(champion => ({
          id: champion.id,
          key: champion.key,
          name: champion.name,
          title: champion.title,
          imageUrl: `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${champion.image.full}`,
          roles: champion.tags || []
        }));
      
      return favoriteChampions;
    } catch (err) {
      console.error('Error fetching champion data:', err);
      return [];
    } finally {
      setLoadingChampions(false);
    }
  };

  useEffect(() => {
    let commentsUnsubscribe: (() => void) | undefined;
    
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
        setTeamName(teamData.name);
        setDiscordLink(teamData.discordLink || '');
        setDescription(teamData.description || '');
        
        if (teamData.discordRequests && teamData.discordRequests.length > 0) {
          setPendingDiscordRequests(teamData.discordRequests);
        } else {
          setPendingDiscordRequests([]);
        }

        const userIds = new Set<string>();
        teamData.roles.forEach(role => {
          if (role.userId) userIds.add(role.userId);
        });

        const userProfiles: Record<string, RoleUser> = {};
        const championsData: Record<string, ChampionData[]> = {};

        for (const userId of userIds) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfiles[userId] = {
              userId,
              username: userData.summonerName || 'Unknown'
            };
            
            const userChampionData = await fetchUserChampions(userId);
            championsData[userId] = userChampionData;
          }
        }
        setRoleUsers(userProfiles);
        setUserChampions(championsData);

        if (teamId) {
          try {
            const commentsQuery = query(
              collection(db, 'teams', teamId, 'comments'),
              orderBy('createdAt', 'desc')
            );
            
            commentsUnsubscribe = onSnapshot(commentsQuery, (snapshot) => {
              const commentsList: TeamComment[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                commentsList.push({
                  id: doc.id,
                  userId: data.userId,
                  username: data.username,
                  text: data.text,
                  createdAt: data.createdAt?.toDate() || new Date(),
                });
              });
              setComments(commentsList);
              setCommentError(null);
            }, (error) => {
              console.error("Error fetching comments:", error);
              setCommentError('Unable to load comments. Please try again later.');
              setComments([]);
            });
          } catch (commentsError) {
            console.error("Error setting up comments listener:", commentsError);
            setCommentError('Unable to load comments. Please try again later.');
            setComments([]);
          }
        }
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
    
    return () => {
      if (commentsUnsubscribe) {
        commentsUnsubscribe();
      }
    };
  }, [teamId]);

  useEffect(() => {
    if (team) {
      setPasswordProtected(team.passwordProtected || false);
      setPassword(team.password || '');
    }
  }, [team]);

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
      if (isUserInAnyRole(user.uid)) {
        setJoinError('You are already in a role in this team');
        return;
      }

      const roleIndex = team.roles.findIndex(r => r.name === roleName);
      if (roleIndex === -1 || team.roles[roleIndex].filled) {
        setJoinError('This role is already filled');
        return;
      }

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

      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;
        setTeam(teamData);

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
      const currentRole = team.roles.find(role => role.userId === user.uid);
      if (!currentRole) {
        setJoinError('You are not currently in any role');
        setIsSwapping(false);
        return;
      }

      const newRoleIndex = team.roles.findIndex(r => r.name === newRoleName);
      if (newRoleIndex === -1) {
        setJoinError('Selected role does not exist');
        setIsSwapping(false);
        return;
      }

      if (team.roles[newRoleIndex].filled) {
        setJoinError('The selected role is already filled');
        setIsSwapping(false);
        return;
      }

      const teamRef = doc(db, 'teams', team.id);
      const updatedRoles = [...team.roles];
      
      const currentRoleIndex = updatedRoles.findIndex(r => r.userId === user.uid);
      updatedRoles[currentRoleIndex] = {
        ...updatedRoles[currentRoleIndex],
        filled: false,
        userId: null
      };
      
      updatedRoles[newRoleIndex] = {
        ...updatedRoles[newRoleIndex],
        filled: true,
        userId: user.uid
      };

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
    
    if (user.uid !== team.creatorId) {
      setDiscordError('Only the team owner can update the Discord link');
      return;
    }

    setDiscordError(null);
    
    try {
      let formattedLink = discordLink.trim();
      if (formattedLink && !formattedLink.startsWith('http')) {
        formattedLink = `https://${formattedLink}`;
      }

      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, {
        discordLink: formattedLink
      });

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

  const handleUpdateDescription = async () => {
    if (!team || !user) return;
    
    if (user.uid !== team.creatorId) {
      setDescriptionError('Only the team owner can update the description');
      return;
    }

    setDescriptionError(null);
    
    try {
      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, {
        description: description.trim()
      });

      const teamDoc = await getDoc(teamRef);
      if (teamDoc.exists()) {
        const teamData = {
          id: teamDoc.id,
          ...teamDoc.data(),
          createdAt: teamDoc.data().createdAt?.toDate()
        } as Team;
        setTeam(teamData);
      }

      setIsEditingDescription(false);
    } catch (err) {
      console.error('Error updating description:', err);
      setDescriptionError('Failed to update description');
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

  const handleUpdateTeamName = async () => {
    if (!team || !isTeamOwner()) return;
    
    if (!teamName.trim()) {
      setTeamNameError('Team name cannot be empty');
      return;
    }

    try {
      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, {
        name: teamName.trim()
      });

      setTeam(prevTeam => {
        if (!prevTeam) return null;
        return { ...prevTeam, name: teamName.trim() };
      });
      
      setTeamNameError(null);
      setIsEditingTeamName(false);
    } catch (err) {
      console.error('Error updating team name:', err);
      setTeamNameError('Failed to update team name');
    }
  };

  const handlePostComment = async () => {
    if (!user || !team || !newComment.trim()) {
      setCommentError('Please enter a comment');
      return;
    }
    
    setSubmittingComment(true);
    setCommentError(null);
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      const username = userData.summonerName || userData.username || 'Unknown';
      
      try {
        await addDoc(collection(db, 'teams', team.id, 'comments'), {
          userId: user.uid,
          username,
          text: newComment.trim(),
          createdAt: serverTimestamp()
        });
        
        setNewComment('');
        setCommentError(null);
      } catch (writeError) {
        console.error('Error writing comment to database:', writeError);
        setCommentError('Unable to post comment. Please try again later.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setCommentError('Failed to post comment. Please check your connection and try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRemoveUser = async (roleIndex: number) => {
    if (!user || !team || !isTeamOwner()) {
      return;
    }

    try {
      const updatedRoles = [...team.roles];
      const userToRemove = updatedRoles[roleIndex].userId;
      
      if (!userToRemove) return;
      
      updatedRoles[roleIndex] = {
        ...updatedRoles[roleIndex],
        filled: false,
        userId: undefined
      };

      const memberToRemove = team.members.find(m => 
        m.userId === userToRemove && m.role === updatedRoles[roleIndex].name
      );

      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, { roles: updatedRoles });
      
      if (memberToRemove) {
        await updateDoc(teamRef, {
          members: arrayRemove(memberToRemove)
        });
      }

      setTeam(prevTeam => {
        if (!prevTeam) return null;
        
        const updatedMembers = prevTeam.members.filter(m => 
          !(m.userId === userToRemove && m.role === updatedRoles[roleIndex].name)
        );
        
        return {
          ...prevTeam,
          roles: updatedRoles,
          members: updatedMembers
        };
      });

    } catch (err) {
      console.error('Error removing user:', err);
      setError('Failed to remove user from team');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !team) return;
    
    try {
      await deleteDoc(doc(db, 'teams', team.id, 'comments', commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setCommentError('Failed to delete comment');
    }
  };

  const handleSelectChampion = async (championId: string) => {
    if (!user || !team || !selectedRole) return;
    
    setUpdatingChampion(true);
    
    try {
      const roleIndex = team.roles.findIndex(role => 
        role.name === selectedRole && role.userId === user.uid
      );
      
      if (roleIndex === -1) {
        console.error('Role not found or not owned by current user');
        return;
      }
      
      const updatedRoles = [...team.roles];
      updatedRoles[roleIndex] = {
        ...updatedRoles[roleIndex],
        preferredChampion: championId
      };
      
      const teamRef = doc(db, 'teams', team.id);
      await updateDoc(teamRef, { roles: updatedRoles });
      
      setTeam(prevTeam => {
        if (!prevTeam) return null;
        return {
          ...prevTeam,
          roles: updatedRoles
        };
      });
      
      setIsSelectingChampion(false);
      setSelectedRole(null);
    } catch (err) {
      console.error('Error updating preferred champion:', err);
      setError('Failed to update champion preference');
    } finally {
      setUpdatingChampion(false);
    }
  };

  const getPreferredChampion = (roleUserId: string | undefined, roleName: string) => {
    if (!team || !roleUserId) return null;
    
    const role = team.roles.find(r => r.name === roleName && r.userId === roleUserId);
    if (!role || !role.preferredChampion) return null;
    
    if (userChampions[roleUserId]) {
      return userChampions[roleUserId].find(champion => champion.id === role.preferredChampion);
    }
    
    return null;
  };

  const hasDiscordAccess = () => {
    if (!user || !team) return false;
    
    if (user.uid === team.creatorId) return true;
    
    return team.discordAccess?.includes(user.uid) || false;
  };

  const hasRequestedDiscord = () => {
    if (!user || !team) return false;
    return team.discordRequests?.includes(user.uid) || false;
  };

  const handleRequestDiscordAccess = async () => {
    if (!user || !team) return;
    
    setRequestingDiscord(true);
    setDiscordRequestSuccess(false);
    setDiscordError(null);
    
    try {
      const teamRef = doc(db, 'teams', team.id);
      
      await updateDoc(teamRef, {
        discordRequests: arrayUnion(user.uid)
      });
      
      setTeam(prevTeam => {
        if (!prevTeam) return null;
        
        const updatedRequests = [...(prevTeam.discordRequests || [])];
        if (!updatedRequests.includes(user.uid)) {
          updatedRequests.push(user.uid);
        }
        
        return {
          ...prevTeam,
          discordRequests: updatedRequests
        };
      });
      
      setDiscordRequestSuccess(true);
    } catch (err) {
      console.error('Error requesting Discord access:', err);
      setDiscordError('Failed to request Discord access. Please try again.');
    } finally {
      setRequestingDiscord(false);
    }
  };

  const handleApproveDiscordAccess = async (userId: string) => {
    if (!user || !team || !isTeamOwner()) return;
    
    try {
      const teamRef = doc(db, 'teams', team.id);
      
      await updateDoc(teamRef, {
        discordAccess: arrayUnion(userId),
        discordRequests: arrayRemove(userId)
      });
      
      setTeam(prevTeam => {
        if (!prevTeam) return null;
        
        const updatedAccess = [...(prevTeam.discordAccess || [])];
        if (!updatedAccess.includes(userId)) {
          updatedAccess.push(userId);
        }
        
        const updatedRequests = (prevTeam.discordRequests || []).filter(id => id !== userId);
        
        return {
          ...prevTeam,
          discordAccess: updatedAccess,
          discordRequests: updatedRequests
        };
      });
      
      setPendingDiscordRequests(prev => prev.filter(id => id !== userId));
      
    } catch (err) {
      console.error('Error approving Discord access:', err);
      setDiscordError('Failed to approve Discord access. Please try again.');
    }
  };

  const handleDenyDiscordAccess = async (userId: string) => {
    if (!user || !team || !isTeamOwner()) return;
    
    try {
      const teamRef = doc(db, 'teams', team.id);
      
      await updateDoc(teamRef, {
        discordRequests: arrayRemove(userId)
      });
      
      setTeam(prevTeam => {
        if (!prevTeam) return null;
        
        const updatedRequests = (prevTeam.discordRequests || []).filter(id => id !== userId);
        
        return {
          ...prevTeam,
          discordRequests: updatedRequests
        };
      });
      
      setPendingDiscordRequests(prev => prev.filter(id => id !== userId));
      
    } catch (err) {
      console.error('Error denying Discord access:', err);
      setDiscordError('Failed to deny Discord access. Please try again.');
    }
  };

  const handleUpdatePassword = async () => {
    if (!teamId || !isTeamOwner()) return;
    
    try {
      setPasswordError(null);
      
      if (passwordProtected && !password.trim()) {
        setPasswordError("Password cannot be empty when protection is enabled");
        return;
      }
      
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        passwordProtected,
        password: passwordProtected ? password : null,
      });
      
      setIsEditingPassword(false);
      setTeam(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          passwordProtected,
          password: passwordProtected ? password : null,
        };
      });
      
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Failed to update password settings');
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
        {isEditingTeamName && isTeamOwner() ? (
          <div className="edit-team-name">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="team-name-input"
              placeholder="Enter team name"
              autoFocus
            />
            {teamNameError && <div className="error-message">{teamNameError}</div>}
            <div className="edit-actions">
              <button className="save-button" onClick={handleUpdateTeamName}>
                Save
              </button>
              <button 
                className="cancel-button" 
                onClick={() => {
                  setIsEditingTeamName(false);
                  setTeamName(team.name);
                  setTeamNameError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="team-name-container">
            <h2>{team.name}</h2>
            {isTeamOwner() && (
              <button 
                className="edit-name-button"
                onClick={() => setIsEditingTeamName(true)}
                title="Edit team name"
              >
                ✏️
              </button>
            )}
          </div>
        )}
        
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

      <div className="description-section">
        <h3>Team Description</h3>
        {isEditingDescription ? (
          <div className="description-edit">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your team, goals, schedule, etc."
              className="description-textarea"
              rows={4}
            />
            {descriptionError && <div className="description-error">{descriptionError}</div>}
            <div className="description-actions">
              <button 
                onClick={handleUpdateDescription} 
                className="save-description-button"
              >
                Save Description
              </button>
              <button 
                onClick={() => {
                  setIsEditingDescription(false);
                  setDescription(team.description || '');
                  setDescriptionError(null);
                }} 
                className="cancel-description-button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="description-display">
            {team.description ? (
              <>
                <p className="team-description">{team.description}</p>
                {isTeamOwner() && (
                  <button 
                    onClick={() => setIsEditingDescription(true)} 
                    className="edit-description-button"
                  >
                    Edit Description
                  </button>
                )}
              </>
            ) : (
              isTeamOwner() ? (
                <button 
                  onClick={() => setIsEditingDescription(true)} 
                  className="add-description-button"
                >
                  Add Team Description
                </button>
              ) : (
                <div className="no-description">No team description provided</div>
              )
            )}
          </div>
        )}
      </div>

      <div className="discord-section">
        <h3>Discord Server</h3>
        {isEditingDiscord ? (
          <div className="discord-edit">
            <input
              type="text"
              value={discordLink}
              onChange={(e) => setDiscordLink(e.target.value)}
              placeholder="Enter Discord link"
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
              hasDiscordAccess() ? (
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
              ) : hasRequestedDiscord() ? (
                <div className="discord-pending">
                  <span className="pending-icon">⏳</span>
                  <span>Access request pending approval</span>
                </div>
              ) : (
                <div className="discord-request">
                  <p>Discord server access is restricted. Request to join:</p>
                  <button 
                    onClick={handleRequestDiscordAccess}
                    disabled={requestingDiscord}
                    className="request-discord-button"
                  >
                    {requestingDiscord ? 'Requesting...' : 'Request Access'}
                  </button>
                  {discordRequestSuccess && (
                    <div className="discord-success">
                      Request sent! Wait for approval from team owner.
                    </div>
                  )}
                  {discordError && <div className="discord-error">{discordError}</div>}
                </div>
              )
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
            
            {isTeamOwner() && pendingDiscordRequests.length > 0 && (
              <div className="discord-requests">
                <h4>Pending Access Requests</h4>
                <div className="requests-list">
                  {pendingDiscordRequests.map(userId => (
                    <div key={userId} className="request-item">
                      <span className="request-user">
                        {roleUsers[userId]?.username || 'Unknown User'}
                      </span>
                      <div className="request-actions">
                        <button 
                          onClick={() => handleApproveDiscordAccess(userId)}
                          className="approve-button"
                          title="Approve request"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => handleDenyDiscordAccess(userId)}
                          className="deny-button"
                          title="Deny request"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isTeamOwner() && (
        <div className="team-password-container">
          <div className="section-header">
            <h3>Password Protection</h3>
            <button
              onClick={() => setIsEditingPassword(!isEditingPassword)} 
              className="edit-button"
            >
              {isEditingPassword ? 'Cancel' : 'Edit'}
            </button>
          </div>
          
          {isEditingPassword ? (
            <div className="password-edit">
              <div className="password-protection-toggle">
                <input
                  type="checkbox"
                  id="passwordProtected"
                  checked={passwordProtected}
                  onChange={() => setPasswordProtected(!passwordProtected)}
                />
                <label htmlFor="passwordProtected">Password protect this team</label>
              </div>
              
              {passwordProtected && (
                <div className="password-input-section">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="password-input"
                    minLength={4}
                  />
                  <div className="password-hint">
                    Players will need this password to join your team
                  </div>
                </div>
              )}
              
              {passwordError && <div className="password-error">{passwordError}</div>}
              
              <div className="password-actions">
                <button 
                  onClick={handleUpdatePassword} 
                  className="save-password-button"
                >
                  Save Password Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="password-status">
              {team.passwordProtected ? (
                <span className="protected">🔒 This team is password protected</span>
              ) : (
                <span className="open">🔓 This team is open to join</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="roles-grid">
        {team.roles.map((role) => {
          const isUserRole = role.userId === user?.uid;
          const isFilled = role.filled;
          const preferredChampion = getPreferredChampion(role.userId, role.name);
          
          return (
            <div 
              key={role.name} 
              className={`role-card ${role.name.toLowerCase()} ${isUserRole ? 'user-role' : ''} ${isFilled ? 'filled-role' : 'empty-role'}`}
            >
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
                  {isTeamOwner() && role.userId !== user?.uid && (
                    <button 
                      onClick={() => handleRemoveUser(team.roles.findIndex(r => r.name === role.name))}
                      className="remove-user-button"
                      title="Remove user from role"
                    >
                      Remove
                    </button>
                  )}
                  
                  {preferredChampion && (
                    <div className="preferred-champion">
                      <h4>Selected Champion:</h4>
                      <div 
                        className={`preferred-champion-display ${role.userId === user?.uid ? 'clickable' : ''}`}
                        onClick={() => {
                          if (role.userId === user?.uid) {
                            setSelectedRole(role.name);
                            setIsSelectingChampion(true);
                          }
                        }}
                        title={role.userId === user?.uid ? "Click to change champion" : ""}
                      >
                        <img 
                          src={preferredChampion.imageUrl} 
                          alt={preferredChampion.name} 
                          className="preferred-champion-image"
                        />
                        <span className="preferred-champion-name">{preferredChampion.name}</span>
                        {role.userId === user?.uid && (
                          <span className="change-indicator">✏️</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {role.userId === user?.uid && !preferredChampion && (
                    <button 
                      onClick={() => {
                        setSelectedRole(role.name);
                        setIsSelectingChampion(true);
                      }}
                      className="select-champion-button"
                    >
                      Select Champion
                    </button>
                  )}
                  
                  {/* {role.userId && userChampions[role.userId]?.length > 0 && (
                    <div className="player-champions">
                      <h4>Champion Pool:</h4>
                      <div className="champion-icons">
                        {userChampions[role.userId].slice(0, 5).map(champion => (
                          <div 
                            key={champion.id} 
                            className={`champion-icon ${role.preferredChampion === champion.id ? 'selected' : ''}`} 
                            title={champion.name}
                          >
                            <img 
                              src={champion.imageUrl} 
                              alt={champion.name} 
                              className="champion-avatar"
                            />
                          </div>
                        ))}
                        {userChampions[role.userId].length > 5 && (
                          <div className="more-champions">
                            +{userChampions[role.userId].length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )} */}
                </div>
              ) : (
                <div className="role-open">
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
          );
        })}
      </div>

      <div className="comments-section">
        <h3>Team Discussion</h3>
        
        {user ? (
          <div className="comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="comment-input"
            />
            {commentError && <div className="comment-error">{commentError}</div>}
            <button 
              onClick={handlePostComment}
              disabled={submittingComment || !newComment.trim()}
              className="post-comment-button"
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        ) : (
          <div className="login-to-comment">
            Please log in to join the discussion.
          </div>
        )}
        
        <div className="comments-list">
          {commentError && comments.length === 0 ? (
            <div className="comments-error">
              {commentError}
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.username}</span>
                  <div className="comment-actions">
                    <span className="comment-time">
                      {comment.createdAt.toLocaleString()}
                    </span>
                    {(comment.userId === user?.uid || isTeamOwner()) && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="delete-comment-button"
                        title="Delete comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            ))
          ) : (
            <div className="no-comments">
              No comments yet. Be the first to start a discussion!
            </div>
          )}
        </div>
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

      {isSelectingChampion && user && selectedRole && (
        <div className="modal-overlay">
          <div className="champion-selection-modal">
            <div className="modal-header">
              <h3>Select a Champion for {selectedRole}</h3>
              <button 
                className="close-modal-button"
                onClick={() => {
                  setIsSelectingChampion(false);
                  setSelectedRole(null);
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="champions-grid">
              {user && userChampions[user.uid]?.length > 0 ? (
                userChampions[user.uid].map(champion => (
                  <div 
                    key={champion.id}
                    className="champion-selection-item"
                    onClick={() => handleSelectChampion(champion.id)}
                  >
                    <img 
                      src={champion.imageUrl} 
                      alt={champion.name} 
                      className="champion-selection-image"
                    />
                    <span className="champion-selection-name">{champion.name}</span>
                  </div>
                ))
              ) : (
                <div className="no-champions-message">
                  <p>You haven't added any champions to your pool yet.</p>
                  <button 
                    className="go-to-profile-button"
                    onClick={() => navigate('/teams/profile')}
                  >
                    Go to Profile to Add Champions
                  </button>
                </div>
              )}
            </div>
            
            {updatingChampion && (
              <div className="updating-message">Updating your champion...</div>
            )}
            
            <div className="modal-footer">
              <div className="profile-link">
                <span>Want to add more champions to your pool?</span>
                <button 
                  className="go-to-profile-link"
                  onClick={() => navigate('/teams/profile')}
                >
                  Edit your champion pool
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}