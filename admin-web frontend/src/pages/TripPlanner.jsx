import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OverrideModal from '../components/trip/OverrideModal';
import { createTrip } from '../api/tripApi';
import { getBookings } from '../api/bookingApi';
import { getVehicles } from '../api/vehicleApi';

const pad = (n) => String(n).padStart(2, '0');

const toLocalDateStr = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDatePill = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const formatBookingTime = (value) => {
  if (!value) return 'No time set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'No time set';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TripPlanner = () => {
  const navigate = useNavigate();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [allocatedVehicle, setAllocatedVehicle] = useState(null);
  const [overrideVehicleData, setOverrideVehicleData] = useState(null);

  const [dbBookings, setDbBookings] = useState([]);
  const [dbVehicles, setDbVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispatch date & time chosen by the admin
  const [planDate, setPlanDate] = useState(() => toLocalDateStr(new Date()));
  const [planTime, setPlanTime] = useState('08:00');
  const [filterByDate, setFilterByDate] = useState(true);

  // Smart Vehicle Allocation search & filters
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [onlyWithDriver, setOnlyWithDriver] = useState(false);
  const [onlyFitsLoad, setOnlyFitsLoad] = useState(false);

  const [stops, setStops] = useState([
    { id: 1, type: 'Pickup', location: '', selectedBookings: [] },
    { id: 2, type: 'Delivery', location: '', selectedBookings: [] }
  ]);

  // Fetch real data using API modules
  useEffect(() => {
    Promise.all([getBookings(), getVehicles()])
      .then(([bookingRes, vehicleRes]) => {
        // 1. Format Approved Bookings with requestedFor date/time
        const formattedBookings = (bookingRes.bookings || bookingRes)
          .filter((b) => b.status === 'Approved')
          .map((b) => ({
            id: b.id,
            pickup: b.pickup,
            dest: b.destination,
            items: b.items?.map((i) => i.item).join(', ') || '',
            qty: `${b.units} units`,
            weight: b.units,
            priority: b.priority,
            requestedFor: b.requestedFor || null,
            requestedDate: b.requestedFor ? toLocalDateStr(b.requestedFor) : '',
          }));
        setDbBookings(formattedBookings);

        // If today has no approved bookings, auto-select the earliest date that has one
        const todayStr = toLocalDateStr(new Date());
        const bookingDates = [...new Set(formattedBookings.map((b) => b.requestedDate).filter(Boolean))].sort();
        if (bookingDates.length > 0 && !bookingDates.includes(todayStr)) {
          setPlanDate(bookingDates[0]);
        }

        // 2. Format Vehicles safely
        const formattedVehicles = (vehicleRes.data || vehicleRes).map((v) => ({
          id: v.plate,
          type: v.type || 'Vehicle',
          driver: v.driver || 'Unassigned',
          hasDriver: Boolean(v.driver && v.driver !== 'Unassigned'),
          loc: v.hub || 'Unknown',
          maxWeight: parseInt(String(v.capacity ?? '').replace(/[^\d]/g, ''), 10) || 5000,
        }));
        setDbVehicles(formattedVehicles);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown-container')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group counts of approved bookings by requestedDate for quick-select pills
  const availableDateCounts = useMemo(() => {
    const counts = {};
    dbBookings.forEach((b) => {
      if (!b.requestedDate) return;
      counts[b.requestedDate] = (counts[b.requestedDate] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  }, [dbBookings]);

  // Bookings available to pick based on the selected date filter
  const visibleBookings = useMemo(() => {
    if (!filterByDate || !planDate) return dbBookings;
    return dbBookings.filter((b) => b.requestedDate === planDate);
  }, [dbBookings, filterByDate, planDate]);

  const allSelectedIds = stops.flatMap((s) => (s.type === 'Pickup' ? s.selectedBookings : []));
  const activeBookings = dbBookings.filter((b) => allSelectedIds.includes(b.id));
  const totalWeight = activeBookings.reduce((sum, b) => sum + b.weight, 0);
  const pendingDestinations = [...new Set(activeBookings.map((b) => b.dest))];

  // Keep locations populated from visible bookings (falling back to all bookings + selected stop locations)
  const LOCATIONS = useMemo(() => {
    const source = visibleBookings.length > 0 ? visibleBookings : dbBookings;
    const set = new Set([
      ...source.map((b) => b.pickup),
      ...source.map((b) => b.dest),
      ...stops.map((s) => s.location).filter(Boolean),
    ]);
    return [...set].sort();
  }, [visibleBookings, dbBookings, stops]);

  // Earliest requestedFor among selected bookings (shown in Required By KPI card)
  const requiredByText = useMemo(() => {
    const times = activeBookings
      .map((b) => (b.requestedFor ? new Date(b.requestedFor).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    if (times.length > 0) return formatBookingTime(new Date(Math.min(...times)));
    return planDate ? `${formatDatePill(planDate)}, ${planTime}` : 'Immediate';
  }, [activeBookings, planDate, planTime]);

  const vehicleTypes = useMemo(() => {
    return ['All', ...new Set(dbVehicles.map((v) => v.type).filter(Boolean))];
  }, [dbVehicles]);

  const vehicles = useMemo(() => {
    return dbVehicles
      .map((v) => {
        let matchScore = 100;
        let matchLabel = '';
        let matchColor = '';
        let message = '';
        let disabled = false;

        if (totalWeight === 0) {
          matchScore = v.hasDriver ? 70 : 60;
          matchLabel = 'Available';
          matchColor = 'bg-slate-100 text-slate-700';
          message = 'Select bookings to calculate capacity fit.';
        } else if (totalWeight > v.maxWeight) {
          matchScore = 30;
          matchLabel = 'Over Capacity';
          matchColor = 'bg-red-100 text-red-700';
          message = `Needs ${totalWeight.toLocaleString()} units (exceeds by ${(totalWeight - v.maxWeight).toLocaleString()}).`;
          disabled = true;
        } else {
          const util = (totalWeight / v.maxWeight) * 100;
          if (util > 75) {
            matchScore = 98;
            matchLabel = '98% Match';
            matchColor = 'bg-green-100 text-green-700';
            message = `Optimal usage (${Math.round(util)}%).`;
          } else if (util > 40) {
            matchScore = 85;
            matchLabel = '85% Match';
            matchColor = 'bg-yellow-100 text-yellow-800';
            message = `Moderate usage (${Math.round(util)}%).`;
          } else {
            matchScore = 60;
            matchLabel = '60% Match';
            matchColor = 'bg-gray-100 text-gray-700';
            message = `Underutilized (${Math.round(util)}%).`;
          }
        }

        const firstStopLoc = stops.find((s) => s.type === 'Pickup')?.location;
        if (totalWeight > 0 && firstStopLoc && v.loc !== firstStopLoc && !disabled) {
          matchScore -= 15;
          matchLabel = `${matchScore}% Match`;
          message += ` Deadhead from ${v.loc}.`;
          if (matchScore < 90) matchColor = 'bg-yellow-100 text-yellow-800';
        }

        return { ...v, matchScore, matchLabel, matchColor, message, disabled };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        if (a.hasDriver !== b.hasDriver) return a.hasDriver ? -1 : 1;
        return a.id.localeCompare(b.id);
      });
  }, [totalWeight, stops, dbVehicles]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (vehicleTypeFilter !== 'All' && v.type !== vehicleTypeFilter) return false;
      if (onlyWithDriver && !v.hasDriver) return false;
      if (onlyFitsLoad && v.disabled) return false;
      if (!q) return true;
      return `${v.id} ${v.type} ${v.driver} ${v.loc}`.toLowerCase().includes(q);
    });
  }, [vehicles, vehicleSearch, vehicleTypeFilter, onlyWithDriver, onlyFitsLoad]);

  const selectedVehicleObj = useMemo(
    () => vehicles.find((v) => v.id === allocatedVehicle) || null,
    [vehicles, allocatedVehicle]
  );

  const handleAddStop = () => {
    const newId = stops.length > 0 ? Math.max(...stops.map((s) => s.id)) + 1 : 1;
    const nextUnmappedDest = pendingDestinations.find(
      (dest) => !stops.some((s) => s.type === 'Delivery' && s.location === dest)
    );
    setStops([
      ...stops,
      {
        id: newId,
        type: nextUnmappedDest ? 'Delivery' : 'Pickup',
        location: nextUnmappedDest || '',
        selectedBookings: [],
      },
    ]);
  };

  const updateStop = (id, key, value) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, [key]: value, selectedBookings: [] } : s)));
  };

  const toggleBooking = (stopId, bookingId) => {
    setStops(
      stops.map((s) => {
        if (s.id === stopId) {
          const isSelected = s.selectedBookings.includes(bookingId);
          const newBookings = isSelected
            ? s.selectedBookings.filter((id) => id !== bookingId)
            : [...s.selectedBookings, bookingId];
          return { ...s, selectedBookings: newBookings };
        }
        return s;
      })
    );
  };

  const handleFinalConfirm = async () => {
    if (!planDate || !planTime) return alert('Validation Error: Please select a dispatch date and time.');
    if (stops.some((s) => !s.location)) return alert('Validation Error: Please select a location for all stops.');
    if (stops.some((s) => s.type === 'Pickup' && s.selectedBookings.length === 0)) {
      return alert('Validation Error: You have a Pickup stop with no bookings selected.');
    }
    if (!allocatedVehicle) return alert('Validation Error: Please allocate a vehicle or use Manual Override first.');

    let runningInventory = 0;
    for (let stop of stops) {
      if (stop.type === 'Pickup') {
        const load = activeBookings
          .filter((b) => stop.selectedBookings.includes(b.id))
          .reduce((sum, b) => sum + b.weight, 0);
        runningInventory += load;
      } else {
        const drop = activeBookings
          .filter((b) => b.dest === stop.location)
          .reduce((sum, b) => sum + b.weight, 0);
        runningInventory -= drop;
      }
      if (runningInventory < 0) {
        return alert('Validation Error: Route sequence invalid. Dropping off before pickup.');
      }
    }

    const scheduledAt = new Date(`${planDate}T${planTime}:00`).toISOString();

    try {
      await createTrip({
        vehiclePlate: allocatedVehicle,
        bookings: allSelectedIds,
        stops: stops.map((s, index) => ({
          storeName: s.location,
          sequence: index + 1,
          type: s.type,
        })),
        load: totalWeight,
        scheduledAt,
      });
      alert(`Success! Route confirmed for ${formatDatePill(planDate)} at ${planTime} with vehicle ${allocatedVehicle}.`);
      navigate('/trips');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create trip.');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading planner data...</div>;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      <div className="flex justify-between items-start mb-5 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning / New</div>
          <h1 className="text-2xl font-bold text-gray-900">Unified Route & Allocation</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/trips')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Dispatch Schedule & Booking Date Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="plan-date" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Dispatch Date
            </label>
            <input
              id="plan-date"
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="plan-time" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Departure Time
            </label>
            <input
              id="plan-time"
              type="time"
              value={planTime}
              onChange={(e) => setPlanTime(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterByDate}
              onChange={(e) => setFilterByDate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Only show bookings for this date ({visibleBookings.length})</span>
          </label>
        </div>

        {/* Quick-jump pills for dates that have approved bookings */}
        {availableDateCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Dates with orders:</span>
            {availableDateCounts.map(([dateStr, count]) => (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  setPlanDate(dateStr);
                  setFilterByDate(true);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  planDate === dateStr && filterByDate
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {formatDatePill(dateStr)} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Payload</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-blue-600">{totalWeight.toLocaleString()}</span>
            <span className="text-sm text-gray-500 ml-1">units</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Bookings</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">{activeBookings.length}</span>
            <span className="text-sm text-gray-500 ml-1">Orders</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Stops</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">{stops.length} Stops</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required By</p>
          <div className="mt-1 text-lg font-bold text-gray-900">{requiredByText}</div>
        </div>
      </div>

      <div className="flex gap-6 items-start pb-10">
        {/* Left: Dynamic Stop Sequence */}
        <div className="w-1/2 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Dynamic Stop Sequence</h2>
              <button
                onClick={handleAddStop}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200"
              >
                <span>+</span> Add Stop
              </button>
            </div>

            <div className="p-6">
              {stops.map((stop, index) => {
                const isLast = index === stops.length - 1;
                const isPickup = stop.type === 'Pickup';

                const availableHere = visibleBookings.filter((b) => b.pickup === stop.location);
                const selectableBookings = availableHere.filter(
                  (b) => !allSelectedIds.includes(b.id) || stop.selectedBookings.includes(b.id)
                );

                const droppingHere = activeBookings.filter((b) => b.dest === stop.location);

                return (
                  <div key={stop.id} className={`flex gap-4 relative ${!isLast ? 'pb-8' : ''}`}>
                    {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>}

                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm z-10 bg-white ${
                        isPickup ? 'border-blue-500 text-blue-600' : 'border-orange-500 text-orange-600'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 rounded-lg p-4 relative border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                      {index > 0 && (
                        <button
                          onClick={() => setStops(stops.filter((s) => s.id !== stop.id))}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      <div className="flex gap-3 mb-4 pr-8">
                        <select
                          value={stop.type}
                          onChange={(e) => updateStop(stop.id, 'type', e.target.value)}
                          className="px-2 py-1.5 border border-gray-200 rounded text-xs font-bold uppercase bg-gray-50 text-gray-700 outline-none focus:border-blue-500"
                        >
                          <option value="Pickup">Pickup</option>
                          <option value="Delivery">Delivery</option>
                        </select>
                        <select
                          value={stop.location}
                          onChange={(e) => updateStop(stop.id, 'location', e.target.value)}
                          className={`flex-1 px-3 py-1.5 border rounded text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            !stop.location ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-900'
                          }`}
                        >
                          <option value="" disabled>
                            Select Location...
                          </option>
                          {LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      {isPickup && stop.location && (
                        <div className="custom-dropdown-container">
                          <div className="space-y-2 mb-3">
                            {stop.selectedBookings.map((bkId) => {
                              const b = dbBookings.find((x) => x.id === bkId);
                              if (!b) return null;
                              const dateMismatch = b.requestedDate && planDate && b.requestedDate !== planDate;
                              return (
                                <div key={b.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-md text-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-blue-700">{b.id}</span>
                                      {dateMismatch && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                          Requested {formatDatePill(b.requestedDate)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-gray-900">{b.weight.toLocaleString()} units</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    {b.pickup} <span className="mx-1">→</span>{' '}
                                    <span className="font-medium text-gray-800">{b.dest}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    Requested for:{' '}
                                    <span className="font-medium text-gray-700">{formatBookingTime(b.requestedFor)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)}
                              className={`text-xs font-semibold px-3 py-2 rounded w-full text-left flex justify-between items-center transition-colors ${
                                stop.selectedBookings.length === 0
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              + Select Bookings to Load <span>▾</span>
                            </button>
                            {openDropdownId === stop.id && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                                {selectableBookings.length === 0 ? (
                                  <div className="p-4 text-xs text-gray-500 text-center">
                                    {filterByDate
                                      ? `No approved bookings from this store on ${formatDatePill(planDate)}.`
                                      : 'No approved bookings from this location.'}
                                  </div>
                                ) : (
                                  selectableBookings.map((b) => (
                                    <div
                                      key={b.id}
                                      onClick={() => toggleBooking(stop.id, b.id)}
                                      className="px-4 py-3 hover:bg-blue-50 border-b border-gray-50 flex items-start gap-3 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={stop.selectedBookings.includes(b.id)}
                                        readOnly
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                          <span className="font-semibold text-sm text-gray-900">
                                            {b.id}{' '}
                                            <span className="font-normal text-gray-500 ml-1">({b.weight} units)</span>
                                          </span>
                                          <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                            {formatBookingTime(b.requestedFor)}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">To: {b.dest}</div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!isPickup && stop.location && (
                        <div className="bg-orange-50/30 border border-orange-100 rounded-md p-4">
                          {droppingHere.length === 0 ? (
                            <p className="text-xs text-gray-500">No loaded bookings are destined for this location yet.</p>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-orange-800 uppercase mb-2">Automated Unloading</p>
                              <ul className="space-y-2">
                                {droppingHere.map((b) => (
                                  <li
                                    key={b.id}
                                    className="text-sm flex justify-between items-center border-b border-orange-100 pb-2 last:border-0 last:pb-0"
                                  >
                                    <div>
                                      <span className="font-semibold text-gray-900">{b.id}</span>
                                      <span className="ml-2 text-xs text-gray-500">
                                        ({formatBookingTime(b.requestedFor)})
                                      </span>
                                    </div>
                                    <span className="font-medium text-orange-600">-{b.weight.toLocaleString()} units</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Compact, Searchable Smart Vehicle Allocation */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col p-5">
            <div className="flex justify-between items-start gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-gray-800">Smart Vehicle Allocation</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {filteredVehicles.length} of {vehicles.length} vehicles · ranked by payload &amp; driver
                </p>
              </div>
              {selectedVehicleObj && (
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Selected: {selectedVehicleObj.id}
                </span>
              )}
            </div>

            {/* Search & Filter Controls */}
            <div className="space-y-2 pb-3 mb-3 border-b border-gray-100">
              <div className="flex gap-2">
                <input
                  type="search"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Search plate, type, or driver..."
                  className="h-9 flex-1 rounded-md border border-gray-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-gray-200 bg-slate-50 px-2.5 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {vehicleTypes.map((t) => (
                    <option key={t} value={t}>
                      {t === 'All' ? 'All types' : t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyWithDriver((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    onlyWithDriver
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  Has driver
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyFitsLoad((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    onlyFitsLoad
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  Fits payload
                </button>
                {(vehicleSearch || vehicleTypeFilter !== 'All' || onlyWithDriver || onlyFitsLoad) && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearch('');
                      setVehicleTypeFilter('All');
                      setOnlyWithDriver(false);
                      setOnlyFitsLoad(false);
                    }}
                    className="ml-auto text-xs font-medium text-blue-600 hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {/* Bounded Scrollable Compact Vehicle List */}
            <div className="max-h-[440px] overflow-y-auto pr-1 flex flex-col gap-2 mb-4">
              {filteredVehicles.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg">
                  No vehicles match your filter. Try clearing the search or toggles.
                </div>
              ) : (
                filteredVehicles.map((v) => {
                  const isSelected = allocatedVehicle === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`border rounded-lg px-3.5 py-2.5 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                          : v.disabled
                          ? 'border-red-100 bg-red-50/20 opacity-85'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">{v.id}</span>
                            <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{v.type}</span>
                            <span className={`font-semibold text-[11px] px-2 py-0.5 rounded ${v.matchColor}`}>
                              {v.matchLabel}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-600">
                            <span>
                              Driver:{' '}
                              <span className={v.hasDriver ? 'font-medium text-gray-800' : 'text-gray-400'}>
                                {v.driver}
                              </span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className={`font-semibold ${v.disabled ? 'text-red-600' : 'text-gray-800'}`}>
                              {v.maxWeight.toLocaleString()} units
                            </span>
                          </div>
                          <p className={`mt-0.5 text-[11px] truncate ${v.disabled ? 'text-red-600' : 'text-gray-500'}`}>
                            {v.message}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <button
                              type="button"
                              onClick={() => setAllocatedVehicle(null)}
                              className="px-3 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded border border-green-200 hover:bg-green-200"
                            >
                              Allocated ✓
                            </button>
                          ) : v.disabled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOverrideVehicleData(v);
                                setIsOverrideModalOpen(true);
                              }}
                              className="px-3 py-1.5 font-medium text-xs rounded bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                            >
                              Force
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAllocatedVehicle(v.id)}
                              className="px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium text-xs rounded shadow-xs"
                            >
                              Allocate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pinned Selected Summary + Confirm Button */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              {selectedVehicleObj && (
                <div className="flex items-center justify-between rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs">
                  <div className="text-blue-900">
                    <span className="font-bold">{selectedVehicleObj.id}</span> ({selectedVehicleObj.type}) ·{' '}
                    {selectedVehicleObj.driver} · {selectedVehicleObj.maxWeight.toLocaleString()} units
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllocatedVehicle(null)}
                    className="font-semibold text-blue-700 hover:underline ml-2"
                  >
                    Clear
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleFinalConfirm}
                className={`px-8 py-2.5 rounded-md text-sm font-bold shadow-md transition-colors w-full ${
                  allocatedVehicle
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm Route &amp; Dispatch
              </button>
            </div>
          </div>
        </div>
      </div>

      <OverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onConfirm={(reason) => {
          setAllocatedVehicle(overrideVehicleData.id);
          alert(`Override logged. Reason: "${reason}"`);
          setIsOverrideModalOpen(false);
        }}
        vehicle={overrideVehicleData}
      />
    </div>
  );
};

export default TripPlanner;