export interface Course {
    id: number;
    title: string;
    url: string;
    site: string;
    coupon_code: string | null;
    is_free: boolean;
    price: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
    discount_info?: string | null;
    expiration_date?: string | null;
    rating?: string | null;
    total_reviews?: number | null;
    description?: string | null;
    is_subscribed?: boolean;
    verification_status?: "verified_100" | "verified_not_100" | "unverified_error";
    verified_discount_percent?: number | null;
    verified_final_price?: string | null;
    verification_source?: string | null;
    verification_checked_at?: string | null;
    verification_error?: string | null;
    created_at?: string;
}

export interface CoursesResponse {
    courses: Course[];
    count: number;
}
