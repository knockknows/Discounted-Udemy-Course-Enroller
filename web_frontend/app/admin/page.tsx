"use client";

import { useEffect, useState, useRef } from "react";
import { fetchLogs, fetchStatus } from "@/lib/api";

export default function AdminPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const refreshData = async () => {
        const statusData = await fetchStatus();
        setIsRunning(statusData.is_running);

        const logsData = await fetchLogs(100);
        setLogs(logsData.logs || []);

        setLoading(false);
    };

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center bg-white p-6 rounded-lg shadow">
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Scraper Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                            {isRunning ? "RUNNING" : "IDLE"}
                        </span>
                    </div>
                    <a href="/" className="text-blue-600 hover:underline">Back to Home</a>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">Real-time Logs</h2>
                        <button
                            onClick={refreshData}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Refresh Now
                        </button>
                    </div>

                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-[600px] overflow-y-auto font-mono text-sm shadow-inner">
                        {loading && logs.length === 0 ? (
                            <div className="text-gray-500 italic">Loading logs...</div>
                        ) : (
                            logs.length > 0 ? (
                                logs.map((log, index) => (
                                    <div key={index} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                        {/* Simple log parsing or just display raw */}
                                        {log}
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 italic">No logs found in Redis</div>
                            )
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </main>
        </div>
    );
}
