import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { getStoreSchedule } from "../api/scheduleApi";

const CARD = "min-w-0 rounded-xl border border-line bg-white";
const TH = "whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-xs font-medium text-mute border-b border-line";
const TD = "whitespace-nowrap border-b border-line px-4 py-3 text-[13px]";

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function StoreSchedule() {
  const [date, setDate] = useState(toInputDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    getStoreSchedule(date)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        if (alive) setError("Could not load the schedule for this date.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [date]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Store Schedule</h1>
          <p className="text-sm text-mute">View your loading and unloading slots</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="schedule-date" className="text-sm font-medium text-slate-700">Date:</label>
          <input
            id="schedule-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {error && (
        <div className={`${CARD} p-6 text-center text-bad`}>
          {error}
        </div>
      )}

      {!error && loading && <p className="py-10 text-center text-mute">Loading schedule…</p>}

      {!error && !loading && data && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main Schedule Table */}
          <section className={CARD}>
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <CalendarIcon size={18} className="text-brand" />
              <h2 className="text-[15px] font-semibold">Reserved Slots</h2>
            </div>
            
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Time</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slots.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-mute">
                        No slots scheduled for this date.
                      </td>
                    </tr>
                  ) : (
                    data.slots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className={`${TD} font-medium`}>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} className="text-mute" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </td>
                        <td className={TD}>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            slot.status === "Reserved" 
                              ? "bg-amber-50 text-amber-700 border border-amber-200" 
                              : "bg-green-50 text-green-700 border border-green-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${slot.status === "Reserved" ? "bg-amber-500" : "bg-green-500"}`} />
                            {slot.status}
                          </span>
                        </td>
                        <td className={`${TD} text-mute`}>
                          {slot.booking ? (
                            <span className="font-medium text-ink">{slot.booking.code}</span>
                          ) : slot.trip ? (
                            <span className="font-medium text-ink">{slot.trip.code}</span>
                          ) : (
                            "Available"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sidebar Info */}
          <aside className={`${CARD} p-5 h-fit`}>
            <h3 className="text-[13px] font-semibold mb-3">Schedule Rules</h3>
            <ul className="text-[13px] text-mute space-y-2">
              <li className="flex gap-2">
                <span className="text-brand">•</span>
                Slots are automatically reserved when an Admin approves a booking.
              </li>
              <li className="flex gap-2">
                <span className="text-brand">•</span>
                A maximum of 2 vehicles can be processed simultaneously.
              </li>
              <li className="flex gap-2">
                <span className="text-brand">•</span>
                Please ensure goods are ready before the slot begins.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}