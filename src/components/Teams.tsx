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
  columnHelper.accessor("discordLink", {
    header: "Discord",
    cell: (info) => {
      const link = info.getValue();
      if (!link) return "Not set";
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
          onClick={(e) => e.stopPropagation()}
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
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300 } },
    hover: { scale: 1.05, transition: { type: "spring", stiffness: 400 } },
    tap: { scale: 0.95 },
    exit: { scale: 0.9, opacity: 0 }
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
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserTeams(userDoc.data().teams || []);
        }

        const teamsQuery = query(collection(db, "teams"));
        const teamsSnapshot = await getDocs(teamsQuery);

        // Create properly typed teams array
        const teamsData: Team[] = [];

        teamsSnapshot.docs.forEach((doc) => {
          const data = doc.data();

          // Convert any Firestore timestamps to JavaScript Date objects
          const members = data.members || [];
          const processedMembers = members.map((member: any) => ({
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt?.toDate
              ? member.joinedAt.toDate()
              : new Date(member.joinedAt),
          }));

          teamsData.push({
            id: doc.id,
            name: data.name,
            creatorId: data.creatorId,
            summonerName: data.summonerName,
            roles: data.roles || [],
            members: processedMembers,
            discordLink: data.discordLink,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
          });
        });

        setTeams(teamsData);

        const userIds = new Set<string>();
        teamsData.forEach((team) => {
          team.roles.forEach((role) => {
            if (role.userId) userIds.add(role.userId);
          });
        });

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

  return (
    <div className="teams">
      <div className="teams-header">
        <div className="header-left">
          <h1>Teams</h1>
          {user && (
            <motion.button
              onClick={handleEditProfile}
              className="profile-button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="profile-icon">
                {profile?.summonerName?.charAt(0).toUpperCase() || 'P'}
              </span>
            </motion.button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className={`mobile-menu-toggle ${mobileMenuOpen ? "active" : ""}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-icon"></span>
        </button>

        <button onClick={handleCreateTeam} className="create-team-button">
          Create Team
        </button>
      </div>

      <div className={`teams-filters ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {mobileMenuOpen && (
          <div className="mobile-buttons">
            <button onClick={handleCreateTeam} className="create-team-button">
              Create Team
            </button>
          </div>
        )}
        
        <div className="filters-row">
          {user && (
            <div className="role-filter-container">
              <span className="role-filter-label">Filter by needed roles:</span>
              <motion.div 
                className="role-filter-buttons"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence>
                  {availableRoles.map(role => (
                    <motion.button
                      key={role}
                      onClick={() => handleRoleFilter(role)}
                      className={`role-filter-button ${
                        roleFilter.includes(role) ? "active" : ""
                      }`}
                      variants={roleButtonVariants}
                      initial="initial"
                      animate="animate"
                      whileHover="hover"
                      whileTap="tap"
                      exit="exit"
                    >
                      {role}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          <div className="search-container">
            <motion.input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search teams..."
              className="search-input"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
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
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
