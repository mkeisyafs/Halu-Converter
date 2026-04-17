import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

const btnBase =
  'h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition-all select-none';
const btnActive = 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30';
const btnDisabled = 'text-white/20 cursor-not-allowed';
const btnNormal = 'text-white/60 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/10';

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // Build page window with ellipsis
  const getPages = (): (number | 'start-ellipsis' | 'end-ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | 'start-ellipsis' | 'end-ellipsis')[] = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    pages.push(1);
    if (left > 2) pages.push('start-ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('end-ellipsis');
    pages.push(totalPages);
    return pages;
  };

  const NavBtn = ({
    id,
    onClick,
    disabled,
    children,
  }: {
    id: string;
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
  }) => (
    <button
      key={id}
      onClick={onClick}
      disabled={disabled}
      className={`${btnBase} ${disabled ? btnDisabled : btnNormal}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1 pt-4 pb-2">
      {/* First */}
      <NavBtn id="first" onClick={() => onChange(1)} disabled={page === 1}>
        <ChevronsLeft className="w-3.5 h-3.5" />
      </NavBtn>

      {/* Prev */}
      <NavBtn id="prev" onClick={() => onChange(page - 1)} disabled={page === 1}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </NavBtn>

      {/* Page numbers */}
      {getPages().map((p) => {
        if (p === 'start-ellipsis' || p === 'end-ellipsis') {
          return (
            <span key={p} className="h-8 w-8 flex items-center justify-center text-white/30 text-sm select-none">
              …
            </span>
          );
        }
        const isActive = page === p;
        return (
          <button
            key={p}
            onClick={() => !isActive && onChange(p)}
            className={`${btnBase} ${isActive ? btnActive : btnNormal}`}
          >
            {p}
          </button>
        );
      })}

      {/* Next */}
      <NavBtn id="next" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
        <ChevronRight className="w-3.5 h-3.5" />
      </NavBtn>

      {/* Last */}
      <NavBtn id="last" onClick={() => onChange(totalPages)} disabled={page === totalPages}>
        <ChevronsRight className="w-3.5 h-3.5" />
      </NavBtn>
    </div>
  );
}
