import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAttendance = () => {
  const [attendance, setAttendance] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [summary, setSummary] = useState({});
  const [systemMode, setSystemMode] = useState('configured');
  const [systemSettings, setSystemSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Separate loading states for different actions
  const [actionLoading, setActionLoading] = useState({
    checkIn: false,
    checkOut: false,
    startBreak: false,
    endBreak: false
  });
  
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchTodayAttendance = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');

      const response = await fetch(`${API_URL}/api/attendance/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAttendance(data.attendance);
        setBreaks(data.breaks || []);
        setSummary(data.summary || {});
        setSystemMode(data.systemMode?.mode || 'configured');
        setSystemSettings(data.systemSettings || {});
      } else {
        setError(data.error || 'Failed to fetch attendance data');
      }
    } catch (err) {
      setError('Network error');
      console.error('Fetch attendance error:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const checkIn = async () => {
    try {
      setActionLoading(prev => ({ ...prev, checkIn: true }));
      setError('');
      
      const response = await fetch(`${API_URL}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh data without showing full-page loading
        await fetchTodayAttendance(false);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Check-in error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setActionLoading(prev => ({ ...prev, checkIn: false }));
    }
  };

  const checkOut = async (notes = '') => {
    try {
      setActionLoading(prev => ({ ...prev, checkOut: true }));
      setError('');
      
      // Validate notes are required and sufficiently detailed
      if (!notes || notes.trim().length === 0) {
        return { success: false, error: 'Work log is required before checkout. Please describe your accomplishments today in detail.' };
      }
      
      if (notes.trim().length < 30) {
        return { success: false, error: 'Work log must be at least 30 characters long. Please provide information about tasks completed, meetings attended, and achievements.' };
      }
      
      const response = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notes.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh data without showing full-page loading
        await fetchTodayAttendance(false);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Check-out error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setActionLoading(prev => ({ ...prev, checkOut: false }));
    }
  };

  const startBreak = async (breakNote = '') => {
    try {
      setActionLoading(prev => ({ ...prev, startBreak: true }));
      setError('');
      
      const response = await fetch(`${API_URL}/api/breaks?action=start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ breakNote }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh data without showing full-page loading
        await fetchTodayAttendance(false);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Start break error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setActionLoading(prev => ({ ...prev, startBreak: false }));
    }
  };

  const endBreak = async () => {
    try {
      setActionLoading(prev => ({ ...prev, endBreak: true }));
      setError('');
      
      const response = await fetch(`${API_URL}/api/breaks?action=end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh data without showing full-page loading
        await fetchTodayAttendance(false);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('End break error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setActionLoading(prev => ({ ...prev, endBreak: false }));
    }
  };

  const updateNotes = async (notes) => {
    try {
      setError('');
      
      // For now, notes are only saved during checkout
      // This function can be used for real-time notes saving if needed
      return { success: true, message: 'Notes will be saved when you check out' };
    } catch (err) {
      console.error('Update notes error:', err);
      return { success: false, error: 'Failed to update notes' };
    }
  };

  useEffect(() => {
    if (token) {
      fetchTodayAttendance();
    }
  }, [token]);

  return {
    attendance,
    breaks,
    summary,
    systemMode,
    systemSettings,
    loading,
    actionLoading,
    error,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
    updateNotes,
    refresh: fetchTodayAttendance,
  };
}; 