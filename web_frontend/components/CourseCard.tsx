import React from "react";
import { Course } from "@/types";

interface CourseCardProps {
    course: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {course.site}
                    </span>
                    {course.is_free && (
                        <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800">
                            FREE
                        </span>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 h-14">
                    <a href={course.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                        {course.title}
                    </a>
                </h3>

                <div className="text-sm text-gray-500 mb-4">
                    {course.coupon_code ? (
                        <div className="flex items-center gap-1">
                            <span className="font-medium">Coupon:</span>
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{course.coupon_code}</code>
                        </div>
                    ) : (
                        <span>No Coupon Code</span>
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
