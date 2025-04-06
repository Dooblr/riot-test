import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import Navigation from './components/Navigation'
import HomePage from './components/HomePage'
import ServerStatusPage from './pages/ServerStatusPage'
import UserStats from './components/UserStats'
import Teams from './components/Teams'
import TeamDetails from './components/TeamDetails'
import TeamsLogin from './components/TeamsLogin'
import Profile from './components/Profile'
import CreateTeam from './components/CreateTeam'
import SummonerVerification from './components/SummonerVerification'
import BugReportModal from './components/BugReportModal'
import BugReportList from './components/BugReportList'
import IntroPage from './components/IntroPage'
import { ApiStatusProvider } from './services/ApiStatusContext'
import './App.scss'

// Layout component to conditionally render navigation
const AppLayout = () => {
  const location = useLocation();
  const isIntroPage = location.pathname === '/';
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Function to fetch user profile - can be called from components to refresh
  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for:', userId)
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const profileData = userDoc.data()
        console.log('User profile found:', profileData)
        setUserProfile(profileData)
        
        // Check if user is an admin
        setIsAdmin(profileData.isAdmin === true)
        
        return profileData
      } else {
        console.log('No user profile found')
        setUserProfile(null)
        setIsAdmin(false)
        return null
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setUserProfile(null)
      setIsAdmin(false)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser)
      if (authUser) {
        await fetchUserProfile(authUser.uid)
      } else {
        setUserProfile(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Higher-order component for protected routes
  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    if (loading) {
      return <div className="loading-auth">Loading...</div>
    }

    // If user is not logged in, redirect to login
    if (!user) {
      return <Navigate to="/teams/login" />
    }

    return children
  }
  
  // Higher-order component for admin-only routes
  const RequireAdmin = ({ children }: { children: JSX.Element }) => {
    if (loading) {
      return <div className="loading-auth">Loading...</div>
    }

    // If user is not logged in or not an admin, redirect
    if (!user || !isAdmin) {
      return <Navigate to="/teams" />
    }

    return children
  }

  const openBugReportModal = () => {
    setIsBugReportModalOpen(true)
  }

  const closeBugReportModal = () => {
    setIsBugReportModalOpen(false)
  }
  
  const resetIntroPage = () => {
    localStorage.removeItem('hasSeenIntro');
    window.location.href = '/'; // Hard redirect to ensure a fresh load
  }

  return (
    <div className="app">
      {/* Only show navigation if not on intro page */}
      {!isIntroPage && <Navigation />}
      
      <main>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/rotation" element={<HomePage />} />
          <Route path="/server-status" element={<ServerStatusPage />} />
          <Route path="/player-stats" element={<UserStats />} />
          <Route path="/teams/login" element={<TeamsLogin />} />
          <Route path="/summoner-verification" element={<SummonerVerification />} />
          <Route
            path="/teams"
            element={
              <RequireAuth>
                <Teams />
              </RequireAuth>
            }
          />
          <Route
            path="/teams/create"
            element={
              <RequireAuth>
                <CreateTeam />
              </RequireAuth>
            }
          />
          <Route
            path="/teams/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <RequireAuth>
                <TeamDetails />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/bugs"
            element={
              <RequireAdmin>
                <BugReportList />
              </RequireAdmin>
            }
          />
        </Routes>
      </main>
      
      {!isIntroPage && (
        <footer className="app-footer">
          <p>
            This app is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially 
            involved in producing or managing League of Legends.
          </p>
          <div className="footer-buttons">
            <button onClick={openBugReportModal} className="bug-report-button">
              Report a Bug
            </button>
            <button onClick={resetIntroPage} className="view-intro-button">
              View Intro Page
            </button>
            {isAdmin && (
              <a href="/admin/bugs" className="admin-link">
                Admin: View Bug Reports
              </a>
            )}
          </div>
        </footer>
      )}
      
      {/* Bug Report Modal */}
      <BugReportModal 
        isOpen={isBugReportModalOpen} 
        onClose={closeBugReportModal} 
      />
    </div>
  );
};

function App() {
  return (
    <ApiStatusProvider>
      <Router>
        <AppLayout />
      </Router>
    </ApiStatusProvider>
  );
}

export default App
