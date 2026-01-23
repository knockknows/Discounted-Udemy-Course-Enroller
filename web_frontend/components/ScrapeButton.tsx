"use client";

import { useState } from "react";

export default function ScrapeButton() {
    const [loading, setLoading] = useState(false);

    const handleScrape = async () => {
        setLoading(true);
        const resolvedApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log("ScrapeButton: Initiating scrape...");
        console.log("ScrapeButton: NEXT_PUBLIC_API_URL env var:", process.env.NEXT_PUBLIC_API_URL);
        console.log("ScrapeButton: Resolved API URL:", resolvedApiUrl);

        try {
            const response = await fetch(`${resolvedApiUrl}/scrape`, {
                method: "POST",
            });
            console.log("ScrapeButton: Response status:", response.status);

            if (response.ok) {
                alert("Scraping started! Refresh the page in a few minutes.");
            } else {
                const errorText = await response.text();
                console.error("ScrapeButton: Backend returned error:", errorText);
                alert(`Failed to start scraping. Status: ${response.status}`);
            }
        } catch (error: any) {
            console.error("ScrapeButton: Fetch Error Details:", {
                message: error.message,
                cause: error.cause,
                stack: error.stack
            });
            alert(`Error connecting to backend: ${error.message}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleScrape}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
        >
            {loading ? "Starting Scrape..." : "Check Now"}
        </button>
    );
}
