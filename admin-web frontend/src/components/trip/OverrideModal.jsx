import React from 'react';

const OverrideModal = ({ isOpen, onClose, onConfirm, vehicle }) => {
  if (!isOpen) return null;

  const vehicleDisplay = vehicle ? `${vehicle.id} (${vehicle.type})` : 'No vehicle selected';
  const driverDisplay = vehicle ? vehicle.driver : '-';
  const warningId = vehicle ? vehicle.id : '[Unknown]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-xl flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Manual Assignment Override</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-800">Warning: Schedule Conflict</h3>
              <p className="text-sm text-red-700 mt-1">
                Selected vehicle ({warningId}) schedule conflicts with another active trip. Proceeding will require the driver to resolve overlaps.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Selected Vehicle</label>
              <input type="text" value={vehicleDisplay} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 font-medium" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Driver</label>
              <input type="text" value={driverDisplay} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 font-medium" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Override Reason <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Please provide a business justification for this manual assignment.</p>
            <textarea rows="3" placeholder="E.g., Approved by Operations Manager due to urgent delivery requirement..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          {/* 
            FIX: Added onClick={onConfirm} to the red button 
          */}
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded-md text-sm font-medium text-white hover:bg-red-700 transition-colors">
            Confirm Override
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default OverrideModal;