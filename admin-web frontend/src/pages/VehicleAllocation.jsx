import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Added import

const VehicleAllocation = () => {
  const navigate = useNavigate(); // Added hook
  const [allocatedVehicle, setAllocatedVehicle] = useState(null);

  const handleAllocate = (vehicleId) => {
    setAllocatedVehicle(vehicleId);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">Operations / Trip Planning / Allocation</div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle & Driver Allocation</h1>
          <p className="text-sm text-gray-500 mt-1">Assign resources for Trip TR-0450</p>
        </div>
        <button 
          onClick={() => navigate('/trip-planner/new')}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Edit Trip Route
        </button>
      </div>

      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Load</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">6,500</span>
            <span className="text-sm text-gray-500 ml-1">kg</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Distance</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">120</span>
            <span className="text-sm text-gray-500 ml-1">km</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stops</p>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900">3 Stops</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required By</p>
          <div className="mt-1 text-lg font-bold text-gray-900">
            05 Nov, 08:00 AM
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Column: Route & Bookings */}
        <div className="w-1/2 flex flex-col gap-6">
          
          {/* Planned Route Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-5">Planned Route</h2>
            
            <div className="relative pl-3">
              {/* Vertical connecting line */}
              <div className="absolute left-[17.5px] top-3 bottom-6 w-0.5 bg-gray-200"></div>
              
              {/* Pickup Stop */}
              <div className="flex gap-4 relative pb-8">
                <div className="w-4 h-4 rounded-full border-4 border-blue-100 bg-blue-600 flex-shrink-0 z-10 mt-1"></div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pickup</span>
                  <h3 className="font-semibold text-gray-900 text-sm mt-0.5">Main Store</h3>
                  <p className="text-xs text-gray-500 mt-1">Biyagama • Est. Departure 08:00 AM</p>
                </div>
              </div>

              {/* Drop-off Stop 1 */}
              <div className="flex gap-4 relative pb-8">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white flex-shrink-0 z-10 mt-1"></div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Drop-off</span>
                  <h3 className="font-semibold text-gray-900 text-sm mt-0.5">Ja-Ela Distribution Center</h3>
                  <p className="text-xs text-gray-500 mt-1">Unload 2,000 kg • Est. Arrival 09:30 AM</p>
                </div>
              </div>

              {/* Drop-off Stop 2 (End) */}
              <div className="flex gap-4 relative">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center flex-shrink-0 z-10 mt-1">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Drop-off / End</span>
                  <h3 className="font-semibold text-gray-900 text-sm mt-0.5">Kandy Regional Store</h3>
                  <p className="text-xs text-gray-500 mt-1">Unload 4,500 kg • Est. Arrival 12:45 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Included Bookings Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="font-semibold text-gray-800">Included Bookings</h2>
              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">2 Bookings</span>
            </div>
            
            <div className="flex flex-col gap-4">
              {/* Booking 1 */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600 text-sm">BK-1104-0087</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Main Store → Kandy</p>
                  <p className="text-xs text-gray-400 mt-0.5">Steel Flange (100mm) x 1,000 units</p>
                </div>
                <span className="font-bold text-gray-900 text-sm">4,500 kg</span>
              </div>

              {/* Booking 2 */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600 text-sm">BK-1104-0086</span>
                    <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded tracking-wide uppercase">Urgent</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Main Store → Ja-Ela</p>
                  <p className="text-xs text-gray-400 mt-0.5">Plastic packaging roll x 50 units</p>
                </div>
                <span className="font-bold text-gray-900 text-sm">2,000 kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recommended Vehicles */}
        <div className="w-1/2 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col p-5">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="font-semibold text-gray-800">Recommended Vehicles</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ranked by capacity, schedule compatibility, and location</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
            
            {/* Vehicle 1 - 98% Match */}
            <div className={`border rounded-lg p-4 transition-colors ${allocatedVehicle === 'WP-AB-1234' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">WP-AB-1234</span>
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">10T Heavy Truck</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Driver: Kamal Perera</span>
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Loc: Main Store</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 font-bold text-[11px] px-2 py-1 rounded-md">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    98% Match
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase">Max Capacity</p>
                  <p className="text-xs font-bold text-gray-900">10,000 kg</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-green-700 flex items-center gap-1.5 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Optimal capacity usage (65%) and available at pickup origin.
                </p>
                {allocatedVehicle === 'WP-AB-1234' ? (
                  <button onClick={() => setAllocatedVehicle(null)} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded shadow-sm border border-green-200">Allocated ✓</button>
                ) : (
                  <button onClick={() => handleAllocate('WP-AB-1234')} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded shadow-sm transition-colors">Allocate</button>
                )}
              </div>
            </div>

            {/* Vehicle 2 - 85% Match */}
            <div className={`border rounded-lg p-4 transition-colors ${allocatedVehicle === 'SP-DA-6744' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">SP-DA-6744</span>
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">10T Heavy Truck</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Driver: Dinesh Kumara</span>
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Loc: Ja-Ela Hub</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 font-bold text-[11px] px-2 py-1 rounded-md">
                    85% Match
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase">Max Capacity</p>
                  <p className="text-xs font-bold text-gray-900">10,000 kg</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  Requires deadhead routing (30 min delay) to pickup location.
                </p>
                {allocatedVehicle === 'SP-DA-6744' ? (
                  <button onClick={() => setAllocatedVehicle(null)} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded shadow-sm border border-green-200">Allocated ✓</button>
                ) : (
                  <button onClick={() => handleAllocate('SP-DA-6744')} className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs rounded shadow-sm transition-colors">Allocate</button>
                )}
              </div>
            </div>

            {/* Vehicle 3 - 40% Match (Disabled) */}
            <div className="border border-red-100 bg-red-50/20 rounded-lg p-4 opacity-80">
              <div className="flex justify-between items-start border-b border-red-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">WP-CA-5582</span>
                    <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">5T Box Truck</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Driver: Sunil Fernando</span>
                    <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Loc: Main Store</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-bold text-[11px] px-2 py-1 rounded-md">
                    40% Match
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase">Max Capacity</p>
                  <p className="text-xs font-bold text-red-600">5,000 kg</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
                  Capacity Exceeded (Trip requires 6,500 kg).
                </p>
                <button disabled className="px-4 py-1.5 bg-gray-100 text-gray-400 border border-gray-200 font-medium text-xs rounded cursor-not-allowed">Allocate</button>
              </div>
            </div>

          </div>

          {/* Manual Override Action */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center justify-center gap-1 w-full">
              <span>+</span> Select vehicle manually (Override)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VehicleAllocation;