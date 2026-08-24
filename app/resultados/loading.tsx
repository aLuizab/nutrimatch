import PublicHeader from '../components/PublicHeader'

// Covers cold navigations into /resultados. Filter changes run inside a transition, so
// they keep the current results on screen instead of falling back to this skeleton.
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse mb-6" />
        <div className="flex gap-6">
          <aside className="w-64 shrink-0 hidden md:block">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </aside>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-10 w-28 bg-gray-100 rounded-full animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
