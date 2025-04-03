import { useState, useEffect } from 'react';
import './ServerStatusPage.scss';

interface ServerData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'issues';
  ping: number;
  location: string;
  lastUpdated: Date;
}

interface ServerIncident {
  id: string;
  serverId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime: Date;
  resolvedTime: Date | null;
}

// Mock service to simulate server status data
const fetchPNWServerStatus = (): Promise<ServerData[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'pnw-1',
          name: 'Seattle',
          status: 'online',
          ping: 32,
          location: 'Seattle, WA',
          lastUpdated: new Date()
        },
        {
          id: 'pnw-2',
          name: 'Portland',
          status: 'online',
          ping: 45,
          location: 'Portland, OR',
          lastUpdated: new Date()
        },
        {
          id: 'pnw-3',
          name: 'Vancouver',
          status: 'issues',
          ping: 78,
          location: 'Vancouver, BC',
          lastUpdated: new Date()
        },
        {
          id: 'pnw-4',
          name: 'Boise',
          status: 'offline',
          ping: 0,
          location: 'Boise, ID',
          lastUpdated: new Date()
        }
      ]);
    }, 1000);
  });
};

const fetchServerIncidents = (): Promise<ServerIncident[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'inc-1',
          serverId: 'pnw-3',
          title: 'Network Latency Issues',
          description: 'Players may experience higher than normal latency due to network maintenance.',
          severity: 'medium',
          startTime: new Date(Date.now() - 3600000 * 3), // 3 hours ago
          resolvedTime: null
        },
        {
          id: 'inc-2',
          serverId: 'pnw-4',
          title: 'Server Outage',
          description: 'Server is currently offline due to hardware failure. Maintenance team is addressing the issue.',
          severity: 'critical',
          startTime: new Date(Date.now() - 3600000 * 5), // 5 hours ago
          resolvedTime: null
        }
      ]);
    }, 1000);
  });
};

export default function ServerStatusPage() {
  const [servers, setServers] = useState<ServerData[]>([]);
  const [incidents, setIncidents] = useState<ServerIncident[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [serverData, incidentData] = await Promise.all([
        fetchPNWServerStatus(),
        fetchServerIncidents()
      ]);

      setServers(serverData);
      setIncidents(incidentData);

      // Auto-select the first server with issues, or just the first server
      const serverWithIssues = serverData.find(server => server.status === 'issues' || server.status === 'offline');
      setSelectedServer(serverWithIssues?.id || (serverData.length > 0 ? serverData[0].id : null));
    } catch (err) {
      setError('Failed to load server status data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServerData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadServerData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIndicatorClass = (status: ServerData['status']) => {
    switch (status) {
      case 'online': return 'status-indicator online';
      case 'offline': return 'status-indicator offline';
      case 'issues': return 'status-indicator issues';
      default: return 'status-indicator';
    }
  };

  const getStatusText = (status: ServerData['status']) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'issues': return 'Issues Detected';
      default: return 'Unknown';
    }
  };

  const getIncidentSeverityClass = (severity: ServerIncident['severity']) => {
    switch (severity) {
      case 'low': return 'severity low';
      case 'medium': return 'severity medium';
      case 'high': return 'severity high';
      case 'critical': return 'severity critical';
      default: return 'severity';
    }
  };

  if (loading) {
    return <div className="loading">Loading server status...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const selectedServerData = servers.find(server => server.id === selectedServer);
  const serverIncidents = incidents.filter(incident => incident.serverId === selectedServer);

  return (
    <div className="server-status-page">
      <div className="header">
        <h2>PNW Server Status</h2>
        <button onClick={loadServerData} className="refresh-button">
          Refresh Data
        </button>
      </div>

      <div className="server-status-container">
        <div className="server-list">
          {servers.map(server => (
            <div 
              key={server.id}
              className={`server-item ${selectedServer === server.id ? 'selected' : ''}`}
              onClick={() => setSelectedServer(server.id)}
            >
              <div className={getStatusIndicatorClass(server.status)}></div>
              <div className="server-name">{server.name}</div>
              <div className="server-ping">{server.status === 'offline' ? '-' : `${server.ping}ms`}</div>
            </div>
          ))}
        </div>

        {selectedServerData && (
          <div className="server-details">
            <div className="server-header">
              <h3>{selectedServerData.name}</h3>
              <div className={`server-status ${selectedServerData.status}`}>
                {getStatusText(selectedServerData.status)}
              </div>
            </div>

            <div className="server-info-grid">
              <div className="server-info-item">
                <span className="label">Location:</span>
                <span className="value">{selectedServerData.location}</span>
              </div>
              
              <div className="server-info-item">
                <span className="label">Ping:</span>
                <span className="value">{selectedServerData.status === 'offline' ? '-' : `${selectedServerData.ping}ms`}</span>
              </div>
              
              <div className="server-info-item">
                <span className="label">Last Updated:</span>
                <span className="value">{selectedServerData.lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="incidents-section">
              <h4>Incidents</h4>
              
              {serverIncidents.length === 0 ? (
                <p className="no-incidents">No active incidents reported.</p>
              ) : (
                <div className="incidents-list">
                  {serverIncidents.map(incident => (
                    <div key={incident.id} className="incident-item">
                      <div className="incident-header">
                        <span className={getIncidentSeverityClass(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </span>
                        <h5>{incident.title}</h5>
                      </div>
                      <p className="incident-description">{incident.description}</p>
                      <div className="incident-timing">
                        <span>Started: {incident.startTime.toLocaleString()}</span>
                        {incident.resolvedTime && (
                          <span>Resolved: {incident.resolvedTime.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 