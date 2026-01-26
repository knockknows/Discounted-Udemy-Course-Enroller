"use client";

import { useState, useMemo } from "react";
import CourseCard from "@/components/CourseCard";
import { Course } from "@/types";

interface CourseGridProps {
    initialCourses: Course[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

export default function CourseGrid({ initialCourses, totalCount, currentPage, totalPages }: CourseGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [showFreeOnly, setShowFreeOnly] = useState<boolean>(true); // Default to Free Only as requested

    // Extract unique categories from visible courses (client-side only for now)
    // Note: Ideally categories should come from API, but we'll extract from current batch + filtering logic handles it
    const categories = useMemo(() => {
        const cats = new Set(initialCourses.map(c => c.category || "Uncategorized"));
        return ["All", ...Array.from(cats)].sort();
    }, [initialCourses]);

    // Filter courses
    const filteredCourses = useMemo(() => {
        return initialCourses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || (course.category || "Uncategorized") === selectedCategory;
            // Strict 100% off check (is_free or discount_info contains 100% check?)
            // Assuming is_free is the reliable flag for 100% off
            const matchesFree = !showFreeOnly || course.is_free;

            return matchesSearch && matchesCategory && matchesFree;
        });
    }, [initialCourses, searchQuery, selectedCategory, showFreeOnly]);

    // Pagination Controls
    // Note: Since this component receives a slice of data from SSR, client-side pagination 
    // only filters that slice. Real server pagination requires navigation or router refresh.
    // For this implementation, I will treat 'initialCourses' as the *page* data.
    // To implement "paging to display over 100 courses", we should likely use the Next.js router
    // to navigate to ?page=2. 

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            window.location.href = `/?page=${newPage}`;
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
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowFreeOnly(!showFreeOnly)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${showFreeOnly
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                    >
                        {showFreeOnly ? "100% OFF Only" : "All Discounts"}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredCourses.length > 0 ? (
                    filteredCourses.map((course: Course, index: number) => (
                        <CourseCard key={`${course.url}-${index}`} course={course} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white rounded-lg shadow-sm">
                        <h2 className="text-xl text-gray-600">No courses match your criteria.</h2>
                        <button
                            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setShowFreeOnly(true); }}
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
