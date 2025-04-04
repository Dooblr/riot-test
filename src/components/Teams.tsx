import {
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import CreateTeam from "./CreateTeam";
import { motion, AnimatePresence } from "framer-motion";
import "./Teams.scss";

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
  passwordProtected?: boolean;
  password?: string;
  discordAccess?: string[];
  discordRequests?: string[];
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
  columnHelper.accessor("name", {
    header: "Team Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("summonerName", {
    header: "Creator",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("roles", {
    header: "Open Roles",
    cell: (info) => {
      const roles = info.getValue();
      const openRoles = roles.filter((role) => !role.filled).length;
      return `${openRoles}/${roles.length}`;
    },
  }),
  columnHelper.accessor("members", {
    header: "Members",
    cell: (info) => {
      const team = info.row.original;
      const memberIds = new Set(team.members.map((member) => member.userId));

      // Don't double-count the creator if they're also in a role
      return memberIds.size;
    },
  }),
  columnHelper.accessor("passwordProtected", {
    header: "Protected",
    cell: (info) => {
      const isProtected = info.getValue();
      return (
        <span className={`protection-status ${isProtected ? 'protected' : 'open'}`}>
          {isProtected ? '🔒 Password' : '🔓 Open'}
        </span>
      );
    },
  }),
];

const roleIcons: Record<string, string> = {
  'Top': '🛡️',
  'Jungle': '🌲',
  'Mid': '✨',
  'ADC': '🏹',
  'Support': '💖',
};

// Helper function to format date
const formatDate = (date: Date): string => {
  if (!date) return "Unknown date";
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

export default function Teams() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleUsers, setRoleUsers] = useState<Record<string, RoleUser>>({});
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Available roles for filtering
  const availableRoles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

  // Role filter animation variants
  const roleButtonVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    hover: { boxShadow: "0 0 8px rgba(208, 168, 92, 0.5)" },
    tap: { boxShadow: "0 0 4px rgba(208, 168, 92, 0.3)" },
    exit: { opacity: 0 }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
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
      try {
        const teamsQuery = query(collection(db, "teams"));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData: Team[] = [];
        const userIds = new Set<string>();

        teamsSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Collect all unique user IDs for fetching profiles
          userIds.add(data.creatorId);
          
          if (data.roles) {
            data.roles.forEach((role: any) => {
              if (role.userId) userIds.add(role.userId);
            });
          }
          
          if (data.members) {
            data.members.forEach((member: any) => {
              userIds.add(member.userId);
            });
          }

          // Convert Firestore timestamps to Date objects
          const createdAt = data.createdAt?.toDate?.() || new Date();
          
          // Process member timestamps if they exist
          const members = data.members ? data.members.map((member: any) => ({
            ...member,
            joinedAt: member.joinedAt?.toDate?.() || new Date()
          })) : [];

          teamsData.push({
            id: doc.id,
            name: data.name,
            creatorId: data.creatorId,
            summonerName: data.summonerName,
            roles: data.roles || [],
            members: members,
            discordLink: data.discordLink,
            createdAt,
            passwordProtected: data.passwordProtected,
            password: data.password,
            discordAccess: data.discordAccess || [],
            discordRequests: data.discordRequests || []
          });
        });

        if (user && profile) {
          // Filter user's teams
          const userTeamsData = profile.teams || [];
          const typedUserTeams: UserTeam[] = Array.isArray(userTeamsData) ? 
            userTeamsData.map((team: any) => ({
              teamId: team.teamId || team,
              role: team.role || 'Member',
              joinedAt: team.joinedAt ? team.joinedAt : new Date()
            })) : [];
          setUserTeams(typedUserTeams);
        }

        setTeams(teamsData);

        // Fetch user profiles for role assignments
        const userProfiles: Record<string, RoleUser> = {};
        
        for (const userId of userIds) {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfiles[userId] = {
              userId,
              username: userData.summonerName || "Unknown",
            };
          }
        }
        setRoleUsers(userProfiles);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load teams");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user]);

  // Memoize the filtered teams to prevent unnecessary re-calculations
  const filteredTeams = useMemo(() => {
    if (roleFilter.length === 0) return teams;
    
    try {
      return teams.filter((team) => {
        // Check if team and roles are valid
        if (!team || !team.roles || !Array.isArray(team.roles)) return false;
        
        // Find teams that have ALL of the selected roles unfilled
        return roleFilter.every(selectedRole => {
          // Look for this role in the team's roles
          return team.roles.some(teamRole => 
            teamRole.name === selectedRole && !teamRole.filled
          );
        });
      });
    } catch (err) {
      console.error("Error filtering teams:", err);
      return teams; // Return all teams if there's an error
    }
  }, [teams, roleFilter]);

  // Memoize the table instance
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

  const handleCreateTeam = useCallback(() => {
    setShowCreateTeam(true);
    setMobileMenuOpen(false);
  }, []);

  const handleTeamClick = useCallback((teamId: string) => {
    navigate(`/teams/${teamId}`);
  }, [navigate]);

  const handleEditProfile = useCallback(() => {
    navigate("/teams/profile");
    setMobileMenuOpen(false);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/teams/login");
    } catch (err) {
      console.error("Error signing out:", err);
      setError("Failed to log out");
    }
  }, [navigate]);

  const handleRoleFilter = useCallback((role: string) => {
    setRoleFilter(current => {
      if (current.includes(role)) {
        return current.filter(r => r !== role);
      } else {
        return [...current, role];
      }
    });
    setMobileMenuOpen(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    setRoleFilter([]);
    setGlobalFilter("");
    setMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  // Check if any filter is active
  const isFilterActive = roleFilter.length > 0 || globalFilter !== "";

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (showCreateTeam) {
    return <CreateTeam />;
  }

  if (!user) {
    return (
      <div className="teams">
        <div className="teams-login-container">
          <h1>Teams</h1>
          <p>You need to be logged in to view teams.</p>
          <button
            onClick={() => navigate('/teams/login')}
            className="login-button"
          >
            Login / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teams">
      <div className="teams-header">
        <div className="header-left">
          <h1>Teams</h1>
          {/* <button onClick={handleEditProfile} className="profile-button">
            <span className="profile-icon">{profile?.summonerName?.[0].toUpperCase() || 'U'}</span>
          </button> */}
        </div>
        <div className="header-right">
          <button onClick={handleCreateTeam} className="create-team-button">
            Create Team
          </button>
          <button onClick={toggleMobileMenu} className="mobile-menu-toggle">
            <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      <div className={`teams-filters ${mobileMenuOpen ? 'mobile-visible' : ''}`}>
        <div className="search-container">
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search teams..."
            className="search-input"
          />
        </div>
        
        <div className="role-filters">
          <div className="role-filter-label">Filter by open roles:</div>
          <motion.div 
            className="role-filter-buttons"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {availableRoles.map((role) => (
              <motion.button
                key={role}
                onClick={() => handleRoleFilter(role)}
                className={`role-filter-button ${roleFilter.includes(role) ? 'active' : ''}`}
                variants={roleButtonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <span className="role-icon">{roleIcons[role] || '👤'}</span> 
                {role}
              </motion.button>
            ))}
          </motion.div>
        </div>
        
        {isFilterActive && (
          <button onClick={clearAllFilters} className="clear-filters-button">
            Clear All Filters
          </button>
        )}
      </div>

      <motion.div 
        className="teams-table-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AnimatePresence mode="wait">
          {roleFilter.length > 0 && filteredTeams.length === 0 ? (
            <motion.div 
              className="no-teams-message"
              key="no-teams"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No teams are looking for {roleFilter.length === 1 ? 'a' : ''} {roleFilter.join(', ')} {roleFilter.length === 1 ? 'player' : 'players'} at the moment.
            </motion.div>
          ) : (
            <>
              {/* Desktop Table View */}
              <motion.table 
                className="teams-table"
                key="teams-table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
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
                  {table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      onClick={() => handleTeamClick(row.original.id)}
                      className="team-row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ backgroundColor: "rgba(197, 172, 87, 0.2)" }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        // Get column header for data-label attribute
                        const header = cell.column.columnDef.header as string;
                        const isDateColumn = cell.column.id === "createdAt";
                        
                        return (
                          <td 
                            key={cell.id} 
                            data-label={header}
                            className={`${isDateColumn ? 'hide-mobile' : ''}`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </motion.table>

              {/* Mobile Card View */}
              <div className="teams-mobile-cards">
                <AnimatePresence>
                  {filteredTeams.map((team) => (
                    <motion.div 
                      key={team.id}
                      className="team-card"
                      onClick={() => handleTeamClick(team.id)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="team-card-header">
                        <div className="team-name">{team.name}</div>
                        <div className="team-date">{formatDate(team.createdAt)}</div>
                      </div>
                      <div className="team-creator">Created by: {team.summonerName}</div>
                      <div className="team-password-status">
                        {team.passwordProtected ? 
                          <span className="protected">🔒 Password Protected</span> : 
                          <span className="open">🔓 Open to Join</span>
                        }
                      </div>
                      <div className="team-roles">
                        {team.roles.map((role, index) => (
                          <div 
                            key={index} 
                            className={`team-role ${role.filled ? 'filled' : ''}`}
                          >
                            {role.name} {role.filled ? '✓' : ''}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
