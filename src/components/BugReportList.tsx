import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './BugReportList.scss';

interface BugReport {
  id: string;
  title: string;
  description: string;
  steps: string;
  status: 'new' | 'in-progress' | 'resolved' | 'wont-fix';
  userId: string;
  userEmail: string;
  createdAt: {
    toDate: () => Date;
  };
  browser: string;
  screenSize: string;
}

const BugReportList = () => {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const userDoc = await doc(db, 'users', currentUser.uid);
        const userSnapshot = await fetch(userDoc);
        const userData = userSnapshot.data();
        
        setIsAdmin(userData?.isAdmin || false);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    setCurrentUser(auth.currentUser);
    checkAdminStatus();
  }, [auth.currentUser]);

  // Fetch bug reports
  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'bugReports'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const bugs: BugReport[] = [];
        querySnapshot.forEach((doc) => {
          bugs.push({ id: doc.id, ...doc.data() } as BugReport);
        });
        setBugReports(bugs);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching bug reports:', err);
        setError('Failed to load bug reports');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up bug reports listener:', err);
      setError('Failed to set up bug reports listener');
      setLoading(false);
    }
  }, [isAdmin]);

  const handleStatusChange = async (bugId: string, newStatus: BugReport['status']) => {
    if (!isAdmin) return;

    try {
      const bugRef = doc(db, 'bugReports', bugId);
      await updateDoc(bugRef, {
        status: newStatus
      });
    } catch (err) {
      console.error('Error updating bug status:', err);
      setError('Failed to update bug status');
    }
  };

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading bug reports...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const getStatusClass = (status: BugReport['status']) => {
    switch (status) {
      case 'new': return 'status-new';
      case 'in-progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      case 'wont-fix': return 'status-wont-fix';
      default: return '';
    }
  };

  const getStatusLabel = (status: BugReport['status']) => {
    switch (status) {
      case 'new': return 'New';
      case 'in-progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'wont-fix': return 'Won\'t Fix';
      default: return status;
    }
  };

  return (
    <div className="bug-report-list-container">
      <h1>Bug Reports</h1>
      
      <div className="bug-reports-grid">
        <div className="bug-list">
          {bugReports.length === 0 ? (
            <div className="no-bugs">No bug reports found</div>
          ) : (
            bugReports.map((bug) => (
              <div 
                key={bug.id} 
                className={`bug-item ${selectedBug?.id === bug.id ? 'selected' : ''} ${getStatusClass(bug.status)}`}
                onClick={() => setSelectedBug(bug)}
              >
                <div className="bug-title">{bug.title}</div>
                <div className="bug-meta">
                  <span className="bug-date">
                    {bug.createdAt.toDate().toLocaleDateString()}
                  </span>
                  <span className={`bug-status ${getStatusClass(bug.status)}`}>
                    {getStatusLabel(bug.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedBug && (
          <div className="bug-details">
            <div className="bug-details-header">
              <h2>{selectedBug.title}</h2>
              <div className="bug-status-controls">
                <label>Status:</label>
                <select 
                  value={selectedBug.status}
                  onChange={(e) => handleStatusChange(selectedBug.id, e.target.value as BugReport['status'])}
                >
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="wont-fix">Won't Fix</option>
                </select>
              </div>
            </div>
            
            <div className="bug-info">
              <div className="info-group">
                <label>Reported by:</label>
                <div>{selectedBug.userEmail}</div>
              </div>
              
              <div className="info-group">
                <label>Date:</label>
                <div>{selectedBug.createdAt.toDate().toLocaleString()}</div>
              </div>
              
              <div className="info-group">
                <label>Browser:</label>
                <div>{selectedBug.browser}</div>
              </div>
              
              <div className="info-group">
                <label>Screen Size:</label>
                <div>{selectedBug.screenSize}</div>
              </div>
            </div>
            
            <div className="bug-content">
              <div className="content-section">
                <h3>Description</h3>
                <p>{selectedBug.description}</p>
              </div>
              
              {selectedBug.steps && (
                <div className="content-section">
                  <h3>Steps to Reproduce</h3>
                  <p className="steps-content">{selectedBug.steps}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugReportList; 