import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to recenter map when selected vehicle changes
const MapRecenter = ({ center }) => {
  const map = useMap();
  map.setView(center, map.getZoom(), { animate: true });
  return null;
};

const LiveMap = () => {
  const [vehicles, setVehicles] = useState([
    {
      id: 'WP-CA-5582',
      type: '5T Box Truck',
      status: 'In Transit',
      driver: 'Sunil Fernando',
      tripId: 'TR-0412',
      currentSegment: 'Biyagama Central',
      departure: 'Departed 16:45',
      nextHub: 'Ja-Ela Hub',
      eta: '45 mins',
      lastTimestamp: 'Today, 8:30 PM',
      coordinates: [7.0000, 79.9500]
    },
    {
      id: 'LB-1190',
      type: '10T Heavy Truck',
      status: 'Arriving Soon',
      driver: 'M. Jayasuriya',
      tripId: 'TR-0410',
      currentSegment: 'Approaching Main Hub',
      departure: 'Departed 15:00',
      nextHub: 'Main Store - Biyagama',
      eta: '10 mins',
      lastTimestamp: 'Today, 8:35 PM',
      coordinates: [6.9271, 79.8612]
    }
  ]);

  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);

  const locations = {
    mainStore: [6.9535, 79.9700],
    jaEla: [7.0736, 79.8906],
    kandy: [7.2906, 80.6337]
  };

  const activeRouteCoordinates = [
    locations.mainStore,
    locations.jaEla,
    locations.kandy
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 overflow-auto">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicles in Transit</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">4</span>
              <span className="text-xs text-gray-500">/ 12 Active</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delayed</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">1</span>
              <span className="text-xs text-red-600 font-medium">+15 mins late</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Arriving Soon</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">2</span>
              <span className="text-xs text-gray-500">Next: 30 mins</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Map & Vehicle Selector Workspace */}
      <div className="grid grid-cols-4 gap-6 h-[580px]">
        
        {/* Left Column: Vehicle Selection List */}
        <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">Active Fleet</h2>
            <p className="text-xs text-gray-500">Click a vehicle to track on map</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {vehicles.map((v) => {
              const isSelected = selectedVehicle.id === v.id;
              return (
                <div 
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`p-3.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900 text-sm">{v.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${v.status === 'In Transit' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{v.type}</p>
                  <div className="flex justify-between items-center mt-2 text-[11px] text-gray-600">
                    <span>Driver: {v.driver}</span>
                    <span className="font-medium text-blue-600">{v.tripId}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Real OpenStreetMap View */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-0">
          <MapContainer 
            center={selectedVehicle.coordinates} 
            zoom={11} 
            scrollWheelZoom={true} 
            zoomControl={false} 
            style={{ width: '100%', height: '100%' }}
          >
            {/* Zoom Controls explicitly placed at bottomright */}
            <ZoomControl position="bottomright" />

            <MapRecenter center={selectedVehicle.coordinates} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline positions={activeRouteCoordinates} color="#2563eb" weight={4} dashArray="6, 6" />

            <Marker position={locations.mainStore}>
              <Popup><b>Main Store - Biyagama</b><br />Primary Hub / Dispatch</Popup>
            </Marker>
            <Marker position={locations.jaEla}>
              <Popup><b>Ja-Ela Hub</b><br />Distribution Center</Popup>
            </Marker>
            <Marker position={locations.kandy}>
              <Popup><b>Store 3 - Kandy</b><br />Regional Destination</Popup>
            </Marker>

            <Marker position={selectedVehicle.coordinates}>
              <Popup>
                <b>{selectedVehicle.id} ({selectedVehicle.type})</b><br />
                Driver: {selectedVehicle.driver}<br />
                Status: {selectedVehicle.status}
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Vehicle Detail Info Overlay Card (Top Left) */}
          <div className="absolute left-6 top-6 w-72 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-xl overflow-hidden z-[400]">
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
              <div>
                <span className="font-bold tracking-wide text-sm">{selectedVehicle.id}</span>
                <span className="block text-[10px] text-gray-300">{selectedVehicle.type}</span>
              </div>
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] uppercase font-bold rounded tracking-wider">
                {selectedVehicle.status}
              </span>
            </div>

            <div className="p-4 flex flex-col gap-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-gray-100">
                <div>
                  <span className="text-gray-400 block">Driver</span>
                  <span className="font-semibold text-gray-800">{selectedVehicle.driver}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Trip ID</span>
                  <span className="font-semibold text-gray-800">{selectedVehicle.tripId}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">Current Segment</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="font-bold text-gray-900">{selectedVehicle.currentSegment}</span>
                </div>
                <span className="text-[11px] text-gray-400 pl-4 block mt-0.5">{selectedVehicle.departure}</span>
              </div>

              <div className="pl-4 border-l-2 border-blue-200 my-1">
                <span className="text-gray-400 block">Next Hub</span>
                <span className="font-semibold text-gray-800">{selectedVehicle.nextHub}</span>
                <span className="text-[11px] text-blue-600 font-medium block">ETA: {selectedVehicle.eta}</span>
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-between text-[11px] text-gray-400">
                <span>GPS Timestamp</span>
                <span className="font-medium text-gray-600">{selectedVehicle.lastTimestamp}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LiveMap;