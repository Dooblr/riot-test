import { NavLink } from "react-router-dom";
import "./Navigation.scss";

function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* <div className="nav-logo">
          <img src="/riot-logo.png" alt="Riot Games Logo" className="logo" />
        </div> */}
        <ul className="nav-links">
          <li>
            <NavLink
              to="/teams"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Team Finder
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Free Champion Rotation
            </NavLink>
          </li>
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
