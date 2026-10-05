"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeleteDialog } from "./delete-dialog";
import { EmployeeModal } from "./employee-modal";
import { EmployeesTable } from "./employees-table";
import { FiltersBar } from "./filters-bar";
import { Pagination } from "./pagination";
import { buildListHref } from "@/lib/employee-query";
import type { Employee, EmployeePage, EmployeeQuery, EmployeeStatus } from "@/lib/types";
import { useEmployeesStore } from "@/store/employees-store";

interface EmployeesScreenProps {
  result: EmployeePage;
  query: EmployeeQuery;
}

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Данные приходят из серверного компонента (EmployeesScreenProps.result),
 * а адресная строка — единственный источник правды для фильтров и пагинации:
 * изменение фильтра обновляет URL, Next.js перерисовывает server component
 * с новой выборкой. Zustand хранит только состояние UI: модальные окна и формы.
 */
export function EmployeesScreen({ result, query }: EmployeesScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const openCreate = useEmployeesStore((state) => state.openCreate);
  const openEdit = useEmployeesStore((state) => state.openEdit);
  const askDelete = useEmployeesStore((state) => state.askDelete);

  // Поле поиска живёт локально, но подстраивается под адресную строку
  // (переход назад/вперёд, смена фильтра) — паттерн React для
  // «производного состояния» вместо useEffect с setState.
  const [searchText, setSearchText] = useState(query.search);
  const [syncedSearch, setSyncedSearch] = useState(query.search);

  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    setSearchText(query.search);
  }

  const applyQuery = useCallback(
    (patch: Partial<EmployeeQuery>) => {
      const next = { ...query, ...patch };

      startTransition(() => {
        router.replace(buildListHref(next), { scroll: false });
      });
    },
    [query, router],
  );

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  // Поиск с задержкой, чтобы не дёргать API на каждый символ.
  useEffect(() => {
    if (searchText === query.search) {
      return;
    }

    const timer = setTimeout(() => {
      applyQuery({ search: searchText, page: 1 });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchText, query.search, applyQuery]);

  const handleDeleted = useCallback(() => {
    // Если удалили единственную запись последней страницы — уходим на предыдущую.
    if (result.items.length === 1 && result.page > 1) {
      applyQuery({ page: result.page - 1 });

      return;
    }

    refresh();
  }, [applyQuery, refresh, result.items.length, result.page]);

  const handleEdit = useCallback((employee: Employee) => openEdit(employee), [openEdit]);
  const handleDelete = useCallback((employee: Employee) => askDelete(employee), [askDelete]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Справочник сотрудников</h1>
        <p className="mt-1 text-sm text-slate-600">
          Данные загружает серверный компонент из ASP.NET Core API. Фильтры, поиск и пагинация
          работают через адресную строку, состояние форм — в Zustand.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <FiltersBar
          search={searchText}
          status={query.status}
          pageSize={result.pageSize}
          total={result.total}
          isPending={isPending}
          onSearchChange={setSearchText}
          onStatusChange={(status: EmployeeStatus) => applyQuery({ status, page: 1 })}
          onPageSizeChange={(pageSize) => applyQuery({ pageSize, page: 1 })}
          onCreate={openCreate}
        />

        <EmployeesTable
          employees={result.items}
          isPending={isPending}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          totalPages={result.totalPages}
          hasPrevious={result.hasPrevious}
          hasNext={result.hasNext}
          onPageChange={(page) => applyQuery({ page })}
        />
      </div>

      <EmployeeModal onDone={refresh} />
      <DeleteDialog onDeleted={handleDeleted} />
    </div>
  );
}