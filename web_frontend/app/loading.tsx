export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-5 w-48 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex-1 w-full md:w-auto h-10 bg-gray-100 rounded animate-pulse"></div>
                    <div className="w-full md:w-96 flex gap-2 h-10 bg-gray-100 rounded animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden h-96">
                            <div className="h-48 bg-gray-200 animate-pulse"></div>
                            <div className="p-4 space-y-3">
                                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                                <div className="h-10 w-full bg-gray-100 rounded animate-pulse mt-4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
