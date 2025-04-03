import React, { useEffect, useState } from 'react';
import { fetchAllServers, Server } from '../services/riotApi';
import './ServerStatusPage.scss';

const ServerStatusPage: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServers = async () => {
      try {
        const serverData = await fetchAllServers();
        setServers(serverData);
        // Select PNW server by default
        const pnwServer = serverData.find(server => server.id === 'pnw');
        setSelectedServer(pnwServer || serverData[0]);
      } catch (err) {
        setError('Failed to load server data');
        console.error('Error loading servers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadServers();
    const interval = setInterval(loadServers, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleServerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const server = servers.find(s => s.id === event.target.value);
    if (server) {
      setSelectedServer(server);
    }
  };

  if (loading) {
    return <div className="loading">Loading server status...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="server-status-page">
      <h1>Server Status</h1>
      
      <div className="server-selector">
        <label htmlFor="server-select">Select Server Region:</label>
        <select
          id="server-select"
          value={selectedServer?.id || ''}
          onChange={handleServerChange}
          className="server-dropdown"
        >
          {servers.map((server) => (
            <option key={server.id} value={server.id}>
              {server.name} ({server.location})
            </option>
          ))}
        </select>
      </div>

      {selectedServer && (
        <div className="server-details-panel">
          <h2>Server Status for {selectedServer.name}</h2>
          <div className="status-details">
            <div className="status-section">
              <h3>Current Status</h3>
              <p className={`status ${selectedServer.status}`}>
                {selectedServer.status.charAt(0).toUpperCase() + selectedServer.status.slice(1)}
              </p>
            </div>
            <div className="status-section">
              <h3>Performance Metrics</h3>
              <p>Ping: {selectedServer.ping}ms</p>
              <p>Last Updated: {selectedServer.lastUpdated.toLocaleTimeString()}</p>
            </div>
            <div className="status-section">
              <h3>Server Information</h3>
              <p>Location: {selectedServer.location}</p>
              <p>Region: {selectedServer.region}</p>
            </div>
          </div>

          <div className="server-services">
            <h3>Server Services</h3>
            <div className="services-grid">
              <div className="service-item">
                <h4>Game Server</h4>
                <p>{selectedServer.details.gameServer}</p>
                <span className={`status-indicator ${selectedServer.status}`}>
                  {selectedServer.status.charAt(0).toUpperCase() + selectedServer.status.slice(1)}
                </span>
              </div>
              <div className="service-item">
                <h4>Chat Service</h4>
                <p>{selectedServer.details.chatService}</p>
                <span className={`status-indicator ${selectedServer.status}`}>
                  {selectedServer.status.charAt(0).toUpperCase() + selectedServer.status.slice(1)}
                </span>
              </div>
              <div className="service-item">
                <h4>Matchmaking</h4>
                <p>{selectedServer.details.matchmaking}</p>
                <span className={`status-indicator ${selectedServer.status}`}>
                  {selectedServer.status.charAt(0).toUpperCase() + selectedServer.status.slice(1)}
                </span>
              </div>
              <div className="service-item">
                <h4>Team Builder</h4>
                <p>{selectedServer.details.teamBuilder}</p>
                <span className={`status-indicator ${selectedServer.status}`}>
                  {selectedServer.status.charAt(0).toUpperCase() + selectedServer.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerStatusPage; 