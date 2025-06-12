import React, { useState, useEffect } from 'react';

const AnalyticsSection = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/analytics?type=charts&days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        setError(data.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0 || isNaN(hours)) return '0h';
    const numHours = parseFloat(hours);
    if (isNaN(numHours)) return '0h';
    return `${numHours.toFixed(1)}h`;
  };

  const getProductivityColor = (hours) => {
    const numHours = parseFloat(hours) || 0;
    if (numHours >= 8) return 'text-emerald-400';
    if (numHours >= 6) return 'text-blue-400';
    if (numHours >= 4) return 'text-amber-400';
    return 'text-rose-400';
  };

  const renderBarChart = (data, title, dataKey, maxValue) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="glass-card">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <span className="emoji">📊</span>
          <span>{title}</span>
        </h4>
        <div className="space-y-3">
          {data.slice(-7).map((item, index) => {
            const value = parseFloat(item[dataKey] || 0);
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-xs text-gray-400">
                  {item.date ? new Date(item.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }) : `Week ${item.week_number}`}
                </div>
                <div className="flex-1 bg-gray-700/50 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500/80 to-blue-500/80 rounded-full transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    <span className="text-xs font-medium text-white">
                      {dataKey === 'avg_hours' ? formatHours(value) : Math.round(value)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
          <span className="text-white text-lg">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card border-l-4 border-rose-400 bg-rose-500/10">
        <div className="flex items-center space-x-3">
          <span className="text-lg emoji">⚠️</span>
          <div>
            <p className="text-rose-300 font-medium text-sm">Analytics Error</p>
            <p className="text-rose-200 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-xl font-bold gradient-text mb-2 flex items-center space-x-2">
              <span className="text-2xl emoji">📈</span>
              <span>Company Analytics & Insights</span>
            </h3>
            <p className="text-purple-200/80">
              Track productivity trends, attendance patterns, and team performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="glass-input"
            >
              <option value="7" className="bg-gray-800">Last 7 days</option>
              <option value="30" className="bg-gray-800">Last 30 days</option>
              <option value="90" className="bg-gray-800">Last 90 days</option>
            </select>
            <button
              onClick={fetchAnalyticsData}
              className="glass-button font-medium px-4 py-2 floating"
            >
              <span className="emoji mr-2">🔄</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card bg-emerald-500/10 border-emerald-400/30">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl emoji">📊</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">
                  {analyticsData.daily_attendance?.length || 0}
                </div>
                <div className="text-xs text-emerald-300">Active Days</div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-blue-500/10 border-blue-400/30">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl emoji">⏱️</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatHours(analyticsData.weekly_trends?.reduce((acc, week) => 
                    acc + (parseFloat(week.avg_hours_per_day) || 0), 0) / 
                    Math.max(analyticsData.weekly_trends?.length || 1, 1))}
                </div>
                <div className="text-xs text-blue-300">Avg Daily Hours</div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-amber-500/10 border-amber-400/30">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl emoji">☕</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  {Math.round(analyticsData.break_patterns?.reduce((acc, day) => 
                    acc + (parseFloat(day.avg_break_duration) || 0), 0) / 
                    Math.max(analyticsData.break_patterns?.length || 1, 1)) || 0}m
                </div>
                <div className="text-xs text-amber-300">Avg Break Time</div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-purple-500/10 border-purple-400/30">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-xl emoji">👥</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {analyticsData.employee_productivity?.length || 0}
                </div>
                <div className="text-xs text-purple-300">Active Employees</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Attendance Chart */}
          {renderBarChart(
            analyticsData.daily_attendance,
            'Daily Attendance Trends',
            'avg_hours',
            Math.max(...analyticsData.daily_attendance.map(d => parseFloat(d.avg_hours || 0)))
          )}

          {/* Break Patterns Chart */}
          {renderBarChart(
            analyticsData.break_patterns,
            'Daily Break Patterns',
            'avg_break_duration',
            Math.max(...analyticsData.break_patterns.map(d => parseFloat(d.avg_break_duration || 0)))
          )}
        </div>
      )}

      {/* Employee Productivity Table */}
      {analyticsData?.employee_productivity && (
        <div className="glass-card">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <span className="emoji">🏆</span>
            <span>Employee Productivity Overview</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600/30">
                  <th className="text-left text-xs font-medium text-purple-300 uppercase tracking-wider py-3">Employee</th>
                  <th className="text-left text-xs font-medium text-purple-300 uppercase tracking-wider py-3">Days Worked</th>
                  <th className="text-left text-xs font-medium text-purple-300 uppercase tracking-wider py-3">Total Hours</th>
                  <th className="text-left text-xs font-medium text-purple-300 uppercase tracking-wider py-3">Avg Daily</th>
                  <th className="text-left text-xs font-medium text-purple-300 uppercase tracking-wider py-3">Productivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600/30">
                {analyticsData.employee_productivity.map((employee, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-white font-medium">{employee.employee_name}</td>
                    <td className="py-3 text-gray-300">{employee.days_worked}</td>
                    <td className="py-3 text-blue-300">{formatHours(employee.total_hours)}</td>
                    <td className="py-3">
                      <span className={getProductivityColor(employee.avg_daily_hours)}>
                        {formatHours(employee.avg_daily_hours)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-700/50 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              (parseFloat(employee.avg_daily_hours) || 0) >= 8 ? 'bg-emerald-400' :
                              (parseFloat(employee.avg_daily_hours) || 0) >= 6 ? 'bg-blue-400' :
                              (parseFloat(employee.avg_daily_hours) || 0) >= 4 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ 
                              width: `${Math.min(((parseFloat(employee.avg_daily_hours) || 0) / 8) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {Math.round(((parseFloat(employee.avg_daily_hours) || 0) / 8) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights Panel */}
      {analyticsData && (
        <div className="glass-card">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <span className="emoji">💡</span>
            <span>Key Insights</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <div className="text-blue-300 font-medium mb-2 flex items-center space-x-2">
                <span className="emoji">📈</span>
                <span>Productivity Trend</span>
              </div>
              <div className="text-sm text-gray-300">
                {analyticsData.employee_productivity?.length > 0 ? (
                  `Average daily productivity: ${formatHours(
                    analyticsData.employee_productivity.reduce((acc, emp) => 
                      acc + (parseFloat(emp.avg_daily_hours) || 0), 0) / 
                    Math.max(analyticsData.employee_productivity.length, 1)
                  )}`
                ) : 'No productivity data available'}
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
              <div className="text-amber-300 font-medium mb-2 flex items-center space-x-2">
                <span className="emoji">⚡</span>
                <span>Break Efficiency</span>
              </div>
              <div className="text-sm text-gray-300">
                {analyticsData.break_patterns?.length > 0 ? (
                  `Teams average ${Math.round(
                    analyticsData.break_patterns.reduce((acc, day) => 
                      acc + (parseFloat(day.total_breaks) || 0), 0) / 
                    Math.max(analyticsData.break_patterns.length, 1)
                  )} breaks per day`
                ) : 'No break data available'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection; 