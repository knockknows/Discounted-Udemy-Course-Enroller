import { fetchCourses } from "@/lib/api";
import CourseCard from "@/components/CourseCard";
import { Course } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { courses, count } = await fetchCourses();

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discounted Udemy Courses</h1>
          <p className="text-gray-600 mt-2">Found {count} free courses available now</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {courses.length > 0 ? (
          courses.map((course: Course, index: number) => (
            <CourseCard key={`${course.url}-${index}`} course={course} />
          ))
        ) : (
          <div className="col-span-full text-center py-20">
            <h2 className="text-xl text-gray-600">No courses found right now.</h2>
            <p className="text-gray-500">Check back later or ensure the backend scraper is running.</p>
          </div>
        )}
      </div>
    </main>
  );
}
