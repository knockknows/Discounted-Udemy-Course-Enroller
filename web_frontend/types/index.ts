export interface Course {
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
}

export interface CoursesResponse {
    courses: Course[];
    count: number;
}
