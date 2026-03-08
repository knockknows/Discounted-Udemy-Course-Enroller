"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CourseCard from "@/components/CourseCard";
import { Course } from "@/types";

interface CourseGridProps {
    initialCourses: Course[];
    availableLanguages?: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

export default function CourseGrid({
    initialCourses = [],
    availableLanguages = ["All"],
    totalCount = 0,
    currentPage = 1,
    totalPages = 1
}: CourseGridProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL
    const initialSearch = searchParams.get("search") || "";
    const initialCategory = searchParams.get("category") || "All";
    const initialLanguage = searchParams.get("language") || "All";
    const initialDiscountFilter =
        searchParams.get("discount_filter") === "100" || searchParams.get("discount_filter") === "0"
            ? (searchParams.get("discount_filter") as "100" | "0")
            : "all";
    const initialIsSubscribed = searchParams.get("is_subscribed") === "true";

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
    const [selectedDiscountFilter, setSelectedDiscountFilter] = useState<"all" | "100" | "0">(initialDiscountFilter);
    const [showSubscribedOnly, setShowSubscribedOnly] = useState(initialIsSubscribed);

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

    const updateUrl = (
        search: string,
        category: string,
        language: string,
        discountFilter: "all" | "100" | "0",
        subscribedOnly: boolean,
        page: number
    ) => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (search) params.set("search", search);
        if (category && category !== "All") params.set("category", category);
        if (language && language !== "All") params.set("language", language);
        if (discountFilter !== "all") params.set("discount_filter", discountFilter);
        if (subscribedOnly) params.set("is_subscribed", "true");

        router.push(`/?${params.toString()}`);
    };

    // Debounce search update
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery !== initialSearch) {
                updateUrl(searchQuery, selectedCategory, selectedLanguage, selectedDiscountFilter, showSubscribedOnly, 1);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        updateUrl(searchQuery, cat, selectedLanguage, selectedDiscountFilter, showSubscribedOnly, 1); // Reset to page 1
    };

    const handleLanguageChange = (lang: string) => {
        setSelectedLanguage(lang);
        updateUrl(searchQuery, selectedCategory, lang, selectedDiscountFilter, showSubscribedOnly, 1); // Reset to page 1
    };

    const handleDiscountFilterChange = (value: "all" | "100" | "0") => {
        setSelectedDiscountFilter(value);
        updateUrl(searchQuery, selectedCategory, selectedLanguage, value, showSubscribedOnly, 1); // Reset to page 1
    };

    const handleSubscribedToggle = () => {
        const newVal = !showSubscribedOnly;
        setShowSubscribedOnly(newVal);
        updateUrl(searchQuery, selectedCategory, selectedLanguage, selectedDiscountFilter, newVal, 1); // Reset to page 1
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            updateUrl(searchQuery, selectedCategory, selectedLanguage, selectedDiscountFilter, showSubscribedOnly, newPage);
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
                    <select
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {availableLanguages.map((language) => (
                            <option key={language} value={language}>{language}</option>
                        ))}
                    </select>
                    <select
                        value={selectedDiscountFilter}
                        onChange={(e) => handleDiscountFilterChange(e.target.value as "all" | "100" | "0")}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="all">All Discounts</option>
                        <option value="100">100% Discount</option>
                        <option value="0">0% Discount</option>
                    </select>
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
                            Try adjusting your filters (e.g. 100% Discount / 0% Discount).
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory("All");
                                setSelectedLanguage("All");
                                setSelectedDiscountFilter("all");
                                setShowSubscribedOnly(false);
                                updateUrl("", "All", "All", "all", false, 1);
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
