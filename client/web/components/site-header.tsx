import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/changelog", label: "Changelog" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-eco-green-700">
          <span aria-hidden className="text-2xl">🌿</span>
          EcoCharge
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-muted)] md:flex">
          {NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-eco-green-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/download"
          className="rounded-md bg-eco-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eco-green-700"
        >
          Get the app
        </Link>
      </div>
    </header>
  );
}
