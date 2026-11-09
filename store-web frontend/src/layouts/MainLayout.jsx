import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { APP_FULL_NAME, APP_NAME, APP_VERSION } from "../utils/constants";

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-7 pb-8 pt-6">
          <div className="mx-auto max-w-330">
            <Outlet />
            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[13px] text-mute">
              <span>
                © {new Date().getFullYear()} {APP_NAME} · {APP_FULL_NAME}
              </span>
              <span className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full bg-ok" />
                  System Operational
                </span>
                <span>Version {APP_VERSION}</span>
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
