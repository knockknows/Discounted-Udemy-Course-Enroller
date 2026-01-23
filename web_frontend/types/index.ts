export interface Course {
    title: string;
    url: string;
    site: string;
    coupon_code: string | null;
    is_free: boolean;
    price: string | null;
}

export interface CoursesResponse {
    courses: Course[];
    count: number;
}
