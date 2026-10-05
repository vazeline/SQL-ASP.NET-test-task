import type { EmployeeQuery, EmployeeStatus } from "./types";

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

export const PAGE_SIZES = [5, 10, 20, 50, 100] as const;

export const STATUS_OPTIONS: ReadonlyArray<{ value: EmployeeStatus; label: string }> = [
  { value: "all", label: "Все" },
  { value: "active", label: "Работают" },
  { value: "terminated", label: "Уволены" },
];

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseStatus(value: string): EmployeeStatus {
  switch (value.trim().toLowerCase()) {
    case "active":
      return "active";

    case "terminated":
      return "terminated";

    default:
      return "all";
  }
}

function parseIntInRange(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

/**
 * Приводит searchParams к EmployeeQuery теми же правилами, что и API
 * (страница >= 1, pageSize 1..100, неизвестный статус -> all),
 * чтобы значения в адресной строке и в ответе API совпадали.
 */
export function parseEmployeeQuery(
  params: Record<string, string | string[] | undefined>,
): EmployeeQuery {
  return {
    search: firstValue(params.search).trim(),
    status: parseStatus(firstValue(params.status)),
    page: parseIntInRange(firstValue(params.page), 1, Number.MAX_SAFE_INTEGER, 1),
    pageSize: parseIntInRange(firstValue(params.pageSize), 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

/**
 * Сериализует запрос в query string. Значения по умолчанию не пишутся,
 * чтобы адресная строка оставалась чистой.
 */
export function buildSearchParams(query: EmployeeQuery): string {
  const params = new URLSearchParams();

  const search = query.search.trim();

  if (search !== "") {
    params.set("search", search);
  }

  if (query.status !== "all") {
    params.set("status", query.status);
  }

  if (query.page > 1) {
    params.set("page", String(query.page));
  }

  if (query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(query.pageSize));
  }

  return params.toString();
}

export function buildListHref(query: EmployeeQuery): string {
  const searchParams = buildSearchParams(query);

  return searchParams === "" ? "/" : `/?${searchParams}`;
}