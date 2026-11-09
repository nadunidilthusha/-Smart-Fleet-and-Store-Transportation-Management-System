import React from 'react';

const TripPlanner = () => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Configure multi-stop sequences and assign vehicles</p>
        </div>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
          Save as Draft
        </button>
      </div>

      <div className="flex gap-6 h-full min-h-[600px]">
        {/* Left Column: Sequence & Capacity */}
        <div className="w-1/2 flex flex-col gap-6">
          
          {/* Stop Sequence Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Stop Sequence</h2>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                <span>+</span> Add Stop
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              {/* Stop 1: Pickup */}
              <div className="flex gap-4 relative pb-8">
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm z-10 bg-white">1</div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded p-3 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded tracking-wide">Pickup</span>
                    <h3 className="font-semibold text-gray-900 mt-1">Main Store - Biyagama</h3>
                    <p className="text-xs text-gray-500 mt-2">Associated Bookings</p>
                    <p className="text-sm font-medium text-gray-700">BK-1104-0087</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Load (Units)</p>
                    <input type="text" value="920" readOnly className="w-20 px-2 py-1 text-right border border-gray-200 rounded text-sm bg-white" />
                  </div>
                </div>
              </div>

              {/* Stop 2: Delivery */}
              <div className="flex gap-4 relative pb-8">
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center text-gray-500 font-bold text-sm z-10">2</div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded p-3 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">Delivery</span>
                    <h3 className="font-semibold text-gray-900 mt-1">Store 3 - Kandy</h3>
                    <p className="text-xs text-gray-500 mt-2">Unloading Quantity</p>
                    <p className="text-sm font-medium text-gray-700">Partial Load</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Drop (Units)</p>
                    <input type="text" value="-500" readOnly className="w-20 px-2 py-1 text-right border border-gray-200 rounded text-sm bg-white text-red-600 font-medium" />
                  </div>
                </div>
              </div>

              {/* Stop 3: Empty Delivery slot */}
              <div className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center text-gray-500 font-bold text-sm z-10">3</div>
                <div className="flex-1 border border-dashed border-gray-300 rounded p-3">
                   <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded tracking-wide">Delivery</span>
                   <p className="text-sm text-gray-400 mt-2">Select Destination...</p>
                   <button className="w-full mt-3 py-2 border border-gray-200 rounded bg-white text-sm text-gray-600 hover:bg-gray-50 font-medium">Choose Store</button>
                </div>
              </div>
            </div>
          </div>

          {/* On-board Capacity Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 h-40 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-semibold text-gray-800">On-board Capacity</h2>
              <span className="text-sm text-gray-500">Max: 1,200 units</span>
            </div>
            
            <div className="flex justify-between text-sm mb-1 mt-4">
              <span className="text-gray-600 font-medium">Current Load (After Stop 1)</span>
              <span className="font-bold text-blue-600">920 / 1,200 units</span>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden flex">
              <div className="bg-blue-500 h-2.5 rounded-full w-[76.6%]"></div>
            </div>

            <div className="flex justify-between text-xs">
              <div>
                <span className="text-gray-400 block">Peak Utilization</span>
                <span className="font-bold text-gray-700">76.6%</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block">Status</span>
                <span className="font-bold text-green-600">Optimal Load</span>
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
            <button className="text-sm text-gray-500 underline hover:text-gray-800">Manual Override</button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Location & Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                
                {/* Row 1 */}
                <tr className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">LB-1190</div>
                    <div className="text-xs text-gray-500">10T Heavy Truck</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">M. Jayasuriya</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">1,200 units</div>
                    <div className="text-xs text-green-600">Perfect Match</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">Main Store</div>
                    <div className="text-xs text-green-600 font-medium">Available</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 shadow-sm">Assign</button>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">NB-7702</div>
                    <div className="text-xs text-gray-500">10T Heavy Truck</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">S. Dias</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">1,500 units</div>
                    <div className="text-xs text-gray-500">Slightly Over-spec</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">Ja-Ela Hub</div>
                    <div className="text-xs text-green-600 font-medium">Available</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 shadow-sm">Assign</button>
                  </td>
                </tr>

                {/* Row 3 - Disabled */}
                <tr className="bg-gray-50/50 opacity-60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">WP-3308</div>
                    <div className="text-xs text-gray-500">10T Heavy Truck</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">Roshan Fernando</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">1,200 units</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">In Transit</div>
                    <div className="text-xs text-red-500 font-medium">In Use</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button disabled className="px-4 py-1.5 bg-gray-100 text-gray-400 rounded text-xs font-medium cursor-not-allowed">Unavailable</button>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
              Confirm Trip Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;