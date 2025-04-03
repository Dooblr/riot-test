import { useState, useEffect } from 'react';
import { fetchPNWServerStatus, ServerStatus, Incident } from '../services/riotApi';
import './PNWServerStatus.scss';

export default function PNWServerStatus() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const loadServerStatus = async () => {
      try {
        setLoading(true);
        const data = await fetchPNWServerStatus();
        setServers(data);
        setError(null);
        
        // Set first server as selected by default
        if (data.length > 0) {
          setSelectedServer(data[0]);
        }
      } catch (err) {
        setError('Failed to load server status');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadServerStatus();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleServerSelect = (server: ServerStatus) => {
    setSelectedServer(server);
  };

  const getStatusClass = (status: 'online' | 'offline' | 'unstable') => {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'unstable': return 'status-unstable';
      default: return '';
    }
  };
  
  const getPingClass = (ping: number) => {
    if (ping < 30) return 'ping-good';
    if (ping < 60) return 'ping-ok';
    return 'ping-bad';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading server status...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="server-status">
      <h2>Pacific Northwest Server Status</h2>
      
      <div className="server-dashboard">
        <div className="server-list">
          {servers.map((server) => (
            <div 
              key={server.name}
              className={`server-item ${selectedServer?.name === server.name ? 'selected' : ''}`}
              onClick={() => handleServerSelect(server)}
            >
              <div className="server-header">
                <span className="server-name">{server.name}</span>
                <span className={`server-status-indicator ${getStatusClass(server.status)}`}>
                  {server.status}
                </span>
              </div>
              <div className="server-ping">
                <span className={`ping-value ${getPingClass(server.ping)}`}>{server.ping}ms</span>
              </div>
              {server.incidents.length > 0 && (
                <div className="server-incidents-badge">
                  {server.incidents.length}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="server-details">
          {selectedServer ? (
            <>
              <div className="server-detail-header">
                <h3>{selectedServer.name}</h3>
                <span className={`status-badge ${getStatusClass(selectedServer.status)}`}>
                  {selectedServer.status}
                </span>
              </div>
              
              <div className="server-metrics">
                <div className="metric">
                  <span className="metric-name">Ping</span>
                  <span className={`metric-value ${getPingClass(selectedServer.ping)}`}>
                    {selectedServer.ping}ms
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-name">Incidents</span>
                  <span className="metric-value">
                    {selectedServer.incidents.length}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-name">Last Updated</span>
                  <span className="metric-value">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="incidents-container">
                <h4>Recent Incidents</h4>
                {selectedServer.incidents.length === 0 ? (
                  <p className="no-incidents">No incidents reported</p>
                ) : (
                  <div className="incidents-list">
                    {selectedServer.incidents.map((incident: Incident) => (
                      <div key={incident.id} className={`incident-item severity-${incident.severity}`}>
                        <div className="incident-header">
                          <h5>{incident.title}</h5>
                          <span className="incident-severity">{incident.severity}</span>
                        </div>
                        <p className="incident-description">{incident.description}</p>
                        <div className="incident-meta">
                          <span>Created: {formatDate(incident.created_at)}</span>
                          <span>Updated: {formatDate(incident.updated_at)}</span>
                        </div>
                        <div className="incident-platforms">
                          {incident.platforms.map(platform => (
                            <span key={platform} className="platform-tag">{platform}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="select-server-message">
              <p>Select a server to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 