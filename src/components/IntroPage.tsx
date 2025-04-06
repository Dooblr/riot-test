import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import './IntroPage.scss';

const IntroPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user has seen the intro page before
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      
      // If user has seen the intro before, redirect based on login status
      if (hasSeenIntro === 'true') {
        if (user) {
          navigate('/teams');
        } else {
          navigate('/teams/login');
        }
        return;
      }
      
      // Otherwise, show the intro page to everyone
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleContinue = () => {
    // Mark that the user has seen the intro
    localStorage.setItem('hasSeenIntro', 'true');
    
    // Navigate based on login status
    if (isLoggedIn) {
      navigate('/teams');
    } else {
      navigate('/teams/login');
    }
  };

  const handleSkip = () => {
    // Mark that the user has seen the intro
    localStorage.setItem('hasSeenIntro', 'true');
    
    // Navigate based on login status
    if (isLoggedIn) {
      navigate('/teams');
    } else {
      navigate('/teams');
    }
  };

  if (loading) {
    return <div className="intro-loading">Loading...</div>;
  }

  return (
    <div className="intro-page">
      <div className="intro-content">
        <h1>Welcome</h1>
        
        <div className="intro-description">
          <p>
            Create your perfect roster or join existing teams.
          </p>
          
          <div className="intro-features">
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <h3>Create Teams</h3>
              <p>Build your own team with specific roles and requirements</p>
            </div>
            
            <div className="feature">
              <span className="feature-icon">👥</span>
              <h3>Find Players</h3>
              <p>Connect with players for each role based on champion pools</p>
            </div>
            
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <h3>Manage Rosters</h3>
              <p>Easily manage team composition and coordinate with members</p>
            </div>
          </div>
        </div>
        
        <div className="intro-actions">
          <button 
            onClick={handleContinue}
            className="continue-button"
          >
            Continue
          </button>
          
          {/* <button 
            onClick={handleSkip}
            className="skip-button"
          >
            Skip
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default IntroPage; 