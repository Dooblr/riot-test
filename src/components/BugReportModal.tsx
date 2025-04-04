import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './BugReportModal.scss';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const user = auth.currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to report a bug');
      return;
    }
    
    if (!title.trim() || !description.trim()) {
      setError('Please complete all required fields');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'bugReports'), {
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim(),
        status: 'new',
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        browser: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      });
      
      setSuccess(true);
      setTitle('');
      setDescription('');
      setSteps('');
      
      // Close the modal after a delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting bug report:', err);
      setError('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bug-report-modal-overlay" onClick={onClose}>
      <div className="bug-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report a Bug</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        {success ? (
          <div className="success-message">
            <div className="checkmark">✓</div>
            <p>Bug report submitted successfully!</p>
            <p>Thank you for helping improve our app.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bug-report-form">
            <div className="form-group">
              <label htmlFor="title">Title <span className="required">*</span></label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description <span className="required">*</span></label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed explanation of what happened"
                rows={4}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="steps">Steps to Reproduce</label>
              <textarea
                id="steps"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="1. Go to...\n2. Click on...\n3. Observe..."
                rows={3}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-actions">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BugReportModal; 