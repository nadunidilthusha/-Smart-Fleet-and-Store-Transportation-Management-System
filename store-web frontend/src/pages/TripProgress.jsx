import React, { useState } from 'react';
import { Truck, Clock, MapPin, CheckCircle2, Navigation, FileText, Package, X } from 'lucide-react';

const TripProgress = () => {
  // Interactive state hooks
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArrived, setIsArrived] = useState(false);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header Area */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inbound Delivery Tracking</h1>
            <p className="text-sm text-slate-500 mt-1">Trip ID: TR-0412 • Booking Ref: BK-1104-0088</p>
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
              <p className="font-bold text-slate-900 text-sm">WP-CA-5582</p>
              <p className="text-xs text-slate-500">5T Box Truck • Sunil Fernando</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Estimated Arrival</p>
                <p className="font-bold text-slate-900 text-lg">14:30 PM</p>
                <p className="text-xs text-slate-500">Today, 5 Nov (In ~45 mins)</p>
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
                {!isArrived && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isArrived ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              </span>
              <p className={`font-bold text-sm ${isArrived ? 'text-emerald-600' : 'text-blue-600'}`}>
                {receiptConfirmed ? 'Delivered & Confirmed' : isArrived ? 'Arrived at Store' : 'In Transit'}
              </p>
            </div>
            <p className="text-xs text-slate-500">{isArrived ? 'Vehicle docked at Kandy' : 'Departed Biyagama Central'}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Location Update</p>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Navigation size={14} className="text-slate-400" />
              <p className="font-bold text-slate-900 text-sm">Nittambuwa Bypass Road</p>
            </div>
            <p className="text-xs text-slate-500">Synced 2 minutes ago</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-8 pb-8 h-full">
        
        {/* Left: Map Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="absolute inset-0 bg-slate-50/80"></div>
          
          <div className="relative h-full p-8 flex flex-col justify-between">
            <div className="absolute left-10 bottom-20 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border-4 border-white bg-slate-300 shadow-md z-10"></div>
              <p className="mt-2 text-xs font-bold text-slate-600">Main Store</p>
              <p className="text-[10px] text-slate-400">Departed</p>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <path d="M 50,450 Q 250,300 350,250" fill="none" stroke="#3b82f6" strokeWidth="4" />
              <path d="M 350,250 Q 550,150 700,200" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="8 8" />
            </svg>

            <div className="absolute left-[340px] top-[240px] flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full border-4 border-white bg-blue-500 shadow-lg flex items-center justify-center">
                 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>

            <div className="absolute left-[680px] top-[170px] flex flex-col items-center z-10">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-500 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L22 20H2L12 2Z" />
                </svg>
              </div>
              <p className="mt-1 text-sm font-bold text-amber-700">Your Store (Kandy)</p>
            </div>

            {/* Simulation Simulator Toggle on Map */}
            <div className="absolute top-4 right-4 z-20 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
              <button 
                onClick={() => setIsArrived(!isArrived)} 
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors"
              >
                {isArrived ? 'Simulate In-Transit' : 'Simulate Arrival'}
              </button>
            </div>

            <div className="absolute right-6 bottom-6 flex flex-col gap-2 bg-white rounded-lg shadow-sm border border-slate-200">
              <button className="p-2 text-slate-600 hover:bg-slate-50 border-b border-slate-100 rounded-t-lg"><PlusIcon /></button>
              <button className="p-2 text-slate-600 hover:bg-slate-50 rounded-b-lg"><MinusIcon /></button>
            </div>
          </div>
        </div>

        {/* Right: Timeline & Action */}
        <div className="w-80 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1 flex flex-col">
            <h2 className="font-semibold text-slate-900 mb-6">Trip Event Timeline</h2>
            
            <div className="flex-1 relative overflow-y-auto">
              <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-slate-100"></div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Booking Approved</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Approved by Naduni P. (Admin)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">04 Nov, 14:15</p>
                </div>
              </div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Goods Prepared</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">400 units packed at Main Store</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">05 Nov, 08:30</p>
                </div>
              </div>

              <div className="flex gap-4 relative pb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Dispatched</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Handed over to Driver (WP-CA-5582)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">05 Nov, 09:15</p>
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
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {isArrived ? 'Vehicle is parked and ready for unloading.' : 'Vehicle is en route to Kandy Regional Store.'}
                  </p>
                </div>
              </div>
            </div>

            {receiptConfirmed ? (
              <div className="mt-6 w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm rounded-lg text-center">
                ✓ Receipt Successfully Confirmed
              </div>
            ) : (
              <button 
                onClick={() => {
                  setReceiptConfirmed(true);
                  alert("Goods successfully received and recorded into inventory!");
                }}
                disabled={!isArrived}
                className={`mt-6 w-full py-3 font-semibold text-sm rounded-lg transition-all ${
                  isArrived 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer' 
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
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Booking Ref: BK-1104-0088</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Origin Store</p>
                  <p className="font-semibold text-slate-800">Main Store - Biyagama</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Destination Store</p>
                  <p className="font-semibold text-slate-800">Store 3 - Kandy</p>
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
                        <td className="p-3 font-medium text-slate-800">Steel Flange (100mm)</td>
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
};

// SVG Icons for Map Controls
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
);
const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
);

export default TripProgress;