"use client";

import { useState } from "react";
import { ApiError, deleteEmployee } from "@/lib/api";
import { useEmployeesStore } from "@/store/employees-store";

interface DeleteDialogProps {
  onDeleted: () => void;
}

export function DeleteDialog({ onDeleted }: DeleteDialogProps) {
  const deleteTarget = useEmployeesStore((state) => state.deleteTarget);
  const deleting = useEmployeesStore((state) => state.deleting);
  const cancelDelete = useEmployeesStore((state) => state.cancelDelete);
  const setDeleting = useEmployeesStore((state) => state.setDeleting);
  const [error, setError] = useState<string | null>(null);

  if (deleteTarget === null) {
    return null;
  }

  // const, а не обращение к полю стора — сохраняет сужение типа внутри обработчиков.
  const target = deleteTarget;

  async function handleConfirm() {
    setDeleting(true);
    setError(null);

    try {
      await deleteEmployee(target.id);
      cancelDelete();
      onDeleted();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError("Не удалось связаться с сервером. Проверьте, что API запущен.");
      }

      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          cancelDelete();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Удаление сотрудника"
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Удалить сотрудника?</h2>
        <p className="mt-2 text-sm text-slate-600">
          {target.fullName} будет удалён без возможности восстановления. Чтобы сохранить
          запись и только снять активность, нажмите «Снять активность».
        </p>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelDelete}
            disabled={deleting}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={async () => {
              setDeleting(true);
              setError(null);

              try {
                await deleteEmployee(target.id, true);
                cancelDelete();
                onDeleted();
              } catch (caught) {
                setError(caught instanceof ApiError ? caught.message : "Не удалось связаться с сервером.");
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="rounded-md border border-amber-400 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-40"
          >
            Снять активность
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Удаление…" : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}