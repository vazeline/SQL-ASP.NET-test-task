"use client";

import { formatDate } from "@/lib/format";
import type { Employee } from "@/lib/types";

interface EmployeesTableProps {
  employees: Employee[];
  isPending: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Активен
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
      Не активен
    </span>
  );
}

export function EmployeesTable({ employees, isPending, onEdit, onDelete }: EmployeesTableProps) {
  return (
    <div className={`overflow-x-auto transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              ФИО
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Дата рождения
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Принят на работу
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Уволен
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Статус
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {employees.map((employee) => (
            <tr key={employee.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {employee.fullName}
                {employee.middleName === null ? (
                  <span className="block text-xs text-slate-400">без отчества</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-slate-700">{formatDate(employee.birthDate)}</td>
              <td className="px-4 py-3 text-slate-700">{formatDate(employee.hireDate)}</td>
              <td className="px-4 py-3 text-slate-700">{formatDate(employee.dismissDate)}</td>
              <td className="px-4 py-3">
                <ActiveBadge isActive={employee.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(employee)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(employee)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {employees.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                Сотрудники не найдены. Измените условия фильтрации.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}