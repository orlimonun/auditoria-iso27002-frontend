import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="app-shell">
            <Sidebar />
            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}