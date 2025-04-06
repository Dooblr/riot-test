import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useApiStatus } from "../services/ApiStatusContext";
import "./Navigation.scss";

function Navigation() {
  const [userInitial, setUserInitial] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const { isRotationApiAvailable } = useApiStatus();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsLoggedIn(true);
        // Get user's summoner name initial for the profile icon
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const initial = userData.summonerName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
            setUserInitial(initial);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUserInitial('U');
        }
      } else {
        setIsLoggedIn(false);
        setUserInitial('');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* <div className="nav-logo">
          <img src="/riot-logo.png" alt="Riot Games Logo" className="logo" />
        </div> */}
        <ul className="nav-links">
          {isLoggedIn && (
            <li className="profile-link">
              <NavLink
                to="/teams/profile"
                className={({ isActive }) => `profile-nav-icon ${isActive ? "active" : ""}`}
                title="Your Profile"
              >
                {userInitial}
              </NavLink>
            </li>
          )}
          <li>
            <NavLink
              to="/teams"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Teams
            </NavLink>
          </li>
          {isRotationApiAvailable && (
            <li>
              <NavLink
                to="/rotation"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Free Champions
              </NavLink>
            </li>
          )}
          {/* <li>
            <NavLink
              to="/server-status"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Server Status
            </NavLink>
          </li> */}
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
