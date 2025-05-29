import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useAttendance = () => {
  const [attendance, setAttendance] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
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
      } else {
        setError(data.error || 'Failed to fetch attendance data');
      }
    } catch (err) {
      setError('Network error');
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    try {
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
        await fetchTodayAttendance();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Check-in error:', err);
      return { success: false, error: 'Network error' };
    }
  };

  const checkOut = async (notes = '') => {
    try {
      setError('');
      
      const response = await fetch(`${API_URL}/api/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchTodayAttendance();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('Check-out error:', err);
      return { success: false, error: 'Network error' };
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
    loading,
    error,
    actions: {
      checkIn,
      checkOut,
      refresh: fetchTodayAttendance,
    },
  };
}; 