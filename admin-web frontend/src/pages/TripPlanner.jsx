import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TripPlanner = () => {
  const navigate = useNavigate();
  
  const [stops, setStops] = useState([
    { 
      id: 1, 
      type: 'Pickup', 
      location: 'Main Store - Biyagama', 
      selectedBookings: [{ code: 'BK-1104-0087', units: 920 }],
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

  const [openDropdownId, setOpenDropdownId] = useState(null);

  const availableBookings = [
    { code: 'BK-1104-0087', store: 'Main Store - Biyagama', units: 920 },
    { code: 'BK-1104-0085', store: 'Main Store - Biyagama', units: 900 },
    { code: 'BK-1104-0088', store: 'Main Store - Biyagama', units: 400 }
  ];

  const dummyStores = [
    { name: 'Ja-Ela Hub', defaultLoad: '-420' },
    { name: 'Galle Distribution', defaultLoad: '-400' },
    { name: 'Kurunegala Branch', defaultLoad: '-250' }
  ];

  const handleAddStop = () => {
    if (stops.some(stop => stop.isEmpty)) return alert("Complete the empty stop first.");
    setStops([...stops, { id: stops.length + 1, type: 'Delivery', location: 'Select Destination...', load: '', isEmpty: true }]);
  };

  const toggleBooking = (stopId, booking) => {
    setStops(stops.map(stop => {
      if (stop.id === stopId) {
        const isSelected = stop.selectedBookings.some(b => b.code === booking.code);
        let updatedBookings = [];
        
        if (isSelected) {
          updatedBookings = stop.selectedBookings.filter(b => b.code !== booking.code);
        } else {
          updatedBookings = [...stop.selectedBookings, booking];
        }

        const totalLoad = updatedBookings.reduce((sum, b) => sum + b.units, 0);

        return {
          ...stop,
          location: booking.store,
          selectedBookings: updatedBookings,
          load: totalLoad.toString()
        };
      }
      return stop;
    }));
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

  const handleConfirm = () => {
    if (stops.some(stop => stop.isEmpty)) return alert("Please complete all stops.");
    let runningInventory = 0;
    for (let i = 0; i < stops.length; i++) {
      runningInventory += parseInt(stops[i].load) || 0;
      if (runningInventory < 0) return alert("Validation Error: Cannot drop off more units than loaded.");
    }
    navigate('/allocation');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto w-full">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning / New</div>
            <h1 className="text-2xl font-bold text-gray-900">Create Trip Plan</h1>
            <p className="text-sm text-gray-500 mt-1">Configure multi-stop sequences and load quantities</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/trip-planner')} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              Cancel
            </button>
            <button onClick={() => alert("Saved to drafts!")} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              Save as Draft
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col mb-6">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Stop Sequence</h2>
            <button onClick={handleAddStop} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 transition-colors">
              <span>+</span> Add Stop
            </button>
          </div>
          
          <div className="p-6">
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
                  
                  <div className={`flex-1 rounded p-4 ${stop.isEmpty ? 'border border-dashed border-gray-300 bg-gray-50/50' : 'bg-gray-50 border border-gray-100 flex justify-between items-start'}`}>
                    {stop.isEmpty ? (
                      <>
                        <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">{stop.type}</span>
                        <p className="text-sm text-gray-400 mt-2">{stop.location}</p>
                        <div className="relative max-w-xs">
                          <button onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)} className="w-full mt-3 py-2 border border-gray-200 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors text-left px-3">
                            Choose Store ▾
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
                      <>
                        <div className="flex-1">
                          <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded tracking-wide">Pickup</span>
                          <h3 className="font-semibold text-gray-900 mt-1 text-base">{stop.location}</h3>
                          <p className="text-xs text-gray-500 mt-2">Associated Bookings</p>
                          
                          <div className="relative mt-1">
                            <button 
                              onClick={() => setOpenDropdownId(openDropdownId === stop.id ? null : stop.id)}
                              className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-2"
                            >
                              {stop.selectedBookings.length > 0 
                                ? `${stop.selectedBookings.length} Booking(s) Selected` 
                                : 'Select Bookings'} ▾
                            </button>

                            {openDropdownId === stop.id && (
                              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b flex justify-between">
                                  <span>Select Approved Bookings</span>
                                </div>
                                <ul className="py-1 text-sm text-gray-700 max-h-48 overflow-y-auto">
                                  {availableBookings.map((b, i) => {
                                    const isSelected = stop.selectedBookings.some(sel => sel.code === b.code);
                                    return (
                                      <li key={i} className="px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0 cursor-pointer" onClick={() => toggleBooking(stop.id, b)}>
                                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">{b.code}</div>
                                          <div className="text-xs text-gray-500">{b.units} units</div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                            
                            {/* Tags showing selected bookings */}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {stop.selectedBookings.map(b => (
                                <span key={b.code} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 shadow-sm">
                                  {b.code}
                                  <button onClick={(e) => { e.stopPropagation(); toggleBooking(stop.id, b); }} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Total Load (Units)</p>
                          <input type="text" value={stop.load} readOnly className="w-24 px-3 py-1.5 text-right border border-gray-200 rounded text-base bg-white font-bold text-blue-700 shadow-inner" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">Delivery</span>
                          <h3 className="font-semibold text-gray-900 mt-1 text-base">{stop.location}</h3>
                          <p className="text-xs text-gray-500 mt-2">{stop.subLabel}</p>
                          <p className="text-sm font-medium text-gray-700">{stop.subValue}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Drop (Units)</p>
                          <input type="text" value={stop.load} readOnly className="w-24 px-3 py-1.5 text-right border border-gray-200 rounded text-base bg-white font-bold text-red-600 shadow-inner" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleConfirm} className="px-6 py-2.5 bg-blue-600 rounded-md text-sm font-bold text-white hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2">
            Proceed to Allocation <span>→</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default TripPlanner;