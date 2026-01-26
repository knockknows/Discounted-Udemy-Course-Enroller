"use client";

import { useState, useMemo } from "react";
import CourseCard from "@/components/CourseCard";
import { Course } from "@/types";

interface CourseGridProps {
    initialCourses: Course[];
}

export default function CourseGrid({ initialCourses }: CourseGridProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(initialCourses.map(c => c.category || "Uncategorized"));
        return ["All", ...Array.from(cats)].sort();
    }, [initialCourses]);

    // Filter courses
    const filteredCourses = useMemo(() => {
        return initialCourses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "All" || (course.category || "Uncategorized") === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [initialCourses, searchQuery, selectedCategory]);

    return (
        <div>
            {/* Search and Filter Controls */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
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
                            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-400 text-center">
                Showing {filteredCourses.length} of {initialCourses.length} courses
            </div>
        </div>
    );
}
