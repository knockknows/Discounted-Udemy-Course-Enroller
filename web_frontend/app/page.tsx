import { fetchCourses, fetchLanguages } from "@/lib/api";
import ScrapeButton from "@/components/ScrapeButton";
import CourseGrid from "@/components/CourseGrid";

export const dynamic = "force-dynamic";

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const search = typeof searchParams.search === "string" ? searchParams.search : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "All";
  const language = typeof searchParams.language === "string" ? searchParams.language : "All";

  // Default to false so flagged/non-100 items remain visible unless explicitly filtered.
  const rawShowFree = searchParams.show_free_only;
  const isTrue = rawShowFree === "true" || (Array.isArray(rawShowFree) && rawShowFree[0] === "true");
  const showFreeOnly = isTrue;

  const rawIsSubscribed = searchParams.is_subscribed;
  const isSubscribed = rawIsSubscribed === "true" || (Array.isArray(rawIsSubscribed) && rawIsSubscribed[0] === "true") ? true : undefined;

  const [{ courses, count }, { languages }] = await Promise.all([
    fetchCourses(page, 20, search, category, language, showFreeOnly, isSubscribed),
    fetchLanguages(),
  ]);
  const totalPages = Math.ceil(count / 20);

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discounted Udemy Courses</h1>
          <p className="text-gray-600 mt-2">Found {count} courses (with verification status)</p>
        </div>
        <ScrapeButton />
      </header>

      <div className="max-w-7xl mx-auto">
        <CourseGrid
          initialCourses={courses}
          availableLanguages={["All", ...languages]}
          totalCount={count}
          currentPage={page}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
