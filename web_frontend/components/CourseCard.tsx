import React, { useState } from "react";
import { Course } from "@/types";
import { toggleSubscription } from "@/lib/api";

interface CourseCardProps {
    course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course: initialCourse }) => {
    const [course, setCourse] = useState(initialCourse);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSubscribe = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isUpdating || !course.id) return;

        setIsUpdating(true);
        // Optimistic UI update
        setCourse(prev => ({ ...prev, is_subscribed: !prev.is_subscribed }));

        const updatedCourse = await toggleSubscription(course.id);
        if (updatedCourse) {
            setCourse(updatedCourse);
        } else {
            // Revert on failure
            setCourse(prev => ({ ...prev, is_subscribed: !prev.is_subscribed }));
        }
        setIsUpdating(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            {/* Thumbnail */}
            <div className="relative h-48 w-full bg-gray-200">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=No+Image';
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <span>No Image</span>
                    </div>
                )}
                <div className="absolute z-10 top-2 right-2 flex flex-col gap-1 items-end">
                    <button
                        onClick={handleSubscribe}
                        disabled={isUpdating}
                        className={`p-1.5 rounded-full bg-white shadow-md hover:scale-110 transition-transform ${course.is_subscribed ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-500'}`}
                        title={course.is_subscribed ? "Unsubscribe" : "Subscribe"}
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                    </button>
                    {course.is_free && (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-500 text-white shadow">
                            FREE
                        </span>
                    )}
                    {course.discount_info && !course.is_free && (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-red-500 text-white shadow">
                            {course.discount_info}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {course.site}
                    </span>
                    {course.category && (
                        <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded">
                            {course.category}
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 h-14" title={course.title}>
                    <a href={course.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                        {course.title}
                    </a>
                </h3>

                {/* Rating Info */}
                {(course.rating || course.total_reviews) && (
                    <div className="flex items-center gap-1 mb-2">
                        {course.rating && (
                            <div className="flex items-center text-yellow-500">
                                <span className="font-bold text-sm">{parseFloat(course.rating).toFixed(1)}</span>
                                <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                            </div>
                        )}
                        {course.total_reviews && (
                            <span className="text-xs text-gray-400">({course.total_reviews.toLocaleString()})</span>
                        )}
                    </div>
                )}

                {course.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {course.description}
                    </p>
                )}

                <div className="text-sm text-gray-500 mb-4 space-y-1">
                    {course.coupon_code ? (
                        <div className="flex items-center gap-1">
                            <span className="font-medium">Coupon:</span>
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{course.coupon_code}</code>
                        </div>
                    ) : (
                        <div>No Coupon Code</div>
                    )}

                    {course.expiration_date && (
                        <div className="text-xs text-orange-600">
                            Expires: {course.expiration_date}
                        </div>
                    )}
                    {course.created_at && (
                        <div className="text-xs text-gray-400">
                            Crawled: {new Date(course.created_at).toLocaleDateString()}
                        </div>
                    )}
                </div>

                <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                    Enroll Now
                </a>
            </div>
        </div>
    );
};

export default CourseCard;
