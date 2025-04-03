import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './components/HomePage'
import ServerStatusPage from './components/ServerStatusPage'
import UserStats from './components/UserStats'
import './App.scss'

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <header className="app-header">
          <h1>League of Legends</h1>
          <p>Game Information & Server Status</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pnw-server" element={<ServerStatusPage />} />
            <Route path="/user-stats" element={<UserStats />} />
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
