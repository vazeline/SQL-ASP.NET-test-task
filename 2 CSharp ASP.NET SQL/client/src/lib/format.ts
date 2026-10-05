const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const EMPTY = "—";

function parse(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  // Даты приходят без часового пояса ("2019-04-01T00:00:00") и парсятся как локальные.
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parse(value);

  return date === null ? EMPTY : dateFormatter.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parse(value);

  return date === null ? EMPTY : dateTimeFormatter.format(date);
}

/** "2019-04-01T00:00:00" -> "2019-04-01" для <input type="date">. */
export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

/** "2019-04-01" -> "2019-04-01T00:00:00"; пустая строка -> null. */
export function fromDateInputValue(value: string): string | null {
  return value === "" ? null : `${value}T00:00:00`;
}