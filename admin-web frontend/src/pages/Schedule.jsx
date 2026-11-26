import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const Schedule = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [currentDateObj, setCurrentDateObj] = useState(new Date()); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [vehicleSchedules, setVehicleSchedules] = useState([]);
  const [storeSlots, setStoreSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  useEffect(() => {
    const dateStr = currentDateObj.toISOString().split('T')[0];
    
    apiClient.get(`/schedule?startDate=${dateStr}&endDate=${dateStr}`)
      .then(res => {
        const { trips, slots } = res.data;

        // 1. Map real Trips to Vehicle rows
        const vehicleMap = {};
        trips.forEach(trip => {
          if (!trip.vehicle) return;
          const vId = trip.vehicle.plate || 'Unknown';
          
          if (!vehicleMap[vId]) {
            vehicleMap[vId] = { id: vId, type: trip.vehicle.type, allocations: [] };
          }

          const startTime = trip.createdAt ? new Date(trip.createdAt).toTimeString().slice(0, 5) : '08:00';
          
          vehicleMap[vId].allocations.push({
            tripId: trip.code,
            route: trip.route,
            startHour: hours.includes(startTime) ? startTime : '08:00', 
            span: 2,
            status: trip.status === 'Completed' ? 'gray' : trip.status === 'In Transit' ? 'green' : 'blue'
          });
        });
        setVehicleSchedules(Object.values(vehicleMap));

        // 2. Map real Loading Slots to Store rows
        const storeMap = {};
        slots.forEach(slot => {
          const sId = slot.store?.name || 'Unknown Store';
          if (!storeMap[sId]) {
            storeMap[sId] = { id: sId, type: 'Location', allocations: [] };
          }
          storeMap[sId].allocations.push({
            tripId: slot.booking ? slot.booking.code : 'Blocked',
            route: slot.status,
            startHour: slot.startTime,
            span: 1,
            status: slot.status === 'Reserved' ? 'blue' : 'green'
          });
        });
        setStoreSlots(Object.values(storeMap));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load schedule", err);
        setLoading(false);
      });
  }, [currentDateObj]);

  const handlePrevDay = () => {
    const newDate = new Date(currentDateObj);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDateObj(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDateObj);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDateObj(newDate);
  };

  const formattedDate = currentDateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'green': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'gray': default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const getFilterStatusCode = (filterName) => {
    switch (filterName) {
      case 'On Trip / Active': return 'green';
      case 'Planned / Pending': return 'blue';
      case 'Completed': return 'gray';
      default: return null;
    }
  };

  const baseRows = activeTab === 'vehicles' ? vehicleSchedules : storeSlots;
  const filterCode = getFilterStatusCode(selectedFilter);

  const currentRows = baseRows.map(row => {
    if (!filterCode) return row;
    return { ...row, allocations: row.allocations.filter(a => a.status === filterCode) };
  });

  if (loading) return <div className="p-10 text-center">Loading schedules...</div>;

  return (
    <div className="flex-1 flex flex-col justify-between min-w-0 bg-slate-50 p-6 overflow-auto">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedules & Timelines</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor vehicle allocations and store loading slot reservations</p>
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="flex items-center bg-white border border-gray-300 rounded-md shadow-sm">
              <button onClick={handlePrevDay} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 border-r border-gray-200 text-sm font-bold">&lt;</button>
              <span className="px-4 py-1.5 text-sm font-medium text-gray-700">{formattedDate}</span>
              <button onClick={handleNextDay} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 border-l border-gray-200 text-sm font-bold">&gt;</button>
            </div>
            
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                Filter: {selectedFilter}
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
                  {['All', 'On Trip / Active', 'Planned / Pending', 'Completed'].map((filterName) => (
                    <button key={filterName} onClick={() => { setSelectedFilter(filterName); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                      {filterName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-6">
              <button onClick={() => setActiveTab('vehicles')} className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-3.5 ${activeTab === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Vehicle Schedules</button>
              <button onClick={() => setActiveTab('stores')} className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-3.5 ${activeTab === 'stores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Store Slots</button>
            </div>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span><span>On Trip</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-400"></span><span>Reserved</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></span><span>Completed</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4 w-52 border-r border-gray-200">{activeTab === 'vehicles' ? 'Vehicle / Asset' : 'Store / Location'}</th>
                  {hours.map((hour, idx) => (<th key={idx} className="py-3 px-2 text-center border-r border-gray-100 font-medium">{hour}</th>))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentRows.length === 0 && (
                  <tr><td colSpan={13} className="p-6 text-center text-gray-500">No schedules found for this date.</td></tr>
                )}
                {currentRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors h-16">
                    <td className="py-3 px-4 border-r border-gray-200 bg-white">
                      <div className="font-semibold text-gray-900">{row.id}</div>
                      <div className="text-xs text-gray-500">{row.type}</div>
                    </td>
                    {hours.map((hour, hIdx) => {
                      const match = row.allocations.find(a => a.startHour === hour);
                      return (
                        <td key={hIdx} className="p-1 border-r border-gray-100 relative h-full align-middle">
                          {match && (
                            <div className={`absolute inset-x-1 top-2 bottom-2 rounded px-2.5 py-1 border shadow-xs flex flex-col justify-center overflow-hidden z-10 ${getStatusStyle(match.status)}`}>
                              <span className="font-bold text-[11px] leading-tight">{match.tripId}</span>
                              <span className="text-[10px] opacity-80 truncate">{match.route}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;