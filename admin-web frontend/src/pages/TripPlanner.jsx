import React, { useState, useMemo } from 'react';
import OverrideModal from '../components/trip/OverrideModal';

const TripPlanner = () => {
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  
  // 1. State for Pickup & Delivery Stops
  const [stops, setStops] = useState([
    { 
      id: 1, 
      type: 'Pickup', 
      location: 'Main Store - Biyagama', 
      subLabel: 'Associated Bookings', 
      subValue: 'BK-1104-0087', 
      load: '920', 
      isEmpty: false 
    },
    { 
      id: 2, 
      type: 'Delivery', 
      location: 'Store 3 - Kandy', 
      subLabel: 'Unloading Quantity', 
      subValue: 'Partial Load', 
      load: '-500', 
      isEmpty: false 
    }
  ]);

  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null); // Tracks which dropdown (Booking or Store) is open

  // Dummy approved bookings available for trip planning
  const availableBookings = [
    { code: 'BK-1104-0087', store: 'Main Store - Biyagama', units: '920' },
    { code: 'BK-1104-0085', store: 'Main Store - Biyagama', units: '900' },
    { code: 'BK-1104-0088', store: 'Main Store - Biyagama', units: '400' }
  ];

  const dummyStores = [
    { name: 'Ja-Ela Hub', defaultLoad: '-420' },
    { name: 'Galle Distribution', defaultLoad: '-400' },
    { name: 'Kurunegala Branch', defaultLoad: '-250' }
  ];

  const vehicles = [
    { id: 'LB-1190', type: '10T Heavy Truck', driver: 'M. Jayasuriya', capacity: 1200, capacityLabel: '1,200 units', match: 'Perfect Match', matchColor: 'text-green-600', loc: 'Main Store', status: 'Available', statusColor: 'text-green-600', disabled: false },
    { id: 'NB-7702', type: '10T Heavy Truck', driver: 'S. Dias', capacity: 1500, capacityLabel: '1,500 units', match: 'Slightly Over-spec', matchColor: 'text-gray-500', loc: 'Ja-Ela Hub', status: 'Available', statusColor: 'text-green-600', disabled: false },
    { id: 'WP-3308', type: '10T Heavy Truck', driver: 'Roshan Fernando', capacity: 1200, capacityLabel: '1,200 units', match: '', matchColor: '', loc: 'In Transit', status: 'In Use', statusColor: 'text-red-500', disabled: true },
  ];

  const maxCapacity = useMemo(() => {
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    return vehicle ? vehicle.capacity : 1200;
  }, [selectedVehicleId]);

  const { currentLoad, peakLoad, peakUtilization } = useMemo(() => {
    let current = 0;
    let peak = 0;
    
    stops.forEach(stop => {
      if (!stop.isEmpty) {
        const loadVal = parseInt(stop.load) || 0;
        current += loadVal;
        if (current > peak) peak = current;
      }
    });

    const util = maxCapacity > 0 ? ((peak / maxCapacity) * 100).toFixed(1) : 0;
    
    return { 
      currentLoad: current, 
      peakLoad: peak, 
      peakUtilization: Math.min(Math.max(util, 0), 100) 
    };
  }, [stops, maxCapacity]);

  const selectedVehicleObj = vehicles.find(v => v.id === selectedVehicleId) || null;

  // --- Handlers ---

  const handleAddStop = () => {
    const hasEmptyStop = stops.some(stop => stop.isEmpty);
    if (hasEmptyStop) {
      alert("Please complete the existing empty stop before adding a new one.");
      return;
    }
    const newId = stops.length + 1;
    setStops([...stops, { id: newId, type: 'Delivery', location: 'Select Destination...', load: '', isEmpty: true }]);
  };

  // Handle selecting an Associated Booking for Pickup
  const handleSelectBooking = (stopId, booking) => {
    setStops(stops.map(stop => {
      if (stop.id === stopId) {
        return {
          ...stop,
          location: booking.store,
          subValue: booking.code,
          load: booking.units
        };
      }
      return stop;
    }));
    setOpenDropdownId(null);
  };

  const handleSelectStore = (stopId, store) => {
    setStops(stops.map(stop => {
      if (stop.id === stopId) {
        return {
          ...stop,
          location: store.name,
          subLabel: 'Unloading Quantity',
          subValue: 'Partial Load',
          load: store.defaultLoad,
          isEmpty: false
        };
      }
      return stop;
    }));
    setOpenDropdownId(null);
  };

  const handleAssign = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleConfirmOverride = () => {
    if (!selectedVehicleId) {
      alert("Please assign a vehicle from the list first to manually override.");
      return;
    }
    alert(`Success: Manual Override confirmed for vehicle ${selectedVehicleId}. Schedule checks bypassed.`);
    setIsOverrideModalOpen(false);
  };

  const handleSaveDraft = () => alert("Trip Plan saved as draft!");

  const handleConfirm = () => {
    if (!selectedVehicleId) return alert("Please assign a vehicle first.");
    if (stops.some(stop => stop.isEmpty)) return alert("Please complete all stops in the sequence before confirming.");
    
    let runningInventory = 0;
    let hasInvalidDrop = false;

    for (let i = 0; i < stops.length; i++) {
      const stopVal = parseInt(stops[i].load) || 0;
      runningInventory += stopVal;
      
      if (runningInventory < 0) {
        hasInvalidDrop = true;
        break;
      }
    }

    if (hasInvalidDrop) {
      return alert("Validation Error: You cannot drop off more units than you currently have loaded on the truck. Please check your Drop quantities.");
    }

    alert("Trip Plan Confirmed and vehicle assigned!");
    setSelectedVehicleId(null);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? Unsaved changes will be lost.")) {
      setSelectedVehicleId(null);
      setOpenDropdownId(null);
      setStops([
        { id: 1, type: 'Pickup', location: 'Main Store - Biyagama', subLabel: 'Associated Bookings', subValue: 'BK-1104-0087', load: '920', isEmpty: false },
        { id: 2, type: 'Delivery', location: 'Store 3 - Kandy', subLabel: 'Unloading Quantity', subValue: 'Partial Load', load: '-500', isEmpty: false }
      ]);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Configure multi-stop sequences and assign vehicles</p>
        </div>
        <button onClick={handleSaveDraft} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
          Save as Draft
        </button>
      </div>

      <div className="flex gap-6 h-full min-h-[600px]">
        {/* Left Column: Sequence & Capacity */}
        <div className="w-1/2 flex flex-col gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Stop Sequence</h2>
              <button onClick={handleAddStop} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
                <span>+</span> Add Stop
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              {stops.map((stop, index) => {
                const isLast = index === stops.length - 1;
                const isPickup = stop.type === 'Pickup';
                
                return (
                  <div key={stop.id} className={`flex gap-4 relative ${!isLast ? 'pb-8' : ''}`}>
                    {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>}
                    
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm z-10 
                      ${isPickup ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-500'}`}
                    >
                      {stop.id}
                    </div>
                    
                    <div className={`flex-1 rounded p-3 ${stop.isEmpty ? 'border border-dashed border-gray-300' : 'bg-gray-50 border border-gray-100 flex justify-between items-start'}`}>
                      {stop.isEmpty ? (
                        <>
                          <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">{stop.type}</span>
                          <p className="text-sm text-gray-400 mt-2">{stop.location}</p>
                          <div className="relative">
                            <button onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)} className="w-full mt-3 py-2 border border-gray-200 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                              Choose Store
                            </button>
                            {openDropdownId === stop.id && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                                <ul className="py-1 text-sm text-gray-700">
                                  {dummyStores.map((store, i) => (
                                    <li key={i}>
                                      <button onClick={() => handleSelectStore(stop.id, store)} className="w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                        {store.name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      ) : isPickup ? (
                        /* --- INTERACTIVE PICKUP STOP WITH BOOKING SELECTOR --- */
                        <>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded tracking-wide">Pickup</span>
                            <h3 className="font-semibold text-gray-900 mt-1">{stop.location}</h3>
                            <p className="text-xs text-gray-500 mt-2">{stop.subLabel}</p>
                            
                            {/* Clickable Booking Selector Dropdown */}
                            <div className="relative mt-1">
                              <button 
                                onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)}
                                className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2"
                              >
                                {stop.subValue} ▾
                              </button>

                              {openDropdownId === stop.id && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 border-b">Select Approved Booking</div>
                                  <ul className="py-1 text-sm text-gray-700">
                                    {availableBookings.map((b, i) => (
                                      <li key={i}>
                                        <button 
                                          onClick={() => handleSelectBooking(stop.id, b)} 
                                          className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors flex justify-between"
                                        >
                                          <span className="font-medium">{b.code}</span>
                                          <span className="text-xs text-gray-500">{b.units} units</span>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Load (Units)</p>
                            <input 
                              type="text" 
                              value={stop.load} 
                              readOnly
                              className="w-20 px-2 py-1 text-right border border-gray-200 rounded text-sm bg-white font-medium text-gray-900" 
                            />
                          </div>
                        </>
                      ) : (
                        /* --- DELIVERY STOP --- */
                        <>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">Delivery</span>
                            <h3 className="font-semibold text-gray-900 mt-1">{stop.location}</h3>
                            <p className="text-xs text-gray-500 mt-2">{stop.subLabel}</p>
                            <p className="text-sm font-medium text-gray-700">{stop.subValue}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Drop (Units)</p>
                            <input 
                              type="text" 
                              value={stop.load} 
                              readOnly
                              className="w-20 px-2 py-1 text-right border border-gray-200 rounded text-sm bg-white font-medium text-red-600" 
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* On-board Capacity Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 h-40 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-semibold text-gray-800">On-board Capacity</h2>
              <span className="text-sm text-gray-500">Max: {maxCapacity.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between text-sm mb-1 mt-4">
              <span className="text-gray-600 font-medium">Final Load (End of Trip)</span>
              <span className={`font-bold ${currentLoad < 0 ? 'text-red-600' : currentLoad > maxCapacity ? 'text-red-600' : 'text-blue-600'}`}>
                {currentLoad} / {maxCapacity.toLocaleString()} units
              </span>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden flex">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${peakUtilization > 100 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(peakUtilization, 100)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Peak Utilization</span>
                <span className={`font-bold ${peakUtilization > 100 ? 'text-red-600' : 'text-gray-700'}`}>
                  {peakUtilization}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block">Status</span>
                {peakUtilization > 100 ? (
                  <span className="font-bold text-red-600">Capacity Exceeded</span>
                ) : (
                  <span className="font-bold text-green-600">Optimal Load</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recommendations */}
        <div className="w-1/2 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-800">Vehicle Recommendations</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ranked by capacity, availability, and location</p>
            </div>
            <button onClick={() => setIsOverrideModalOpen(true)} className="text-sm text-gray-500 underline hover:text-gray-800 transition-colors">
              Manual Override
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Location & Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((v) => {
                  const isSelected = selectedVehicleId === v.id;
                  return (
                    <tr key={v.id} className={`${v.disabled ? 'bg-gray-50/50 opacity-60' : isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{v.id}</div>
                        <div className="text-xs text-gray-500">{v.type}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{v.driver}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{v.capacityLabel}</div>
                        {v.match && <div className={`text-xs ${v.matchColor}`}>{v.match}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{v.loc}</div>
                        <div className={`text-xs font-medium ${v.statusColor}`}>{v.status}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {v.disabled ? (
                          <button disabled className="px-4 py-1.5 bg-gray-100 text-gray-400 rounded text-xs font-medium cursor-not-allowed">Unavailable</button>
                        ) : isSelected ? (
                          <button onClick={() => setSelectedVehicleId(null)} className="px-4 py-1.5 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-200 transition-colors shadow-sm">
                            Assigned ✓
                          </button>
                        ) : (
                          <button onClick={() => handleAssign(v.id)} className={`px-4 py-1.5 rounded text-xs font-medium shadow-sm transition-colors ${v.match === 'Perfect Match' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
            <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors">
              Confirm Trip Plan
            </button>
          </div>
        </div>
      </div>
      
      <OverrideModal 
        isOpen={isOverrideModalOpen} 
        onClose={() => setIsOverrideModalOpen(false)}
        onConfirm={handleConfirmOverride} 
        vehicle={selectedVehicleObj} 
      />
    </div>
  );
};

export default TripPlanner;