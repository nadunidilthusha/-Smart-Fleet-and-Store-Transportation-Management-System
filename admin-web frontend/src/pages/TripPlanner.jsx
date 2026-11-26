import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OverrideModal from '../components/trip/OverrideModal';
import apiClient from '../api/apiClient';
import { createTrip } from '../api/tripApi';

const TripPlanner = () => {
  const navigate = useNavigate();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [allocatedVehicle, setAllocatedVehicle] = useState(null);
  const [overrideVehicleData, setOverrideVehicleData] = useState(null);

  // Real Database State
  const [dbBookings, setDbBookings] = useState([]);
  const [dbVehicles, setDbVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stops, setStops] = useState([
    { id: 1, type: 'Pickup', location: '', selectedBookings: [] },
    { id: 2, type: 'Delivery', location: '', selectedBookings: [] }
  ]);

  // Fetch real data on mount
  useEffect(() => {
    Promise.all([
      apiClient.get('/bookings'),
      apiClient.get('/vehicles')
    ]).then(([bookingRes, vehicleRes]) => {
      // 1. Format Bookings (Only Approved ones)
      const formattedBookings = bookingRes.data.bookings
        .filter(b => b.status === 'Approved')
        .map(b => ({
          id: b.id,
          pickup: b.pickup,
          dest: b.destination,
          items: b.items.map(i => i.item).join(', '),
          qty: `${b.units} units`,
          weight: b.units, // Treating units as weight for the UI capacity logic
          priority: b.priority
        }));
      setDbBookings(formattedBookings);

      // 2. Format Vehicles
      const formattedVehicles = vehicleRes.data.map(v => ({
        id: v.plate,
        type: v.type,
        driver: v.driver?.name || 'Unassigned',
        loc: v.hub?.name || 'Unknown',
        maxWeight: parseInt(v.capacity.replace(/,/g, '')) || 5000
      }));
      setDbVehicles(formattedVehicles);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load data", err);
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

  const allSelectedIds = stops.flatMap(s => s.type === 'Pickup' ? s.selectedBookings : []);
  const activeBookings = dbBookings.filter(b => allSelectedIds.includes(b.id));
  const totalWeight = activeBookings.reduce((sum, b) => sum + b.weight, 0);
  const pendingDestinations = [...new Set(activeBookings.map(b => b.dest))];
  const LOCATIONS = [...new Set(dbBookings.map(b => b.pickup).concat(dbBookings.map(b => b.dest)))];

  // Calculate vehicle match scores
  const vehicles = useMemo(() => {
    return dbVehicles.map(v => {
      let matchScore = 100;
      let matchLabel = "";
      let matchColor = "";
      let message = "";
      let disabled = false;

      if (totalWeight > v.maxWeight) {
        matchScore = 30;
        matchLabel = "Capacity Exceeded";
        matchColor = "bg-red-100 text-red-700";
        message = `Trip requires ${totalWeight.toLocaleString()} units.`;
        disabled = true;
      } else {
        const util = totalWeight === 0 ? 0 : (totalWeight / v.maxWeight) * 100;
        if (util > 75) {
          matchScore = 98;
          matchLabel = "98% Match";
          matchColor = "bg-green-100 text-green-700";
          message = `Optimal capacity usage (${Math.round(util)}%).`;
        } else if (util > 40) {
          matchScore = 85;
          matchLabel = "85% Match";
          matchColor = "bg-yellow-100 text-yellow-800";
          message = `Underutilized capacity (${Math.round(util)}%).`;
        } else {
          matchScore = 60;
          matchLabel = "60% Match";
          matchColor = "bg-gray-100 text-gray-700";
          message = `Highly underutilized (${Math.round(util)}%).`;
        }
      }

      const firstStopLoc = stops.find(s => s.type === 'Pickup')?.location;
      if (firstStopLoc && v.loc !== firstStopLoc && !disabled) {
        matchScore -= 15;
        matchLabel = `${matchScore}% Match`;
        message += ` Requires deadhead routing from ${v.loc}.`;
        if (matchScore < 90) matchColor = "bg-yellow-100 text-yellow-800";
      }

      return { ...v, matchScore, matchLabel, matchColor, message, disabled };
    }).sort((a,b) => b.matchScore - a.matchScore);
  }, [totalWeight, stops, dbVehicles]);

  const handleAddStop = () => {
    const newId = stops.length > 0 ? Math.max(...stops.map(s => s.id)) + 1 : 1;
    const nextUnmappedDest = pendingDestinations.find(dest => !stops.some(s => s.type === 'Delivery' && s.location === dest));
    setStops([...stops, { 
      id: newId, 
      type: nextUnmappedDest ? 'Delivery' : 'Pickup', 
      location: nextUnmappedDest || '', 
      selectedBookings: [] 
    }]);
  };

  const updateStop = (id, key, value) => {
    setStops(stops.map(s => s.id === id ? { ...s, [key]: value, selectedBookings: [] } : s));
  };

  const toggleBooking = (stopId, bookingId) => {
    setStops(stops.map(s => {
      if (s.id === stopId) {
        const isSelected = s.selectedBookings.includes(bookingId);
        const newBookings = isSelected 
          ? s.selectedBookings.filter(id => id !== bookingId) 
          : [...s.selectedBookings, bookingId];
        return { ...s, selectedBookings: newBookings };
      }
      return s;
    }));
  };

  const handleFinalConfirm = async () => {
    if (stops.some(s => !s.location)) return alert("Validation Error: Please select a location for all stops.");
    if (stops.some(s => s.type === 'Pickup' && s.selectedBookings.length === 0)) return alert("Validation Error: You have a Pickup stop with no bookings selected.");
    if (!allocatedVehicle) return alert("Validation Error: Please allocate a vehicle or use Manual Override first.");
    
    let runningInventory = 0;
    for (let stop of stops) {
      if (stop.type === 'Pickup') {
        const load = activeBookings.filter(b => stop.selectedBookings.includes(b.id)).reduce((sum, b) => sum + b.weight, 0);
        runningInventory += load;
      } else {
        const drop = activeBookings.filter(b => b.dest === stop.location).reduce((sum, b) => sum + b.weight, 0);
        runningInventory -= drop;
      }
      if (runningInventory < 0) return alert("Validation Error: Route sequence invalid. Dropping off before pickup.");
    }

    try {
      // Send to real backend
      await createTrip({
        vehiclePlate: allocatedVehicle,
        bookings: allSelectedIds,
        stops: stops.map((s, index) => ({
          storeName: s.location,
          sequence: index + 1,
          type: s.type
        })),
        load: totalWeight
      });
      alert(`Success! Route confirmed and vehicle ${allocatedVehicle} allocated.`);
      navigate('/trip-planner');
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create trip.");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading planner data...</div>;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning / New</div>
          <h1 className="text-2xl font-bold text-gray-900">Unified Route & Allocation</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/trip-planner')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">Cancel</button>
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Payload</p>
          <div className="mt-1"><span className="text-2xl font-bold text-blue-600">{totalWeight.toLocaleString()}</span><span className="text-sm text-gray-500 ml-1">units</span></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Bookings</p>
          <div className="mt-1"><span className="text-2xl font-bold text-gray-900">{activeBookings.length}</span><span className="text-sm text-gray-500 ml-1">Orders</span></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Stops</p>
          <div className="mt-1"><span className="text-2xl font-bold text-gray-900">{stops.length} Stops</span></div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required By</p>
          <div className="mt-1 text-lg font-bold text-gray-900">Immediate</div>
        </div>
      </div>

      <div className="flex gap-6 h-full pb-10">
        {/* LEFT COLUMN: DYNAMIC ROUTE PLANNER */}
        <div className="w-1/2 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Dynamic Stop Sequence</h2>
              <button onClick={handleAddStop} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                <span>+</span> Add Stop
              </button>
            </div>
            
            <div className="p-6">
              {stops.map((stop, index) => {
                const isLast = index === stops.length - 1;
                const isPickup = stop.type === 'Pickup';
                
                const availableHere = dbBookings.filter(b => b.pickup === stop.location);
                const unselectedHere = availableHere.filter(b => !allSelectedIds.includes(b.id) && !stop.selectedBookings.includes(b.id));
                const selectableBookings = availableHere.filter(b => !allSelectedIds.includes(b.id) || stop.selectedBookings.includes(b.id));
                
                const thisStopWeight = activeBookings.filter(b => stop.selectedBookings.includes(b.id)).reduce((s, b) => s + b.weight, 0);
                const droppingHere = activeBookings.filter(b => b.dest === stop.location);
                const dropWeight = droppingHere.reduce((s, b) => s + b.weight, 0);

                return (
                  <div key={stop.id} className={`flex gap-4 relative ${!isLast ? 'pb-8' : ''}`}>
                    {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>}
                    
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm z-10 bg-white ${isPickup ? 'border-blue-500 text-blue-600' : 'border-orange-500 text-orange-600'}`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 rounded-lg p-4 relative border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                      {index > 0 && (
                        <button onClick={() => setStops(stops.filter(s => s.id !== stop.id))} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}

                      <div className="flex gap-3 mb-4 pr-8">
                        <select value={stop.type} onChange={(e) => updateStop(stop.id, 'type', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs font-bold uppercase bg-gray-50 text-gray-700 outline-none focus:border-blue-500">
                          <option value="Pickup">Pickup</option>
                          <option value="Delivery">Delivery</option>
                        </select>
                        <select value={stop.location} onChange={(e) => updateStop(stop.id, 'location', e.target.value)} className={`flex-1 px-3 py-1.5 border rounded text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 ${!stop.location ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-900'}`}>
                          <option value="" disabled>Select Location...</option>
                          {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                      </div>

                      {isPickup && stop.location && (
                        <div className="custom-dropdown-container">
                          <div className="space-y-2 mb-3">
                            {stop.selectedBookings.map(bkId => {
                              const b = dbBookings.find(x => x.id === bkId);
                              if (!b) return null;
                              return (
                                <div key={b.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-md text-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-blue-700">{b.id}</span>
                                    <span className="font-bold text-gray-900">{b.weight.toLocaleString()} units</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">{b.pickup} <span className="mx-1">→</span> <span className="font-medium text-gray-800">{b.dest}</span></div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="relative">
                            <button onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)} className={`text-xs font-semibold px-3 py-2 rounded w-full text-left flex justify-between items-center transition-colors ${stop.selectedBookings.length === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              + Select Bookings to Load <span>▾</span>
                            </button>
                            {openDropdownId === stop.id && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                                {selectableBookings.length === 0 ? (
                                  <div className="p-4 text-xs text-gray-500 text-center">No pending bookings from this location.</div>
                                ) : (
                                  selectableBookings.map(b => (
                                    <div key={b.id} onClick={() => toggleBooking(stop.id, b.id)} className="px-4 py-3 hover:bg-blue-50 border-b border-gray-50 flex items-start gap-3 cursor-pointer">
                                      <input type="checkbox" checked={stop.selectedBookings.includes(b.id)} readOnly className="mt-1" />
                                      <div>
                                        <div className="font-semibold text-sm text-gray-900">{b.id} <span className="font-normal text-gray-500 ml-1">({b.weight} units)</span></div>
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
                                {droppingHere.map(b => (
                                  <li key={b.id} className="text-sm flex justify-between items-center border-b border-orange-100 pb-2 last:border-0 last:pb-0">
                                    <div><span className="font-semibold text-gray-900">{b.id}</span></div>
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

        {/* RIGHT COLUMN: SMART VEHICLE ALLOCATION */}
        <div className="w-1/2 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 p-5">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-800">Smart Vehicle Allocation</h2>
                <p className="text-xs text-gray-500 mt-0.5">Live ranking based on current payload and route.</p>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto mb-4">
              {vehicles.map(v => (
                <div key={v.id} className={`border rounded-lg p-4 transition-colors ${allocatedVehicle === v.id ? 'border-blue-500 bg-blue-50/30' : v.disabled ? 'border-red-100 bg-red-50/20 opacity-80' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{v.id}</span>
                        <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{v.type}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">Driver: {v.driver}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-1 rounded-md ${v.matchColor}`}>
                        {v.matchLabel}
                      </div>
                      <p className={`text-xs font-bold mt-1 ${v.disabled ? 'text-red-600' : 'text-gray-900'}`}>{v.maxWeight.toLocaleString()} units</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-medium ${v.disabled ? 'text-red-600' : 'text-gray-600'}`}>{v.message}</p>
                  {allocatedVehicle === v.id ? (
                    <button onClick={() => setAllocatedVehicle(null)} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded shadow-sm border border-green-200">Allocated ✓</button>
                  ) : v.disabled ? (
                    <button onClick={() => { setOverrideVehicleData(v); setIsOverrideModalOpen(true); }} className="px-4 py-1.5 font-medium text-xs rounded shadow-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200">Force Allocate</button>
                  ) : (
                    <button onClick={() => setAllocatedVehicle(v.id)} className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-xs rounded shadow-sm">Allocate</button>
                  )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
              <button onClick={handleFinalConfirm} className={`px-8 py-2.5 rounded-md text-sm font-bold shadow-md transition-colors w-full ${allocatedVehicle ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                Confirm Route & Dispatch
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