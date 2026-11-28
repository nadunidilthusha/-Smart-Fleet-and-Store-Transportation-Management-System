import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import apiClient from '../api/apiClient';

const pad = (n) => String(n).padStart(2, '0');

const formatDateOnly = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDispatchDate = (trip) => {
  if (trip.scheduledAt) return formatDateTime(trip.scheduledAt);
  const bookingTimes = (trip.bookings ?? [])
    .map((b) => (b?.requestedFor ? new Date(b.requestedFor).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  if (bookingTimes.length > 0) return formatDateTime(new Date(Math.min(...bookingTimes)));
  return null;
};

const TABS = ['All', 'Scheduled', 'In transit', 'Completed', 'Drafts'];

const TripPlannerList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'All';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = () => {
    apiClient
      .get('/trips')
      .then((res) => {
        const formatted = res.data
          .filter((trip) => trip.status !== 'Unallocated')
          .map((trip) => {
            const sortedStops = [...(trip.stops ?? [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
            const origin = sortedStops[0]?.store?.name || 'Not set';

            // Collect all Delivery stops; for older trips without stop.type, use all stops after origin
            const deliveryStops = sortedStops.filter((s) => s.type === 'Delivery');
            const destStops = deliveryStops.length > 0 ? deliveryStops : sortedStops.slice(1);
            const destinations = [...new Set(destStops.map((s) => s.store?.name).filter(Boolean))];

            return {
              id: trip.code,
              bookingCodes: (trip.bookings ?? [])
                .map((b) => (typeof b === 'string' ? b : b?.code))
                .filter(Boolean),
              origin,
              destinations,
              routeSummary: trip.route || [origin, ...destinations].join(' → '),
              stops: sortedStops.length,
              load: trip.load ? `${trip.load.toLocaleString()} units` : '-',
              status: trip.status || 'Scheduled',
              dispatchDate: getDispatchDate(trip),
              createdDate: formatDateOnly(trip.createdAt),
            };
          });
        setTrips(formatted);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load trips', err);
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
      alert('Failed to update status');
    }
  };

  const draftCount = trips.filter((t) => t.status === 'Draft').length;

  const filteredTrips =
    activeTab === 'All'
      ? trips
      : activeTab === 'Drafts'
      ? trips.filter((t) => t.status === 'Draft')
      : trips.filter((t) => t.status === activeTab);

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
          onClick={() => navigate('/trip-planner/new')}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus size={15} strokeWidth={2} /> Create Trip Plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="flex gap-5 border-b border-gray-200 px-5 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'border-blue-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>{tab}</span>
              {tab === 'Drafts' && draftCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                  {draftCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 text-[13px]">
              <tr>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Trip ID</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Booking IDs</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Origin</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Destinations</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Stops</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200 text-right">Total Load</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Dispatch Date</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Created</th>
                <th className="px-5 py-3 font-medium border-b border-gray-200">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-5 py-3 font-medium text-gray-900">{trip.id}</td>
                  <td className="px-5 py-3">
                    {trip.bookingCodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[240px] whitespace-normal">
                        {trip.bookingCodes.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => navigate(`/bookings?booking=${encodeURIComponent(code)}`)}
                            className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{trip.origin}</td>
                  <td className="px-5 py-3" title={trip.routeSummary}>
                    {trip.destinations.length === 0 ? (
                      <span className="text-gray-400">Not set</span>
                    ) : trip.destinations.length === 1 ? (
                      <span className="text-gray-700">{trip.destinations[0]}</span>
                    ) : (
                      <div className="flex flex-col gap-1 max-w-[260px] whitespace-normal">
                        {trip.destinations.map((loc, idx) => {
                          const isFinal = idx === trip.destinations.length - 1;
                          return (
                            <div key={`${trip.id}-dest-${idx}`} className="flex items-center gap-1.5 text-xs">
                              <span
                                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isFinal
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className={isFinal ? 'font-medium text-gray-900' : 'text-gray-600'}>
                                {loc}
                              </span>
                              {isFinal && (
                                <span className="rounded bg-orange-50 px-1.5 py-0.2 text-[10px] font-semibold text-orange-700 border border-orange-200">
                                  Final
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{trip.stops}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium text-right">{trip.load}</td>
                  <td className="px-5 py-3">
                    {trip.dispatchDate ? (
                      <span className="font-medium text-blue-700">{trip.dispatchDate}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{trip.createdDate}</td>

                  <td className="px-5 py-3">
                    {trip.status === 'Draft' ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Draft
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/trip-planner/new?draft=${encodeURIComponent(trip.id)}`)}
                          className="px-2.5 py-1 rounded text-[12px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          Continue
                        </button>
                      </div>
                    ) : (
                      <select
                        value={trip.status}
                        onChange={(e) => handleStatusChange(trip.id, e.target.value)}
                        className={`px-2 py-1 rounded text-[12px] font-bold border outline-none cursor-pointer ${
                          trip.status === 'Scheduled'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : trip.status === 'In transit'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : trip.status === 'Completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="In transit">In transit</option>
                        <option value="Completed">Completed</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-5 py-8 text-center text-gray-500 text-sm">
                    {activeTab === 'Drafts' ? 'No saved drafts yet.' : 'No trip plans found.'}
                  </td>
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