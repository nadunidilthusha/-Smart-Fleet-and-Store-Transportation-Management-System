import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function TripProgressList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");

  // 4 Rich Dummy Trips for testing different statuses
  const defaultDummyTrips = [
    { id: 'TR-0412', ref: 'BK-1104-0088', vehicle: 'WP-CA-5582 (5T Truck)', origin: 'Main Store - Biyagama', dest: 'Store 3 - Kandy', eta: '14:30 PM', status: 'In Transit', progress: '75%' },
    { id: 'TR-0415', ref: 'BK-1104-0095', vehicle: 'SP-DA-6744 (10T Truck)', origin: 'Ja-Ela Hub', dest: 'Store 3 - Kandy', eta: '16:00 PM', status: 'Dispatched', progress: '25%' },
    { id: 'TR-0420', ref: 'BK-1104-0102', vehicle: 'WP-AB-1234 (10T Truck)', origin: 'Main Store - Biyagama', dest: 'Galle Regional', eta: '18:15 PM', status: 'In Transit', progress: '50%' },
    { id: 'TR-0398', ref: 'BK-1103-0041', vehicle: 'WP-XY-9988 (3T Lorry)', origin: 'Colombo Central', dest: 'Store 3 - Kandy', eta: 'Delivered', status: 'Arrived', progress: '100%' }
  ];

  const [trips, setTrips] = useState(() => {
    const saved = localStorage.getItem('store_inbound_trips');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    localStorage.setItem('store_inbound_trips', JSON.stringify(defaultDummyTrips));
    return defaultDummyTrips;
  });

  useEffect(() => {
    localStorage.setItem('store_inbound_trips', JSON.stringify(trips));
  }, [trips]);

  const filtered = trips.filter(t => {
    const matchesTab = statusTab === 'All' || t.status === statusTab;
    const matchesSearch = t.id.toLowerCase().includes(search.toLowerCase()) || t.ref.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbound Shipments & Trip Progress</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor live GPS tracking, delivery timelines, and confirm item receipts.</p>
        </div>
        <button 
          onClick={() => {
            localStorage.setItem('store_inbound_trips', JSON.stringify(defaultDummyTrips));
            setTrips(defaultDummyTrips);
          }}
          className="px-3 py-1.5 bg-white border border-slate-300 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
        >
          🔄 Reset Dummy Data
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        {/* Tabs & Search */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            {['All', 'In Transit', 'Dispatched', 'Arrived'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  statusTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Trip ID or Booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Trip ID</th>
                <th className="px-6 py-3">Booking Ref</th>
                <th className="px-6 py-3">Assigned Vehicle</th>
                <th className="px-6 py-3">Route</th>
                <th className="px-6 py-3">Estimated Arrival</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => navigate(`/trip-progress/${t.id}`)}>
                  <td className="px-6 py-4 font-bold text-blue-600">{t.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{t.ref}</td>
                  <td className="px-6 py-4 text-slate-600">{t.vehicle}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{t.origin} <ArrowRight size={12} className="inline mx-1" /> {t.dest}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{t.eta}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      t.status === 'In Transit' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      t.status === 'Dispatched' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/trip-progress/${t.id}`); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors">
                      Track Live →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}