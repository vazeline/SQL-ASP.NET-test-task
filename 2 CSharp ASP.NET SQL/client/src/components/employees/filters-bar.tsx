"use client";

import { PAGE_SIZES, STATUS_OPTIONS } from "@/lib/employee-query";
import type { EmployeeStatus } from "@/lib/types";

interface FiltersBarProps {
  search: string;
  status: EmployeeStatus;
  pageSize: number;
  total: number;
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: EmployeeStatus) => void;
  onPageSizeChange: (value: number) => void;
  onCreate: () => void;
}

const controlClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function FiltersBar({
  search,
  status,
  pageSize,
  total,
  isPending,
  onSearchChange,
  onStatusChange,
  onPageSizeChange,
  onCreate,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 px-4 py-4">
      <div className="min-w-56 flex-1">
        <label htmlFor="search" className="mb-1 block text-xs font-medium text-slate-600">
          Поиск по ФИО
        </label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Например: Иванов"
          className={controlClass}
        />
      </div>

      <div className="w-44">
        <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
          Статус
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as EmployeeStatus)}
          className={controlClass}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-32">
        <label htmlFor="pageSize" className="mb-1 block text-xs font-medium text-slate-600">
          На странице
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className={controlClass}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Добавить сотрудника
      </button>

      <p className={`w-full text-xs text-slate-500 ${isPending ? "opacity-100" : "opacity-0"}`}>
        Обновление данных…
      </p>

      <span className="sr-only">Найдено сотрудников: {total}</span>
    </div>
  );
}