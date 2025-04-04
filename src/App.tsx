import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import './App.scss'

function App() {
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

  return (
    <Router>
      <div className="app">
        <Navigation />
        {/* <header className="app-header">
          <h1>League of Legends</h1>
          <p>Game Information & Server Status</p>
        </header> */}
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/teams" />} />
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
        <footer className="app-footer">
          <p>
            This app is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially 
            involved in producing or managing League of Legends.
          </p>
          <button onClick={openBugReportModal} className="bug-report-button">
            Report a Bug
          </button>
          {isAdmin && (
            <a href="/admin/bugs" className="admin-link">
              Admin: View Bug Reports
            </a>
          )}
        </footer>
        
        {/* Bug Report Modal */}
        <BugReportModal 
          isOpen={isBugReportModalOpen} 
          onClose={closeBugReportModal} 
        />
      </div>
    </Router>
  )
}

export default App
