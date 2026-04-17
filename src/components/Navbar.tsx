import { Link, useLocation } from 'react-router-dom';
import { Store, ArrowLeftRight } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Store, label: 'Marketplace' },
  { to: '/converter', icon: ArrowLeftRight, label: 'Converter' },
];

export function Navbar() {
  const { pathname } = useLocation();

  return (
    <>
      {/* ── Desktop / tablet top bar ─────────────────────────── */}
      <header className="border-b border-[#1a1a1a] bg-[#0f0f0f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 sm:h-16 gap-4 sm:gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-sm font-bold text-white">R</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-white leading-tight">RtoH</p>
                <p className="text-[10px] text-white/35 leading-tight">RisuAI → SkizoAI</p>
              </div>
            </div>

            {/* Desktop nav tabs */}
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                        : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right slot — consumed by parent via children if needed */}
            <div id="navbar-right-slot" className="ml-auto flex items-center gap-3" />
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-[#1e1e1e]">
        <div className="flex">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                  active
                    ? 'text-purple-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-purple-500 rounded-full" />
                )}
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
