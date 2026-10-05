"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

const buttonClass =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const enabledClass =
  "border-slate-300 text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700";
const activeClass = "border-blue-600 bg-blue-600 text-white";

/** Номера страниц вокруг текущей с многоточиями: 1 … 4 5 6 … 20 */
function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);

  if (page <= 3) {
    [2, 3, 4].forEach((value) => pages.add(value));
  }

  if (page >= totalPages - 2) {
    [totalPages - 1, totalPages - 2, totalPages - 3].forEach((value) => pages.add(value));
  }

  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  let previous = 0;

  for (const value of sorted) {
    if (previous !== 0 && value - previous > 1) {
      result.push("gap");
    }

    result.push(value);
    previous = value;
  }

  return result;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <p>
        {total === 0 ? (
          "Нет записей"
        ) : (
          <>
            Показано <span className="font-medium text-slate-900">{first}</span>–
            <span className="font-medium text-slate-900">{last}</span> из{" "}
            <span className="font-medium text-slate-900">{total}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          className={`${buttonClass} ${hasPrevious ? enabledClass : "border-slate-200 text-slate-400"}`}
        >
          Назад
        </button>

        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-2 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`${buttonClass} ${item === page ? activeClass : enabledClass}`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={`${buttonClass} ${hasNext ? enabledClass : "border-slate-200 text-slate-400"}`}
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}