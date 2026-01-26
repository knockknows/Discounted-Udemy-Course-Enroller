import { fetchCourses } from "@/lib/api";
import ScrapeButton from "@/components/ScrapeButton";
import CourseGrid from "@/components/CourseGrid";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { courses, count } = await fetchCourses();

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discounted Udemy Courses</h1>
          <p className="text-gray-600 mt-2">Found {count} free courses available now</p>
        </div>
        <ScrapeButton />
      </header>

      <div className="max-w-7xl mx-auto">
        <CourseGrid initialCourses={courses} />
      </div>
    </main>
  );
}
