"use client";

import { useState, useEffect } from "react";
import { Logger } from "@/lib/logger";
import { fetchStatus } from "@/lib/api";

export default function ScrapeButton() {
    const [loading, setLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const status = await fetchStatus();
            setIsRunning(status.is_running);
            if (status.is_running) {
                setLoading(true);
            } else if (loading && !status.is_running) {
                // Was running, now finished
                setLoading(false);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [loading]);

    const handleScrape = async () => {
        setLoading(true);
        const resolvedApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        Logger.info("ScrapeButton", "Initiating scrape", {
            env_url: process.env.NEXT_PUBLIC_API_URL,
            resolved_url: resolvedApiUrl
        });

        try {
            const response = await fetch(`${resolvedApiUrl}/scrape`, {
                method: "POST",
            });

            Logger.info("ScrapeButton", "Response received", { status: response.status });

            if (response.ok) {
                alert("Scraping started! Refresh the page in a few minutes.");
            } else {
                const errorText = await response.text();
                Logger.error("ScrapeButton", "Backend returned error", { status: response.status, body: errorText });
                alert(`Failed to start scraping. Status: ${response.status}`);
            }
        } catch (error: any) {
            Logger.error("ScrapeButton", "Fetch failed", error);
            alert(`Error connecting to backend: ${error.message}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleScrape}
                disabled={loading || isRunning}
                className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${loading || isRunning
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
            >
                {isRunning ? "Scraper Running..." : (loading ? "Starting..." : "Check Now")}
            </button>
            {isRunning && <span className="text-xs text-blue-600 animate-pulse">Running in background...</span>}
        </div>
    );
}
