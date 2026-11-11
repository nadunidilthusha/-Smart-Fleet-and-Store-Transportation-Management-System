import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, CheckCircle2, Navigation, FileText, Package, X } from 'lucide-react';

// Fix for default Leaflet marker icon issue in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function TripProgressDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const tripId = id || 'TR-0412';

  // Load trip details from localStorage or use fallback
  const [tripData] = useState(() => {
    const saved = localStorage.getItem('store_inbound_trips');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const found = parsed.find(t => t.id === tripId);
        if (found) return found;
      } catch (e) {}
    }
    return { id: tripId, ref: 'BK-1104-0088', vehicle: 'WP-CA-5582 (5T Truck)', origin: 'Main Store - Biyagama', dest: 'Store 3 - Kandy', status: 'In Transit' };
  });

  // Interactive States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArrived, setIsArrived] = useState(tripData.status === 'Arrived');
  const [receiptConfirmed, setReceiptConfirmed] = useState(tripData.status === 'Arrived');

  // GPS Coordinates for Leaflet Map
  const originCoords = [7.0046, 79.9925]; // Biyagama
  const liveCoords = isArrived ? [7.2906, 80.6337] : [7.1540, 80.2070]; // Nittambuwa -> Kandy
  const destCoords = [7.2906, 80.6337];   // Kandy Store

  const handleConfirmReceipt = () => {
    setReceiptConfirmed(true);
    
    // Update localStorage so list reflects change immediately
    const saved = localStorage.getItem('store_inbound_trips');
    if (saved) {
      try {
        let trips = JSON.parse(saved);
        trips = trips.map(t => t.id === tripId ? { ...t, status: 'Arrived', eta: 'Delivered' } : t);
        localStorage.setItem('store_inbound_trips', JSON.stringify(trips));
      } catch (e) {}
    }

    alert(`Success! Goods for trip ${tripId} have been received and verified into store inventory.`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header Area */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/trip-progress')} className="text-xs text-blue-600 font-semibold hover:underline mb-1 block">
              ← Back to Shipments List
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Inbound Delivery Tracking ({tripId})</h1>
            <p className="text-sm text-slate-500 mt-1">Trip ID: {tripId} • Booking Ref: {tripData.ref}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2"
          >
            <FileText size={16} /> View Booking Details
          </button>
        </div>

        {/* Top Status Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3">
            <div className="mt-1 text-slate-400"><Truck size={20} /></div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Vehicle</p>
              <p className="font-bold text-slate-900 text-sm">{tripData.vehicle.split(' ')[0]}</p>
              <p className="text-xs text-slate-500">{tripData.vehicle}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Arrival</p>
                <p className="font-bold text-slate-900 text-lg">14:30 PM</p>
                <p className="text-xs text-slate-500">Today, 5 Nov</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                On Time
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Trip Status</p>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="relative flex h-2.5 w-2.5">
                {!isArrived && !receiptConfirmed && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isArrived || receiptConfirmed ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              </span>
              <p className={`font-bold text-sm ${isArrived || receiptConfirmed ? 'text-emerald-600' : 'text-blue-600'}`}>
                {receiptConfirmed ? 'Delivered & Confirmed' : isArrived ? 'Arrived at Store' : 'In Transit'}
              </p>
            </div>
            <p className="text-xs text-slate-500">{isArrived ? 'Vehicle docked at Kandy Bay' : `Departed ${tripData.origin}`}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Location Update</p>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Navigation size={14} className="text-slate-400" />
              <p className="font-bold text-slate-900 text-sm">Nittambuwa Bypass Road</p>
            </div>
            <p className="text-xs text-slate-500">Synced just now</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-8 pb-8">
        
        {/* Left: Real Leaflet Map Container with forced explicit height */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative z-0 h-[480px]">
          <MapContainer center={liveCoords} zoom={11} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={originCoords}>
              <Popup><b>Origin: {tripData.origin}</b></Popup>
            </Marker>
            
            <Marker position={liveCoords}>
              <Popup><b>Vehicle: {tripData.vehicle}</b><br />{isArrived ? 'Arrived at destination' : 'In Transit'}</Popup>
            </Marker>

            <Marker position={destCoords}>
              <Popup><b>Destination: {tripData.dest}</b></Popup>
            </Marker>

            <Polyline positions={[originCoords, liveCoords, destCoords]} color="#3b82f6" weight={4} dashArray="6, 6" />
          </MapContainer>

          {/* Simulation Toggle Button Floating on Map */}
          <div className="absolute top-4 right-4 z-[400] bg-white p-2 rounded-lg shadow-md border border-slate-200">
            <button 
              onClick={() => setIsArrived(!isArrived)} 
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors shadow"
            >
              {isArrived ? '🔄 Reset to In-Transit' : '🚀 Simulate Arrival at Bay'}
            </button>
          </div>
        </div>

        {/* Right: Timeline & Action */}
        <div className="w-80 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1 flex flex-col h-[480px]">
            <h2 className="font-semibold text-slate-900 mb-6">Trip Event Timeline</h2>
            
            <div className="flex-1 relative overflow-y-auto pr-2">
              <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-slate-100"></div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Booking Approved</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Approved by Admin Office</p>
                </div>
              </div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Goods Prepared</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Packed at {tripData.origin}</p>
                </div>
              </div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Dispatched</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Handed over to Driver</p>
                </div>
              </div>

              <div className="flex gap-4 relative pb-8">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 mt-0.5 shadow-sm ${isArrived ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 border-2 border-blue-500'}`}>
                  {isArrived ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${isArrived ? 'text-slate-900' : 'text-blue-700'}`}>
                    {isArrived ? 'Arrived at Store Bay' : 'In Transit'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isArrived ? 'Vehicle is parked and ready for unloading.' : 'Vehicle moving along route.'}
                  </p>
                </div>
              </div>
            </div>

            {receiptConfirmed ? (
              <div className="mt-4 w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm rounded-lg text-center">
                ✓ Receipt Successfully Confirmed
              </div>
            ) : (
              <button 
                onClick={handleConfirmReceipt}
                disabled={!isArrived}
                className={`mt-4 w-full py-3 font-semibold text-sm rounded-lg transition-all ${
                  isArrived 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer' 
                    : 'bg-blue-100 text-blue-400 border border-blue-200 cursor-not-allowed'
                }`}
              >
                {isArrived ? 'Confirm Receipt of Goods' : 'Confirm Receipt (Disabled until Arrival)'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* --- VIEW BOOKING DETAILS MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Booking Ref: {tripData.ref}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Origin Store</p>
                  <p className="font-semibold text-slate-800">{tripData.origin}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Destination Store</p>
                  <p className="font-semibold text-slate-800">{tripData.dest}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Manifest Items</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-medium text-slate-800">Industrial Materials ({tripData.ref})</td>
                        <td className="p-3 text-right text-slate-600">400 units</td>
                        <td className="p-3 text-right text-slate-600">1,200 kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}