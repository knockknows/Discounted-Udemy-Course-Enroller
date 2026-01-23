"use client";

import { useState } from "react";

export default function ScrapeButton() {
    const [loading, setLoading] = useState(false);

    const handleScrape = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/scrape", {
                method: "POST",
            });
            if (response.ok) {
                alert("Scraping started! Refresh the page in a few minutes.");
            } else {
                alert("Failed to start scraping.");
            }
        } catch (error) {
            console.error("Scrape error:", error);
            alert("Error connecting to backend.");
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
