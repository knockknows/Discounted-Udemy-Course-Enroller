"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CourseCard from "@/components/CourseCard";
import { Course } from "@/types";

interface CourseGridProps {
    initialCourses: Course[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

export default function CourseGrid({ initialCourses = [], totalCount = 0, currentPage = 1, totalPages = 1 }: CourseGridProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";
    const initialShowFreeOnly = searchParams.get("show_free_only") === "false" ? false : true;
    const initialIsSubscribed = searchParams.get("is_subscribed") === "true";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [showFreeOnly, setShowFreeOnly] = useState(initialShowFreeOnly);
    const [showSubscribedOnly, setShowSubscribedOnly] = useState(initialIsSubscribed);

    // Debounce search update
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery !== initialSearch) {
                updateUrl(searchQuery, selectedCategory, showFreeOnly, showSubscribedOnly, 1);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Udemy Standard Categories (Hardcoded for stability)
    const categories = [
        "All",
        "Business",
        "Design",
        "Development",
        "Finance & Accounting",
        "Health & Fitness",
        "IT & Software",
        "Lifestyle",
        "Marketing",
        "Music",
        "Office Productivity",
        "Personal Development",
        "Photography & Video",
        "Teaching & Academics",
        "Uncategorized"
    ];

    const updateUrl = (search: string, category: string, freeOnly: boolean, subscribedOnly: boolean, page: number) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search) params.set("search", search);
        if (category && category !== "All") params.set("category", category);
        if (!freeOnly) params.set("show_free_only", "false"); // Only set if false (since default is true)
        if (subscribedOnly) params.set("is_subscribed", "true");

        router.push(`/?${params.toString()}`);
    };

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        updateUrl(searchQuery, cat, showFreeOnly, showSubscribedOnly, 1); // Reset to page 1
    };

    const handleFreeToggle = () => {
        const newVal = !showFreeOnly;
        setShowFreeOnly(newVal);
        updateUrl(searchQuery, selectedCategory, newVal, showSubscribedOnly, 1); // Reset to page 1
    };

    const handleSubscribedToggle = () => {
        const newVal = !showSubscribedOnly;
        setShowSubscribedOnly(newVal);
        updateUrl(searchQuery, selectedCategory, showFreeOnly, newVal, 1); // Reset to page 1
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            updateUrl(searchQuery, selectedCategory, showFreeOnly, showSubscribedOnly, newPage);
        }
    };

    return (
        <div>
            {/* Search and Filter Controls */}
            <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div className="flex-1 w-full md:w-auto flex gap-2">
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <select
                        value={selectedCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleFreeToggle}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${showFreeOnly
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        {showFreeOnly ? "100% OFF Only" : "All Discounts"}
                    </button>
                    <button
                        onClick={handleSubscribedToggle}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${showSubscribedOnly
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        {showSubscribedOnly ? "Subscribed Only" : "Favorites"}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {initialCourses.length > 0 ? (
                    initialCourses.map((course: Course, index: number) => (
                        <CourseCard key={`${course.url}-${index}`} course={course} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white rounded-lg shadow-sm">
                        <h2 className="text-xl text-gray-600">No courses match your criteria.</h2>
                        <div className="mt-2 text-sm text-gray-500">
                            Try adjusting your filters (e.g. toggle 100% OFF).
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory("All");
                                setShowFreeOnly(true);
                                setShowSubscribedOnly(false);
                                updateUrl("", "All", true, false, 1);
                            }}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination UI */}
            <div className="mt-8 flex justify-center items-center gap-4">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                    Previous
                </button>
                <span className="text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                    Next
                </button>
            </div>

            <div className="mt-4 text-sm text-gray-400 text-center">
                Total Courses: {totalCount}
            </div>
        </div>
    );
}
