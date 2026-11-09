import React, { useState } from 'react';

const Schedule = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [currentDateObj, setCurrentDateObj] = useState(new Date(2026, 10, 5)); // Nov 5, 2026
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Hours columns from 06:00 to 17:00
  const hours = [
    '06:00', '07:00', '08:00', '09:00', '10:00', 
    '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  // Mock vehicle schedule rows
  const vehicleSchedules = [
    {
      id: 'VH-001',
      type: '10T Heavy Truck',
      allocations: [
        { tripId: 'TR-0410', route: 'Main Store > Ja-Ela', startHour: '08:00', span: 2, status: 'green' },
        { tripId: 'TR-0414', route: 'Ja-Ela > Main Store', startHour: '13:00', span: 1, status: 'gray' },
      ]
    },
    {
      id: 'VH-002',
      type: '5T Box Truck',
      allocations: [
        { tripId: 'TR-0412', route: 'Main Store > Kandy', startHour: '10:00', span: 4, status: 'blue' },
      ]
    },
    {
      id: 'VH-003',
      type: '3T Refrigerated',
      allocations: [
        { tripId: 'TR-0409', route: 'Kandy > Ja-Ela', startHour: '07:00', span: 2, status: 'green' },
        { tripId: 'TR-0415', route: 'Store 2 > Main', startHour: '12:00', span: 1, status: 'gray' },
      ]
    },
    {
      id: 'VH-006',
      type: '3T Closed Box',
      allocations: []
    },
    {
      id: 'VH-008',
      type: '10T Heavy Truck',
      allocations: [
        { tripId: 'TR-0417', route: 'Main Store > Kandy', startHour: '14:00', span: 3, status: 'gray' },
      ]
    }
  ];

  // Mock store slot rows for the Store Slots tab
  const storeSlots = [
    {
      id: 'Main Store - Biyagama',
      type: 'Primary Hub',
      allocations: [
        { tripId: 'SL-101', route: 'Dock A (Unloading)', startHour: '07:00', span: 2, status: 'green' },
        { tripId: 'SL-102', route: 'Dock B (Loading)', startHour: '11:00', span: 3, status: 'blue' },
      ]
    },
    {
      id: 'Store 3 - Kandy',
      type: 'Regional Branch',
      allocations: [
        { tripId: 'SL-103', route: 'Main Bay', startHour: '09:00', span: 2, status: 'blue' },
      ]
    },
    {
      id: 'Ja-Ela Hub',
      type: 'Distribution Center',
      allocations: [
        { tripId: 'SL-104', route: 'Bay 1', startHour: '13:00', span: 3, status: 'gray' },
      ]
    }
  ];

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

  const formattedDate = currentDateObj.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'green': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'gray': default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  // Map selected filter name to status keys ('green', 'blue', 'gray')
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

  // Filter allocations dynamically based on selected filter option
  const currentRows = baseRows.map(row => {
    if (!filterCode) return row;
    return {
      ...row,
      allocations: row.allocations.filter(a => a.status === filterCode)
    };
  });

  return (
    <div className="flex-1 flex flex-col justify-between min-w-0 bg-slate-50 p-6 overflow-auto">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedules & Timelines</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor vehicle allocations and store loading slot reservations</p>
          </div>

          {/* Date Navigator & Filters */}
          <div className="flex items-center gap-3 relative">
            <div className="flex items-center bg-white border border-gray-300 rounded-md shadow-sm">
              <button onClick={handlePrevDay} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 border-r border-gray-200 text-sm font-bold">&lt;</button>
              <span className="px-4 py-1.5 text-sm font-medium text-gray-700">Today, {formattedDate}</span>
              <button onClick={handleNextDay} className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 border-l border-gray-200 text-sm font-bold">&gt;</button>
            </div>
            
            {/* Filter Dropdown Toggle */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter: {selectedFilter}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
                  {['All', 'On Trip / Active', 'Planned / Pending', 'Completed'].map((filterName) => (
                    <button
                      key={filterName}
                      onClick={() => { setSelectedFilter(filterName); setIsFilterOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {filterName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Container Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          
          {/* Tabs & Legend Bar */}
          <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('vehicles')} 
                className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-3.5 ${activeTab === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Vehicle Schedules
              </button>
              <button 
                onClick={() => setActiveTab('stores')} 
                className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-3.5 ${activeTab === 'stores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Store Slots
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></span>
                <span>On Trip / Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-100 border border-blue-400"></span>
                <span>Planned / Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></span>
                <span>Completed</span>
              </div>
            </div>
          </div>

          {/* Timeline Table View */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4 w-52 border-r border-gray-200">
                    {activeTab === 'vehicles' ? 'Vehicle / Asset' : 'Store / Location'}
                  </th>
                  {hours.map((hour, idx) => (
                    <th key={idx} className="py-3 px-2 text-center border-r border-gray-100 font-medium">{hour}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
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
                            <div 
                              style={{ gridColumn: `span ${match.span}` }}
                              className={`absolute inset-x-1 top-2 bottom-2 rounded px-2.5 py-1 border shadow-xs flex flex-col justify-center overflow-hidden z-10 ${getStatusStyle(match.status)}`}
                            >
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