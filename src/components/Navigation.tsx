import { NavLink } from 'react-router-dom';
import './Navigation.scss';

export default function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <img 
            src="https://static.wikia.nocookie.net/leagueoflegends/images/0/07/League_of_Legends_icon.png" 
            alt="League of Legends" 
          />
        </div>
        <ul className="nav-links">
          <li>
            <NavLink 
              to="/" 
              className={({ isActive }) => isActive ? 'active' : ''}
              end
            >
              Free Rotation
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/pnw-server" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              PNW Server Status
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/user-stats" 
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              User Stats
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
} 