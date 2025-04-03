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
import './App.scss'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Function to fetch user profile - can be called from components to refresh
  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for:', userId)
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const profileData = userDoc.data()
        console.log('User profile found:', profileData)
        setUserProfile(profileData)
        return profileData
      } else {
        console.log('No user profile found')
        setUserProfile(null)
        return null
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setUserProfile(null)
      return null
    }
  }

  useEffect(() => {
    console.log('Setting up auth state listener')
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid)
      setUser(user)
      
      if (user) {
        // Check if user has a profile with summoner name
        await fetchUserProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Debug output
  useEffect(() => {
    console.log('Current auth state:', { 
      user: user?.uid, 
      hasProfile: !!userProfile,
      summonerName: userProfile?.summonerName 
    })
  }, [user, userProfile])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    if (!user) {
      console.log('RequireAuth: No user, redirecting to login')
      return <Navigate to="/teams/login" />
    }
    
    // Check if user has a summoner name
    if (!userProfile?.summonerName) {
      console.log('RequireAuth: No summonerName, redirecting to verification')
      return <Navigate to="/summoner-verification" />
    }
    
    console.log('RequireAuth: User authenticated with summoner name')
    return children
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
            <Route path="/" element={<HomePage />} />
            <Route path="/server-status" element={<ServerStatusPage />} />
            <Route path="/player-stats" element={<UserStats />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Navigate to="/teams" />
                </RequireAuth>
              }
            />
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
          </Routes>
        </main>
        <footer className="app-footer">
          <p>
            This app is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially 
            involved in producing or managing League of Legends.
          </p>
        </footer>
      </div>
    </Router>
  )
}

export default App
