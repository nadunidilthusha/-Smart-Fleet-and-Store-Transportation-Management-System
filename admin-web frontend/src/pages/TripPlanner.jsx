import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import OverrideModal from '../components/trip/OverrideModal';

// --- MOCK DATABASE ---
const DB_BOOKINGS = [
  { id: 'BK-1104-0087', pickup: 'Main Store - Biyagama', dest: 'Store 3 - Kandy', items: 'Steel Flange (100mm)', qty: '1,000 units', weight: 4500, priority: 'Normal' },
  { id: 'BK-1104-0086', pickup: 'Main Store - Biyagama', dest: 'Ja-Ela Hub', items: 'Plastic packaging roll', qty: '50 units', weight: 2000, priority: 'Urgent' },
  { id: 'BK-1104-0092', pickup: 'Main Store - Biyagama', dest: 'Store 3 - Kandy', items: 'Iron Rebars', qty: '500 units', weight: 3000, priority: 'Normal' },
  { id: 'BK-1201-0014', pickup: 'Ja-Ela Hub', dest: 'Galle Regional', items: 'Cardboard Boxes', qty: '2,000 units', weight: 1500, priority: 'Normal' },
];

const LOCATIONS = ['Main Store - Biyagama', 'Ja-Ela Hub', 'Store 3 - Kandy', 'Galle Regional', 'Colombo Central'];

const TripPlanner = () => {
  const navigate = useNavigate();
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [allocatedVehicle, setAllocatedVehicle] = useState(null);
  const [overrideVehicleData, setOverrideVehicleData] = useState(null);

  const [stops, setStops] = useState([
    { id: 1, type: 'Pickup', location: 'Main Store - Biyagama', selectedBookings: ['BK-1104-0087'] },
    { id: 2, type: 'Delivery', location: 'Store 3 - Kandy', selectedBookings: [] }
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown-container')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- REACTIVE ROUTE CALCULATIONS ---
  const allSelectedIds = stops.flatMap(s => s.type === 'Pickup' ? s.selectedBookings : []);
  const activeBookings = DB_BOOKINGS.filter(b => allSelectedIds.includes(b.id));
  const totalWeight = activeBookings.reduce((sum, b) => sum + b.weight, 0);

  // Helper to figure out what needs to be delivered
  const pendingDestinations = [...new Set(activeBookings.map(b => b.dest))];

  const vehicles = useMemo(() => {
    const base = [
      { id: 'WP-AB-1234', type: '10T Heavy Truck', driver: 'Kamal Perera', loc: 'Main Store - Biyagama', maxWeight: 10000 },
      { id: 'SP-DA-6744', type: '10T Heavy Truck', driver: 'Dinesh Kumara', loc: 'Ja-Ela Hub', maxWeight: 10000 },
      { id: 'WP-CA-5582', type: '5T Box Truck', driver: 'Sunil Fernando', loc: 'Main Store - Biyagama', maxWeight: 5000 },
    ];

    return base.map(v => {
      let matchScore = 100;
      let matchLabel = "";
      let matchColor = "";
      let message = "";
      let disabled = false;

      if (totalWeight > v.maxWeight) {
        matchScore = 30;
        matchLabel = "Capacity Exceeded";
        matchColor = "bg-red-100 text-red-700";
        message = `Trip requires ${totalWeight.toLocaleString()} kg.`;
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
  }, [totalWeight, stops]);

  // --- STOP ACTIONS ---
  const handleAddStop = () => {
    const newId = stops.length > 0 ? Math.max(...stops.map(s => s.id)) + 1 : 1;
    // Smart default: If there are un-delivered items, default to a Delivery stop for them
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

  const handleFinalConfirm = () => {
    // 1. Validation: Check for empty locations
    if (stops.some(s => !s.location)) {
      return alert("Validation Error: Please select a location for all stops.");
    }
    // 2. Validation: Check for empty Pickups
    if (stops.some(s => s.type === 'Pickup' && s.selectedBookings.length === 0)) {
      return alert("Validation Error: You have a Pickup stop with no bookings selected.");
    }
    // 3. Validation: Allocation Check
    if (!allocatedVehicle) {
      return alert("Validation Error: Please allocate a vehicle or use Manual Override first.");
    }
    
    // 4. Validation: Inventory Flow Check
    let runningInventory = 0;
    for (let stop of stops) {
      if (stop.type === 'Pickup') {
        const load = activeBookings.filter(b => stop.selectedBookings.includes(b.id)).reduce((sum, b) => sum + b.weight, 0);
        runningInventory += load;
      } else {
        const drop = activeBookings.filter(b => b.dest === stop.location).reduce((sum, b) => sum + b.weight, 0);
        runningInventory -= drop;
      }
      if (runningInventory < 0) {
        return alert("Validation Error: Route sequence invalid. Trying to drop off inventory before it is picked up.");
      }
    }

    if (runningInventory > 0) {
      alert("Warning: Not all picked-up items have a corresponding delivery stop. They will remain on the vehicle.");
    }

    alert(`Success! Route confirmed and vehicle ${allocatedVehicle} allocated.`);
    navigate('/trip-planner');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning / New</div>
          <h1 className="text-2xl font-bold text-gray-900">Unified Route & Allocation</h1>
          <p className="text-sm text-gray-500 mt-1">Design stops, pick inventory, and dispatch in one step.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/trip-planner')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">Cancel</button>
          <button onClick={() => alert("Saved to drafts!")} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">Save Draft</button>
        </div>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Payload</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-blue-600">{totalWeight.toLocaleString()}</span>
            <span className="text-sm text-gray-500 ml-1">kg</span>
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
                
                // Advanced Selection Filtering
                const availableHere = DB_BOOKINGS.filter(b => b.pickup === stop.location);
                // Filter out bookings that are already selected in OTHER pickup stops
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

                      {/* PICKUP UI */}
                      {isPickup && stop.location && (
                        <div className="custom-dropdown-container">
                          {unselectedHere.length > 0 && (
                            <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 font-medium flex items-start gap-2">
                              <span>💡</span> {unselectedHere.length} unassigned bookings available here.
                            </div>
                          )}
                          
                          <div className="space-y-2 mb-3">
                            {stop.selectedBookings.map(bkId => {
                              const b = DB_BOOKINGS.find(x => x.id === bkId);
                              if (!b) return null;
                              return (
                                <div key={b.id} className="p-3 border border-blue-100 bg-blue-50/30 rounded-md text-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-blue-700">{b.id}</span>
                                    <span className="font-bold text-gray-900">{b.weight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">{b.pickup} <span className="mx-1">→</span> <span className="font-medium text-gray-800">{b.dest}</span></div>
                                  <div className="text-xs text-gray-500">{b.items} <span className="text-gray-300 mx-1">|</span> {b.qty}</div>
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
                                        <div className="font-semibold text-sm text-gray-900">{b.id} <span className="font-normal text-gray-500 ml-1">({b.weight} kg)</span></div>
                                        <div className="text-xs text-gray-500 mt-0.5">To: {b.dest} • {b.items}</div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                            <span className="text-xs text-gray-500 mr-3">Pickup Load:</span>
                            <span className="text-sm font-bold text-blue-600">{thisStopWeight.toLocaleString()} kg</span>
                          </div>
                        </div>
                      )}

                      {/* DELIVERY UI */}
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
                                    <div><span className="font-semibold text-gray-900">{b.id}</span> <span className="text-xs text-gray-500 ml-1">({b.items})</span></div>
                                    <span className="font-medium text-orange-600">-{b.weight.toLocaleString()} kg</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 pt-3 border-t border-orange-200 text-right">
                                <span className="text-xs text-orange-800/70 mr-3">Total Drop:</span>
                                <span className="text-sm font-bold text-orange-700">-{dropWeight.toLocaleString()} kg</span>
                              </div>
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
                <p className="text-xs text-gray-500 mt-0.5">Live ranking based on current payload ({totalWeight.toLocaleString()} kg) and route.</p>
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
                        <span className="flex items-center gap-1">Loc: {v.loc}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-1 rounded-md ${v.matchColor}`}>
                        {v.matchLabel}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase">Max Capacity</p>
                      <p className={`text-xs font-bold ${v.disabled ? 'text-red-600' : 'text-gray-900'}`}>{v.maxWeight.toLocaleString()} kg</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs flex items-center gap-1.5 font-medium ${v.disabled ? 'text-red-600' : 'text-gray-600'}`}>
                      {v.message}
                    </p>
                  {allocatedVehicle === v.id ? (
                    <button onClick={() => setAllocatedVehicle(null)} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded shadow-sm border border-green-200">Allocated ✓</button>
                  ) : v.disabled ? (
                    // Only Disabled vehicles trigger the override modal
                    <button 
                      onClick={() => {
                        setOverrideVehicleData(v);
                        setIsOverrideModalOpen(true);
                      }} 
                      className="px-4 py-1.5 font-medium text-xs rounded shadow-sm transition-colors bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                    >
                      Force Allocate
                    </button>
                  ) : (
                    // Valid vehicles allocate instantly without the modal
                    <button 
                      onClick={() => setAllocatedVehicle(v.id)} 
                      className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-xs rounded shadow-sm transition-colors"
                    >
                      Allocate
                    </button>
                  )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mb-6">
              <button onClick={() => setIsOverrideModalOpen(true)} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center gap-1 w-full p-2 bg-blue-50/50 rounded-md border border-blue-100">
                <span>+</span> Open Manual Override Logs
              </button>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
              <button 
                onClick={handleFinalConfirm} 
                className={`px-8 py-2.5 rounded-md text-sm font-bold shadow-md transition-colors w-full ${allocatedVehicle ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
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
          // When they type a valid reason and click confirm, we force the allocation
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