import { CoursesResponse, Course } from "@/types";

// Prioritize internal URL for server-side fetches (Docker), fallback to public URL
const API_BASE_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCourses(
    page: number = 1,
    limit: number = 20,
    search: string = "",
    category: string = "All",
    showFreeOnly: boolean = false,
    isSubscribed?: boolean,
    verification: string = "all"
): Promise<CoursesResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        show_free_only: showFreeOnly.toString() // API expects snake_case
    });

    if (search) params.append("search", search);
    if (category && category !== "All") params.append("category", category);
    if (isSubscribed !== undefined) params.append("is_subscribed", isSubscribed.toString());
    if (verification !== "all") params.append("verification", verification);

    try {
        const res = await fetch(`${API_BASE_URL}/courses?${params.toString()}`, {
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

export async function toggleSubscription(courseId: number): Promise<Course | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/courses/${courseId}/subscribe`, {
            method: "PUT",
        });

        if (!res.ok) {
            throw new Error(`Failed to toggle subscription: ${res.statusText}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error toggling subscription:", error);
        return null;
    }
}

export async function fetchLogs(limit: number = 100): Promise<{ logs: string[], error?: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/logs?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch logs");
        return await res.json();
    } catch (error) {
        return { logs: [], error: String(error) };
    }
}

export async function fetchStatus(): Promise<{ is_running: boolean, error?: string }> {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/status`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch status");
        return await res.json();
    } catch (error) {
        return { is_running: false, error: String(error) };
    }
}
