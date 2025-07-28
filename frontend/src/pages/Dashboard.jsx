import React, { useEffect, useState } from 'react';
import CalendarView from '../components/CalendarView';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);

  // Product form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductTags, setNewProductTags] = useState('');

  // License form state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [usageLimits, setUsageLimits] = useState('');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');
  const [clientProject, setClientProject] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [searchText, setSearchText] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddLicense, setShowAddLicense] = useState(false);

  const totalLicenses = licenses.length;
  const activeCount = licenses.filter(l => l.status === 'Active').length;
  const expiredCount = licenses.filter(l => l.status === 'Expired').length;
  const expiringSoon = licenses.filter(l => {
    const daysLeft = (new Date(l.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 30 && l.status === 'Active';
  }).length;

  // Message state
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  const [editingLicenseId, setEditingLicenseId] = useState(null);
  const [editLicenseData, setEditLicenseData] = useState({
    licenseKey: '',
    expiryDate: '',
    autoRenew: false,
    usageLimits: '',
    status: 'Active',
    notes: '',
    clientProject: '',
    monthlyCost: '',
    annualCost: '',
  });

  const [monthlyCost, setMonthlyCost] = useState('');
  const [annualCost, setAnnualCost] = useState('');


  const monthlyCostSum = licenses.reduce((sum, lic) => sum + (lic.monthlyCost || 0), 0);
  const annualCostSum = licenses.reduce((sum, lic) => sum + (lic.annualCost || 0), 0);

  // For upcoming renewal costs (licenses expiring in next 30 days)
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingRenewalCost = licenses
    .filter(lic => new Date(lic.expiryDate) <= in30Days && lic.status === 'Active')
    .reduce((sum, lic) => sum + (lic.annualCost || 0), 0);


  useEffect(() => {
    fetchProducts();
    fetchLicenses();
  }, [filterStatus, filterTag, filterClient, searchText]);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchNotifications();
  }, []);

  async function markAsRead(id) {
    await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  function handleBellClick() {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      notifications
        .filter(n => !n.read)
        .forEach(n => markAsRead(n._id));
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function fetchLicenses() {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterTag) params.append('tag', filterTag);
      if (filterClient) params.append('clientProject', filterClient);
      if (searchText) params.append('search', searchText);

      const res = await fetch(`http://localhost:5000/api/licenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLicenses(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function getExpiryRiskLabel(expiryDate) {
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 60) return { label: 'Safe', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' };
    if (daysLeft > 30) return { label: 'Attention', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' };
    return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', icon: '🔴' };
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!newProductName.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProductName,
          tags: newProductTags.split(',').map(tag => tag.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add product');
      }

      setNewProductName('');
      setNewProductTags('');
      setShowAddProduct(false);
      setMessage('Product added successfully!');
      fetchProducts();
      fetchLicenses();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAddLicense(e) {
    e.preventDefault();
    if (!selectedProduct || !licenseKey || !expiryDate) {
      setMessage('Please fill required fields for license.');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: selectedProduct,
          licenseKey,
          expiryDate,
          autoRenew,
          usageLimits,
          status,
          notes,
          clientProject,
          monthlyCost: monthlyCost ? parseFloat(monthlyCost) : 0,
          annualCost: annualCost ? parseFloat(annualCost) : 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add license');
      }
      // Reset form states
      setSelectedProduct('');
      setLicenseKey('');
      setExpiryDate('');
      setAutoRenew(false);
      setUsageLimits('');
      setStatus('Active');
      setNotes('');
      setClientProject('');
      setMonthlyCost('');
      setAnnualCost('');
      setShowAddLicense(false);
      setMessage('License added successfully!');
      fetchLicenses();
    } catch (error) {
      setMessage(error.message);
    }
  }


  function startEditing(license) {
    setEditingLicenseId(license._id);
    setEditLicenseData({
      licenseKey: license.licenseKey,
      expiryDate: license.expiryDate ? license.expiryDate.slice(0, 10) : '',
      autoRenew: license.autoRenew || false,
      usageLimits: license.usageLimits || '',
      status: license.status || 'Active',
      notes: license.notes || '',
      clientProject: license.clientProject || '',
      monthlyCost: license.monthlyCost || '',
      annualCost: license.annualCost || '',
      createdAt: license.createdAt || new Date().toISOString(),
    });
  }


  function handleEditChange(e) {
    const { name, value, type, checked } = e.target;
    setEditLicenseData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function updateLicense(id) {
    try {
      const res = await fetch(`http://localhost:5000/api/licenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editLicenseData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update license');
      }
      setEditingLicenseId(null);
      setMessage('License updated successfully!');
      fetchLicenses();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteLicense(id) {
    if (!window.confirm('Are you sure you want to delete this license?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/licenses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete license');
      }
      setMessage('License deleted successfully!');
      fetchLicenses();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const licensesByProduct = licenses.reduce((acc, license) => {
    const prodId = license.product?._id || 'unknown';
    if (!acc[prodId]) acc[prodId] = [];
    acc[prodId].push(license);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                License Tracker
              </h1>
              <p className="text-gray-600 text-sm">Manage your digital product licenses</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleBellClick}
                className="relative p-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-white/20"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-gray-500">No notifications</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {notifications.map(n => (
                        <li
                          key={n._id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            if (!n.read) markAsRead(n._id);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${!n.read ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                            <p className={`text-sm ${!n.read ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                              {n.message}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Licenses</p>
                <p className="text-3xl font-bold text-gray-800">{totalLicenses}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-emerald-600">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Expired</p>
                <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Expiring Soon</p>
                <p className="text-3xl font-bold text-amber-600">{expiringSoon}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded text-center">
            <p className="text-sm text-gray-600">Monthly Cost Estimate</p>
            <p className="text-xl font-bold">${monthlyCostSum.toFixed(2)}</p>
          </div>
          <div className="bg-green-100 p-4 rounded text-center">
            <p className="text-sm text-gray-600">Total Annual Spend</p>
            <p className="text-xl font-bold">${annualCostSum.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded text-center">
            <p className="text-sm text-gray-600">Upcoming Renewal (30 days)</p>
            <p className="text-xl font-bold">${upcomingRenewalCost.toFixed(2)}</p>
          </div>
        </div>


        {/* Calendar View */}
        <div className="mb-8">
          <CalendarView licenses={licenses} />
        </div>
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowAddProduct(!showAddProduct)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setShowAddLicense(!showAddLicense)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Add License</span>
          </button>
        </div>

        {/* Add Product Form */}
        {showAddProduct && (
          <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <input
                  type="text"
                  placeholder="Enter tags (comma separated)"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newProductTags}
                  onChange={e => setNewProductTags(e.target.value)}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add License Form */}
        {showAddLicense && (
          <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Add New License</h3>
            <form onSubmit={handleAddLicense} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((prod) => (
                      <option key={prod._id} value={prod._id}>{prod.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Key</label>
                  <input
                    type="text"
                    placeholder="Enter license key"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Renewed">Renewed</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1 text-gray-700">Costs</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monthly Cost (optional)"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={monthlyCost}
                      onChange={e => setMonthlyCost(parseFloat(e.target.value) || 0)}
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Annual Cost (optional)"
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={annualCost}
                      onChange={e => setAnnualCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limits</label>
                  <input
                    type="text"
                    placeholder="Enter usage limits (optional)"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={usageLimits}
                    onChange={e => setUsageLimits(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client/Project</label>
                  <input
                    type="text"
                    placeholder="Enter client/project (optional)"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={clientProject}
                    onChange={e => setClientProject(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  placeholder="Enter notes (optional)"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows="3"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={e => setAutoRenew(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto Renew</span>
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                >
                  Add License
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLicense(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Renewed">Renewed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
              <select
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Tags</option>
                {[...new Set(products.flatMap(p => p.tags || []))].map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client/Project</label>
              <input
                placeholder="Filter by client/project"
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                placeholder="Search licenses or notes"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Products & Licenses List */}
        <div className="space-y-8">
          {products.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 text-lg">No products yet. Add your first product to get started!</p>
            </div>
          )}

          {products.map((product) => (
            <div key={product._id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {product.tags?.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {licensesByProduct[product._id]?.length || 0} licenses
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {licensesByProduct[product._id]?.length ? (
                  <div className="space-y-4">
                    {licensesByProduct[product._id].map((license) => (
                      <div
                        key={license._id}
                        className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        {editingLicenseId === license._id ? (
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              updateLicense(license._id);
                            }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">License Key</label>
                                <input
                                  name="licenseKey"
                                  value={editLicenseData.licenseKey}
                                  onChange={handleEditChange}
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                <input
                                  name="expiryDate"
                                  type="date"
                                  value={editLicenseData.expiryDate}
                                  onChange={handleEditChange}
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  required
                                />
                              </div>
                              

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limits</label>
                                <input
                                  name="usageLimits"
                                  value={editLicenseData.usageLimits}
                                  onChange={handleEditChange}
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  placeholder="Usage Limits (optional)"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                  name="status"
                                  value={editLicenseData.status}
                                  onChange={handleEditChange}
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Expired">Expired</option>
                                  <option value="Renewed">Renewed</option>
                                </select>
                              </div>

                              <div className="mb-4">
                                <label className="block font-semibold mb-1 text-gray-700">Costs</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="monthlyCost"
                                    placeholder="Monthly Cost (optional)"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                    value={editLicenseData.monthlyCost}
                                    onChange={handleEditChange}
                                  />

                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="annualCost"
                                    placeholder="Annual Cost (optional)"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                    value={editLicenseData.annualCost}
                                    onChange={handleEditChange}
                                  />
                                </div>
                              </div>



                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Client/Project</label>
                                <input
                                  name="clientProject"
                                  value={editLicenseData.clientProject}
                                  onChange={handleEditChange}
                                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  placeholder="Client/Project (optional)"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                              <textarea
                                name="notes"
                                value={editLicenseData.notes}
                                onChange={handleEditChange}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Notes (optional)"
                                rows="3"
                              />
                            </div>
                            <div className="flex items-center space-x-3">
                              <label className="inline-flex items-center space-x-2">
                                <input
                                  name="autoRenew"
                                  type="checkbox"
                                  checked={editLicenseData.autoRenew}
                                  onChange={handleEditChange}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Auto Renew</span>
                              </label>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                type="submit"
                                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLicenseId(null)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-600 mb-1">License Key</p>
                                  <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded-lg">{license.licenseKey}</p>
                                </div>
                                {license.expiryDate && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Expiry Date</p>
                                    <div className="flex items-center space-x-2">
                                      <p className="text-lg font-semibold">{new Date(license.expiryDate).toLocaleDateString()}</p>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpiryRiskLabel(license.expiryDate).bg} ${getExpiryRiskLabel(license.expiryDate).color}`}>
                                        {getExpiryRiskLabel(license.expiryDate).icon} {getExpiryRiskLabel(license.expiryDate).label}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 mb-1">Status</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${license.status === 'Active' ? 'bg-green-100 text-green-800' :
                                    license.status === 'Expired' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                    {license.status}
                                  </span>
                                </div>
                                {license.clientProject && (
                                  <div>
                                    <p className="text-gray-600 mb-1">Client/Project</p>
                                    <p className="font-medium">{license.clientProject}</p>
                                  </div>
                                )}
                                {license.autoRenew && (
                                  <div>
                                    <p className="text-gray-600 mb-1">Auto Renew</p>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                      Enabled
                                    </span>
                                  </div>
                                )}
                              </div>
                              {license.notes && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                                  <p className="text-sm">{license.notes}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => startEditing(license)}
                                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors font-medium text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteLicense(license._id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No licenses for this product yet.</p>
                    <button
                      onClick={() => setShowAddLicense(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Add License
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}