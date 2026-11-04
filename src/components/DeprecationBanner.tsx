export function DeprecationBanner() {
  return (
    <aside
      role="note"
      aria-label="Deprecation notice"
      className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 text-sm">
        This project is deprecated and will be archived on December 7, 2026.{' '}
        <a
          href="https://github.com/xrvk/ubb-dashboard-org#deprecation-notice"
          className="font-medium underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
        >
          Read the deprecation notice
        </a>
        .
      </div>
    </aside>
  )
}
