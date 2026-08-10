import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} EcoCharge — a thesis project, University of Cebu
          Lapu-Lapu and Mandaue.
        </p>
        <div className="flex gap-5">
          <Link href="/changelog" className="hover:text-eco-green-700">
            Changelog
          </Link>
          <Link href="/docs" className="hover:text-eco-green-700">
            Docs
          </Link>
          <Link href="/about" className="hover:text-eco-green-700">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
