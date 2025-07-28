import React, { useEffect, useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function CalendarView({ licenses }) {
  const [licenseMap, setLicenseMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const map = {};
    licenses.forEach((license) => {
      if (license.expiryDate) {
        const dateKey = new Date(license.expiryDate).toDateString();
        const daysLeft = (new Date(license.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);

        let risk = 'safe';
        if (daysLeft <= 30) risk = 'soon';
        else if (daysLeft <= 60) risk = 'attention';

        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push({
          licenseKey: license.licenseKey,
          product: license.product?.name || 'Unknown',
          risk,
          expiryDate: license.expiryDate,
          notes: license.notes,
          status: license.status,
          autoRenew: license.autoRenew,
          clientProject: license.clientProject,
        });
      }
    });
    setLicenseMap(map);
  }, [licenses]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDayClass = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = date.toDateString();
    const today = new Date().toDateString();
    
    let classes = 'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105';
    
    if (key === today) {
      classes += ' bg-blue-500 text-white shadow-lg';
    } else if (licenseMap[key]) {
      const risks = licenseMap[key].map(l => l.risk);
      if (risks.includes('soon')) {
        classes += ' bg-red-100 text-red-800 border-2 border-red-300 shadow-md hover:bg-red-200';
      } else if (risks.includes('attention')) {
        classes += ' bg-yellow-100 text-yellow-800 border-2 border-yellow-300 shadow-md hover:bg-yellow-200';
      } else {
        classes += ' bg-green-100 text-green-800 border-2 border-green-300 shadow-md hover:bg-green-200';
      }
    } else {
      classes += ' text-gray-600 hover:bg-gray-100';
    }
    
    return classes;
  };

  const onDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = date.toDateString();
    if (licenseMap[key]) {
      setSelectedDate(key);
    } else {
      setSelectedDate(null);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <div
          key={day}
          className={getDayClass(day)}
          onClick={() => onDateClick(day)}
        >
          {day}
        </div>
      );
    }
    
    return days;
  };

  const renderLicenseDetails = () => {
    if (!selectedDate) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Calendar className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Select a date</p>
          <p className="text-sm text-center">Click on a highlighted date to view license details</p>
        </div>
      );
    }

    const items = licenseMap[selectedDate];
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Clock className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No licenses expiring</p>
          <p className="text-sm">No licenses expire on this date</p>
        </div>
      );
    }

    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">License Details</h3>
            <p className="text-sm text-gray-600 mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {items.map((license, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{license.product}</h4>
                  <p className="text-sm text-gray-500 mt-1">{license.licenseKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  {license.risk === 'soon' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Critical
                    </span>
                  )}
                  {license.risk === 'attention' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Warning
                    </span>
                  )}
                  {license.risk === 'safe' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Safe
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Expiry Date</p>
                  <p className="font-medium text-gray-900">{new Date(license.expiryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Status</p>
                  <p className="font-medium text-gray-900">{license.status}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Auto Renew</p>
                  <p className="font-medium text-gray-900">{license.autoRenew ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Client/Project</p>
                  <p className="font-medium text-gray-900">{license.clientProject || '-'}</p>
                </div>
              </div>
              
              {license.notes && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">Notes</p>
                  <p className="text-gray-700 text-sm">{license.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              License Renewal Calendar
            </h1>
            <p className="text-blue-100 mt-2">Track and manage your software license renewals</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar Section */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">{formatDate(currentDate)}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors duration-200 shadow-sm"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors duration-200 shadow-sm"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Levels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                      <span className="text-sm font-medium text-gray-700">Critical - Expires within 30 days</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
                      <span className="text-sm font-medium text-gray-700">Warning - Expires within 60 days</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
                      <span className="text-sm font-medium text-gray-700">Safe - More than 60 days remaining</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                      <span className="text-sm font-medium text-gray-700">Today</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* License Details Section */}
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                {renderLicenseDetails()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}