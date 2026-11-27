import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import apiClient from '../api/apiClient';

const TripPlannerList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = ['All', 'Scheduled', 'In transit', 'Completed', 'Unallocated'];

  const fetchTrips = () => {
    apiClient.get('/trips')
      .then(res => {
        const formatted = res.data.map(trip => ({
          id: trip.code,
          origin: trip.stops?.[0]?.store?.name || 'Unknown Origin',
          dest: trip.stops?.[trip.stops.length - 1]?.store?.name || 'Unknown Destination',
          stops: trip.stops?.length || 0,
          load: trip.load ? `${trip.load.toLocaleString()} units` : '-',
          status: trip.status || 'Scheduled',
          date: new Date(trip.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        }));
        setTrips(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load trips", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Update Status Function
  const handleStatusChange = async (tripId, newStatus) => {
    try {
      await apiClient.patch(`/trips/${tripId}`, { status: newStatus });
      fetchTrips(); 
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const filteredTrips = activeTab === 'All' ? trips : trips.filter(t => t.status === activeTab);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading trips...</div>;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trips</div>
          <h1 className="text-2xl font-bold text-gray-900">Trip History</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all transportation routes</p>
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
                <th className="px-5 py-3 font-medium border-b border-gray-200">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{trip.id}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.origin}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.dest}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.stops}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium text-right">{trip.load}</td>
                  <td className="px-5 py-3 text-gray-700">{trip.date}</td>
                  
                  <td className="px-5 py-3">
                    <select 
                      value={trip.status} 
                      onChange={(e) => handleStatusChange(trip.id, e.target.value)}
                      className={`px-2 py-1 rounded text-[12px] font-bold border outline-none cursor-pointer ${
                        trip.status === 'Scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        trip.status === 'In transit' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        trip.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In transit">In transit</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-gray-500 text-sm">No trip plans found.</td>
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