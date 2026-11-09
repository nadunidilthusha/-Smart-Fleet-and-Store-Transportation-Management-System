import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const TripPlannerList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Draft', 'Pending Allocation', 'Allocated'];
  
  const dummyTrips = [
    { id: 'TR-0450', origin: 'Main Store - Biyagama', dest: 'Kandy Regional Store', stops: 3, load: '6,500 kg', status: 'Pending Allocation', date: '05 Nov, 2026' },
    { id: 'TR-0449', origin: 'Ja-Ela Hub', dest: 'Colombo Central', stops: 2, load: '3,200 kg', status: 'Allocated', date: '04 Nov, 2026' },
    { id: 'TR-0451', origin: 'Main Store - Biyagama', dest: 'Galle Distribution', stops: 4, load: '-', status: 'Draft', date: '05 Nov, 2026' }
  ];

  const filteredTrips = activeTab === 'All' ? dummyTrips : dummyTrips.filter(t => t.status === activeTab);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning</div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and create multi-stop transportation routes</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/trip-planner/new")}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus size={15} strokeWidth={2} /> Create Trip Plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="flex gap-5 border-b border-gray-200 px-5 pt-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 text-[13px]">
              <tr>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Trip ID</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Origin</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Final Destination</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Stops</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200 text-right">Total Load</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Date</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(trip.status === 'Draft' ? '/trip-planner/new' : '/allocation')}>
                  <td className="px-5 py-3 font-medium text-gray-900">{trip.id}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.origin}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.dest}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.stops}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium text-right">{trip.load}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.date}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide ${
                      trip.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                      trip.status === 'Pending Allocation' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {trip.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-gray-500 text-sm">No trip plans found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerList;