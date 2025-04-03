import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  query,
  getDocs,
  updateDoc,
  arrayUnion,
  where
} from 'firebase/firestore';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  FilterFn,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { auth, db } from '../firebase';
import CreateTeam from './CreateTeam';
import './Teams.scss';

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
  discordLink?: string;
  createdAt: Date;
}

interface UserProfile {
  username: string;
  userId: string;
  teams: string[];
  discordLink?: string;
  summonerName?: string;
  email?: string;
}

interface RoleUser {
  userId: string;
  username: string;
}

interface UserTeam {
  teamId: string;
  role: string;
  joinedAt: Date;
}

const columnHelper = createColumnHelper<Team>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Team Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('summonerName', {
    header: 'Creator',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('roles', {
    header: 'Open Roles',
    cell: info => {
      const roles = info.getValue();
      const openRoles = roles.filter(role => !role.filled).length;
      return `${openRoles}/${roles.length}`;
    },
  }),
  columnHelper.accessor('members', {
    header: 'Members',
    cell: info => {
      const team = info.row.original;
      const memberIds = new Set(team.members.map(member => member.userId));
      
      // Don't double-count the creator if they're also in a role
      return memberIds.size;
    },
  }),
  columnHelper.accessor('discordLink', {
    header: 'Discord',
    cell: info => {
      const link = info.getValue();
      if (!link) return 'Not set';
      return (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="discord-link"
          onClick={e => e.stopPropagation()}
        >
          Join Discord
        </a>
      );
    },
  }),
];

export default function Teams() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleUsers, setRoleUsers] = useState<Record<string, RoleUser>>({});
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showMyTeamsOnly, setShowMyTeamsOnly] = useState(false);
  const navigate = useNavigate();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setProfile(null);
        } else {
          setProfile(userDoc.data() as UserProfile);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserTeams(userDoc.data().teams || []);
        }

        const teamsQuery = query(collection(db, 'teams'));
        const teamsSnapshot = await getDocs(teamsQuery);
        
        // Create properly typed teams array
        const teamsData: Team[] = [];
        
        teamsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Convert any Firestore timestamps to JavaScript Date objects
          const members = data.members || [];
          const processedMembers = members.map((member: any) => ({
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt?.toDate ? member.joinedAt.toDate() : new Date(member.joinedAt)
          }));
          
          teamsData.push({
            id: doc.id,
            name: data.name,
            creatorId: data.creatorId,
            summonerName: data.summonerName,
            roles: data.roles || [],
            members: processedMembers,
            discordLink: data.discordLink,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          });
        });

        setTeams(teamsData);

        const userIds = new Set<string>();
        teamsData.forEach(team => {
          team.roles.forEach(role => {
            if (role.userId) userIds.add(role.userId);
          });
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
        console.error('Error fetching teams:', err);
        setError('Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user]);

  // Filter teams based on user involvement if "My Teams" is toggled
  const filteredTeams = showMyTeamsOnly && user
    ? teams.filter(team => {
        // Check if user is a creator
        if (team.creatorId === user.uid) return true;
        
        // Check if user is a member in a role
        const hasRole = team.roles && team.roles.some(role => role.userId === user.uid);
        
        return hasRole;
      })
    : teams;

  const table = useReactTable({
    data: filteredTeams,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleCreateTeam = () => {
    setShowCreateTeam(true);
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  const handleEditProfile = () => {
    navigate('/teams/profile');
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

  const toggleMyTeams = () => {
    setShowMyTeamsOnly(prev => !prev);
  };

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (showCreateTeam) {
    return <CreateTeam />;
  }

  return (
    <div className="teams">
      <div className="teams-header">
        <h1>Teams</h1>
        <div className="header-actions">
          {user && (
            <>
              <button 
                onClick={toggleMyTeams} 
                className={`my-teams-button ${showMyTeamsOnly ? 'active' : ''}`}
              >
                {showMyTeamsOnly ? 'All Teams' : 'My Teams'}
              </button>
              <button onClick={handleEditProfile} className="edit-profile-button">
                Edit Profile
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </>
          )}
          <input
            type="text"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder="Search teams..."
            className="search-input"
          />
          <button onClick={handleCreateTeam} className="create-team-button">
            Create Team
          </button>
        </div>
      </div>

      <div className="teams-table-container">
        {showMyTeamsOnly && filteredTeams.length === 0 ? (
          <div className="no-teams-message">
            You are not a member of any teams yet. Join a team or create your own!
          </div>
        ) : (
          <table className="teams-table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => handleTeamClick(row.original.id)}
                  className="team-row"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 