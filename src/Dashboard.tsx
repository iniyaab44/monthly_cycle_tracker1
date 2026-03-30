import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isWithinInterval,
  startOfMonth as startOfMonthFn,
  endOfMonth as endOfMonthFn,
  isValid
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Download, 
  LogOut, 
  Activity, 
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  Database,
  User as UserIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import SunflowerLogo from './components/SunflowerLogo';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CycleLog, LogStatus } from './types';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  Period: 'bg-[#FF4444]',
  Pill: 'bg-[#FFD700]',
  Free: 'bg-[#4CAF50]',
};

export default function Dashboard() {
  const { user, token, logout, updateUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CycleLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected'>('connected');

  // Profile Modal State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    email: user?.email || '',
    password: '',
  });
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Download Modal State
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<'PDF' | 'EXCEL'>('PDF');
  const [range, setRange] = useState({
    startMonth: format(new Date(), 'MM'),
    startYear: format(new Date(), 'yyyy'),
    endMonth: format(new Date(), 'MM'),
    endYear: format(new Date(), 'yyyy'),
  });

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString());

  const fetchJson = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
      return data;
    } else {
      const text = await res.text();
      console.error('Non-JSON response from', url, ':', text);
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}. Please check if the API routes are correctly configured.`);
      return text;
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'Free' as LogStatus,
    hour: '09',
    minute: '30',
    ampm: 'AM',
    description: '',
  });

  useEffect(() => {
    fetchLogs();
    checkHealth();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const checkHealth = async () => {
    try {
      const data = await fetchJson('/api/health');
      setDbStatus(data.database);
    } catch (e) {
      setDbStatus('disconnected');
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await fetchJson('/api/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched logs:', data.length);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const time = `${formData.hour}:${formData.minute} ${formData.ampm}`;
    const payload = {
      date: formData.date,
      status: formData.status,
      time,
      description: formData.description,
    };

    const url = editingLog ? `/api/logs/${editingLog.id}` : '/api/logs';
    const method = editingLog ? 'PUT' : 'POST';

    try {
      await fetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      fetchLogs();
      setIsModalOpen(false);
      setEditingLog(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'Free',
        hour: '09',
        minute: '30',
        ampm: 'AM',
        description: '',
      });
    } catch (err) {
      console.error('Error saving log:', err);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await fetchJson(`/api/logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLogs();
    } catch (err) {
      console.error('Error deleting log:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);

    try {
      const data = await fetchJson('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileFormData),
      });

      updateUser(data.user);
      setIsProfileModalOpen(false);
      setProfileFormData(prev => ({ ...prev, password: '' }));
      alert('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const openEditModal = (log: CycleLog) => {
    setEditingLog(log);
    const [timePart, ampm] = log.time.split(' ');
    const [hour, minute] = timePart.split(':');
    setFormData({
      date: log.date,
      status: log.status,
      hour,
      minute,
      ampm,
      description: log.description,
    });
    setIsModalOpen(true);
  };

  // Calendar Logic
  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 neubrutalism-card p-4 bg-white gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Month Navigation Row */}
          <div className="flex items-center gap-2 md:gap-4 justify-center">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="neubrutalism-button p-1 md:p-2">
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
            <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-center min-w-[140px] md:min-w-[200px]">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="neubrutalism-button p-1 md:p-2">
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </div>

          {/* Today & DB Status Row */}
          <div className="flex items-center gap-2 justify-center">
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="neubrutalism-button px-3 py-1 text-xs font-black uppercase bg-gray-100 hover:bg-white transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1 px-2 py-1 border-2 border-black font-bold text-[10px] uppercase bg-white">
              <Database size={10} className={dbStatus === 'connected' ? 'text-green-600' : 'text-red-600'} />
              {dbStatus === 'connected' ? 'DB OK' : 'DB ERR'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center font-black uppercase text-sm border-b-4 border-black pb-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayLogs = logs.filter(l => isSameDay(parseISO(l.date), cloneDay));
        const isToday = isSameDay(day, new Date());
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "h-20 md:h-32 border-2 border-black p-1 md:p-2 relative transition-colors overflow-hidden",
              !isSameMonth(day, monthStart) ? "bg-gray-100 text-gray-400" : "bg-white",
              isToday && "border-4 ring-4 ring-black ring-inset"
            )}
            onClick={() => {
              setFormData({ ...formData, date: format(cloneDay, 'yyyy-MM-dd') });
              setIsModalOpen(true);
            }}
          >
            <span className="font-black text-sm md:text-lg">{formattedDate}</span>
            <div className="flex flex-col gap-0.5 md:gap-1 mt-0.5 md:mt-1">
              {dayLogs.map(log => (
                <div 
                  key={log.id} 
                  className={cn("text-[8px] md:text-[10px] font-bold px-0.5 md:px-1 border border-black md:border-2 truncate cursor-pointer", STATUS_COLORS[log.status])}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(log);
                  }}
                >
                  <span className="hidden md:inline">{log.status === 'Pill' ? '💊' : log.status === 'Period' ? '🔴' : '🟢'}</span> {log.time}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-2 border-black">{rows}</div>;
  };

  // Analytics Data
  const currentMonthLogs = logs.filter(l => isSameMonth(parseISO(l.date), currentDate));
  const chartData = [
    { name: 'Period', count: currentMonthLogs.filter(l => l.status === 'Period').length, color: '#FF4444' },
    { name: 'Pills', count: currentMonthLogs.filter(l => l.status === 'Pill').length, color: '#FFD700' },
    { name: 'Free', count: currentMonthLogs.filter(l => l.status === 'Free').length, color: '#4CAF50' },
  ];

  const filteredLogs = currentMonthLogs.filter(l => 
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.date.includes(searchQuery)
  );

  const exportPDF = (filteredLogs: CycleLog[], rangeLabel: string) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Cycle Report - ${rangeLabel}`, 14, 22);
    
    const tableData = filteredLogs.map(l => [
      format(parseISO(l.date), 'MMM dd, yyyy'),
      l.status,
      l.time,
      l.description
    ]);

    autoTable(doc, {
      head: [['Date', 'Status', 'Time', 'Description']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save(`cycle-report-${rangeLabel.replace(/ /g, '-')}.pdf`);
  };

  const exportExcel = (filteredLogs: CycleLog[], rangeLabel: string) => {
    const data = filteredLogs.map(l => ({
      Date: format(parseISO(l.date), 'yyyy-MM-dd'),
      Status: l.status,
      Time: l.time,
      Description: l.description
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cycle Logs");
    XLSX.writeFile(workbook, `cycle-report-${rangeLabel.replace(/ /g, '-')}.xlsx`);
  };

  const handleDownloadSubmit = () => {
    const startDate = startOfMonthFn(new Date(parseInt(range.startYear), parseInt(range.startMonth) - 1));
    const endDate = endOfMonthFn(new Date(parseInt(range.endYear), parseInt(range.endMonth) - 1));

    if (!isValid(startDate) || !isValid(endDate)) {
      alert("Invalid date range selected.");
      return;
    }

    const filtered = logs.filter(l => {
      const logDate = parseISO(l.date);
      return isWithinInterval(logDate, { start: startDate, end: endDate });
    }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const rangeLabel = `${months.find(m => m.value === range.startMonth)?.label} ${range.startYear} to ${months.find(m => m.value === range.endMonth)?.label} ${range.endYear}`;

    if (downloadType === 'PDF') {
      exportPDF(filtered, rangeLabel);
    } else {
      exportExcel(filtered, rangeLabel);
    }
    setIsDownloadModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <header className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2 flex flex-wrap items-center gap-2 md:gap-4">
              Monthly 
              <SunflowerLogo className="w-12 h-12 md:w-20 md:h-20" />
              cycle
            </h1>
            <p className="text-lg md:text-xl font-bold opacity-70">Your neubrutalist wellness companion.</p>
          </div>
          {user && (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="text-center md:text-right">
                <p className="text-xl md:text-2xl font-black uppercase leading-none">Welcome, {user.name || user.email}!</p>
                <p className="text-sm font-bold opacity-50">@{user.username || 'user'}</p>
              </div>
              <div className="relative">
                <div className="flex justify-center">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`neubrutalism-button p-3 transition-colors ${isProfileMenuOpen ? 'bg-sandel' : 'bg-white hover:bg-sandel'}`}
                    title="Account Settings"
                  >
                    <UserIcon size={24} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <>
                      {/* Backdrop for mobile to close menu on tap outside */}
                      <div 
                        className="fixed inset-0 z-40 md:hidden" 
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 10, scale: 0.95, x: '-50%' }}
                        className="absolute left-1/2 top-full mt-2 z-50 bg-white border-4 border-black w-48 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:left-auto md:right-0 md:translate-x-0"
                      >
                        <button 
                          onClick={() => {
                            setIsProfileModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-gray-100 font-black uppercase text-sm border-b-4 border-black flex items-center gap-2"
                        >
                          <Edit2 size={16} /> Profile Settings
                        </button>
                        <button 
                          onClick={() => {
                            logout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-red-50 font-black uppercase text-sm text-red-600 flex items-center gap-2"
                        >
                          <LogOut size={16} /> Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Calendar */}
        <div className="lg:col-span-2">
          {renderHeader()}
          <div className="neubrutalism-card p-6 bg-white mb-8">
            {renderDays()}
            {renderCells()}
          </div>

          {/* System Legend under Calendar */}
          <div className="neubrutalism-card bg-white p-6 flex flex-wrap gap-4 md:gap-8 items-center">
            <h4 className="font-black uppercase text-lg">System Legend</h4>
            <div className="flex items-center gap-3 font-bold uppercase text-sm">
              <div className="w-6 h-6 border-4 border-black bg-[#FF4444]"></div> Period Day
            </div>
            <div className="flex items-center gap-3 font-bold uppercase text-sm">
              <div className="w-6 h-6 border-4 border-black bg-[#FFD700]"></div> Pill Taken
            </div>
            <div className="flex items-center gap-3 font-bold uppercase text-sm">
              <div className="w-6 h-6 border-4 border-black bg-[#4CAF50]"></div> Free Day
            </div>
          </div>
        </div>

        {/* Right Column: Analytics & Logs */}
        <div className="space-y-8">
          {/* Analytics Chart */}
          <div className="neubrutalism-card p-6 bg-white">
            <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
              <Activity /> Monthly Overview
            </h3>
            <div className="h-48 md:h-64 w-full relative">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#000" />
                    <XAxis dataKey="name" axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 'bold' }} />
                    <YAxis axisLine={{ strokeWidth: 4 }} tick={{ fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ border: '4px solid black', fontWeight: 'bold' }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="count">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Log Summary */}
          <div className="neubrutalism-card p-6 bg-white flex flex-col h-[400px] md:h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                <CalendarIcon /> Activity Log
              </h3>
              <div className="flex gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    className={`neubrutalism-button p-2 transition-colors ${isDownloadMenuOpen ? 'bg-sandel' : 'bg-white hover:bg-sandel'}`}
                  >
                    <Download size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {isDownloadMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10 md:hidden" onClick={() => setIsDownloadMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 top-full mt-1 z-20 bg-white border-4 border-black w-32 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <button 
                            onClick={() => { 
                              setDownloadType('EXCEL'); 
                              setIsDownloadModalOpen(true); 
                              setIsDownloadMenuOpen(false);
                            }} 
                            className="w-full text-left p-2 hover:bg-gray-100 font-bold border-b-2 border-black"
                          >
                            Excel
                          </button>
                          <button 
                            onClick={() => { 
                              setDownloadType('PDF'); 
                              setIsDownloadModalOpen(true); 
                              setIsDownloadMenuOpen(false);
                            }} 
                            className="w-full text-left p-2 hover:bg-gray-100 font-bold"
                          >
                            PDF
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="neubrutalism-input w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 font-bold text-gray-400">No logs found for this month.</div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="neubrutalism-card p-4 bg-white relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("px-2 py-1 border-2 border-black font-black text-xs uppercase", STATUS_COLORS[log.status])}>
                        {log.status}
                      </span>
                      <span className="font-black text-sm">{format(parseISO(log.date), 'MMM dd')} • {log.time}</span>
                    </div>
                    <p className="font-bold text-sm mb-4">{log.description || 'No description provided.'}</p>
                    <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(log)} className="neubrutalism-button p-1 text-blue-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteLog(log.id)} className="neubrutalism-button p-1 text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="neubrutalism-card bg-white w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black uppercase">Profile Settings</h2>
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="neubrutalism-button p-2 bg-gray-100"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {profileError && (
                  <div className="bg-red-100 border-4 border-black p-3 font-bold text-sm text-red-600">
                    {profileError}
                  </div>
                )}

                <div>
                  <label className="block font-black uppercase text-sm mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    className="neubrutalism-input w-full"
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block font-black uppercase text-sm">New Password (leave blank to keep current)</label>
                    <button 
                      type="button" 
                      onClick={() => alert('Please contact support at sandramleotwe@gmail.com to reset your password.')}
                      className="text-[10px] font-bold uppercase hover:underline opacity-60"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showProfilePassword ? 'text' : 'password'} 
                      className="neubrutalism-input w-full pr-12"
                      placeholder="••••••••"
                      value={profileFormData.password}
                      onChange={(e) => setProfileFormData({ ...profileFormData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-black opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {showProfilePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={profileLoading}
                  className="neubrutalism-button w-full bg-sandel text-black flex items-center justify-center gap-2 py-4 text-xl disabled:opacity-50"
                >
                  {profileLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Download Range Modal */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="neubrutalism-card bg-white w-full max-w-lg p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-black uppercase mb-6">Download {downloadType}</h2>
              <p className="font-bold mb-6 opacity-70">Select the date range for your report.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h4 className="font-black uppercase text-sm border-b-2 border-black pb-1">From</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      className="neubrutalism-input w-full"
                      value={range.startMonth}
                      onChange={(e) => setRange({ ...range, startMonth: e.target.value })}
                    >
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                      className="neubrutalism-input w-full"
                      value={range.startYear}
                      onChange={(e) => setRange({ ...range, startYear: e.target.value })}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black uppercase text-sm border-b-2 border-black pb-1">To</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      className="neubrutalism-input w-full"
                      value={range.endMonth}
                      onChange={(e) => setRange({ ...range, endMonth: e.target.value })}
                    >
                      {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                      className="neubrutalism-input w-full"
                      value={range.endYear}
                      onChange={(e) => setRange({ ...range, endYear: e.target.value })}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="neubrutalism-button flex-1 bg-gray-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDownloadSubmit}
                  className="neubrutalism-button flex-1 bg-sandel"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Entry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="neubrutalism-card bg-white w-full max-w-md p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-black uppercase mb-6">{editingLog ? 'Edit Log' : 'New Entry'}</h2>
              <form onSubmit={handleSaveLog} className="space-y-6">
                <div>
                  <label className="block font-black uppercase text-sm mb-2">Date</label>
                  <input 
                    type="date" 
                    required
                    className="neubrutalism-input w-full"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-black uppercase text-sm mb-2">Status</label>
                  <select 
                    className="neubrutalism-input w-full font-bold"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LogStatus })}
                  >
                    <option value="Period">🔴 Period Day</option>
                    <option value="Pill">🟡 Pill Taken</option>
                    <option value="Free">🟢 Free Day</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-black uppercase text-sm mb-2">Hour</label>
                    <select 
                      className="neubrutalism-input w-full font-bold"
                      value={formData.hour}
                      onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-black uppercase text-sm mb-2">Min</label>
                    <select 
                      className="neubrutalism-input w-full font-bold"
                      value={formData.minute}
                      onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
                    >
                      {['00', '15', '30', '45'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-black uppercase text-sm mb-2">AM/PM</label>
                    <select 
                      className="neubrutalism-input w-full font-bold"
                      value={formData.ampm}
                      onChange={(e) => setFormData({ ...formData, ampm: e.target.value })}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-black uppercase text-sm mb-2">Notes</label>
                  <textarea 
                    className="neubrutalism-input w-full h-24 resize-none"
                    placeholder="Symptoms, mood, etc..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingLog(null);
                    }}
                    className="neubrutalism-button flex-1 bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="neubrutalism-button flex-1 bg-sandel text-black"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
