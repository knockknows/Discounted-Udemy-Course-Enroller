import { CoursesResponse } from "@/types";

// Prioritize internal URL for server-side fetches (Docker), fallback to public URL
const API_BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCourses(): Promise<CoursesResponse> {
    try {
        const res = await fetch(`${API_BASE_URL}/courses`, {
            cache: "no-store", // Ensure fresh data
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch courses: ${res.statusText}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error fetching courses:", error);
        return { courses: [], count: 0 };
    }
}
