"use client";

import { useEffect, type FormEvent } from "react";
import { ApiError, createEmployee, updateEmployee } from "@/lib/api";
import { formToModel, useEmployeesStore, type EmployeeForm } from "@/store/employees-store";

interface EmployeeModalProps {
  onDone: () => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1 block text-xs font-medium text-slate-600";

function validate(form: EmployeeForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.lastName.trim() === "") {
    errors.lastname = "Укажите фамилию.";
  }

  if (form.firstName.trim() === "") {
    errors.firstname = "Укажите имя.";
  }

  if (form.hireDate === "") {
    errors.hiredate = "Укажите дату приёма на работу.";
  }

  // Даты в формате yyyy-MM-dd сравнимы как строки.
  if (form.hireDate !== "" && form.dismissDate !== "" && form.dismissDate < form.hireDate) {
    errors.dismissdate = "Дата увольнения не может быть раньше даты приёма на работу.";
  }

  if (form.hireDate !== "" && form.birthDate !== "" && form.birthDate > form.hireDate) {
    errors.birthdate = "Дата рождения не может быть позже даты приёма на работу.";
  }

  return errors;
}

export function EmployeeModal({ onDone }: EmployeeModalProps) {
  const modalMode = useEmployeesStore((state) => state.modalMode);
  const editingId = useEmployeesStore((state) => state.editingId);
  const form = useEmployeesStore((state) => state.form);
  const fieldErrors = useEmployeesStore((state) => state.fieldErrors);
  const formError = useEmployeesStore((state) => state.formError);
  const saving = useEmployeesStore((state) => state.saving);
  const closeModal = useEmployeesStore((state) => state.closeModal);
  const setField = useEmployeesStore((state) => state.setField);
  const setFieldErrors = useEmployeesStore((state) => state.setFieldErrors);
  const setFormError = useEmployeesStore((state) => state.setFormError);
  const setSaving = useEmployeesStore((state) => state.setSaving);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeModal, saving]);

  if (modalMode === null) {
    return null;
  }

  function error(field: string): string | undefined {
    return fieldErrors[field.toLowerCase()];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const localErrors = validate(form);

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);

      return;
    }

    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const model = formToModel(form);

      if (modalMode === "create") {
        await createEmployee(model);
      } else if (editingId !== null) {
        await updateEmployee(editingId, model);
      }

      closeModal();
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const hasFieldErrors = Object.keys(caught.fieldErrors).length > 0;

        setFieldErrors(caught.fieldErrors);
        setFormError(hasFieldErrors ? null : caught.message);
      } else {
        setFormError("Не удалось связаться с сервером. Проверьте, что API запущен.");
      }
    } finally {
      setSaving(false);
    }
  }

  const title = modalMode === "create" ? "Добавление сотрудника" : "Изменение сотрудника";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          closeModal();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            aria-label="Закрыть"
            className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Фамилия <span className="text-red-600">*</span>
              </label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={(event) => setField("lastName", event.target.value)}
                aria-invalid={error("lastName") !== undefined}
                className={`${inputClass} ${error("lastName") ? "border-red-400" : ""}`}
              />
              {error("lastName") ? (
                <p className="mt-1 text-xs text-red-600">{error("lastName")}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="firstName" className={labelClass}>
                Имя <span className="text-red-600">*</span>
              </label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={(event) => setField("firstName", event.target.value)}
                aria-invalid={error("firstName") !== undefined}
                className={`${inputClass} ${error("firstName") ? "border-red-400" : ""}`}
              />
              {error("firstName") ? (
                <p className="mt-1 text-xs text-red-600">{error("firstName")}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="middleName" className={labelClass}>
                Отчество
              </label>
              <input
                id="middleName"
                value={form.middleName}
                onChange={(event) => setField("middleName", event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="birthDate" className={labelClass}>
                Дата рождения
              </label>
              <input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(event) => setField("birthDate", event.target.value)}
                aria-invalid={error("birthDate") !== undefined}
                className={`${inputClass} ${error("birthDate") ? "border-red-400" : ""}`}
              />
              {error("birthDate") ? (
                <p className="mt-1 text-xs text-red-600">{error("birthDate")}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="hireDate" className={labelClass}>
                Принят на работу <span className="text-red-600">*</span>
              </label>
              <input
                id="hireDate"
                type="date"
                value={form.hireDate}
                onChange={(event) => setField("hireDate", event.target.value)}
                aria-invalid={error("hireDate") !== undefined}
                className={`${inputClass} ${error("hireDate") ? "border-red-400" : ""}`}
              />
              {error("hireDate") ? (
                <p className="mt-1 text-xs text-red-600">{error("hireDate")}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="dismissDate" className={labelClass}>
                Уволен
              </label>
              <input
                id="dismissDate"
                type="date"
                value={form.dismissDate}
                onChange={(event) => setField("dismissDate", event.target.value)}
                aria-invalid={error("dismissDate") !== undefined}
                className={`${inputClass} ${error("dismissDate") ? "border-red-400" : ""}`}
              />
              {error("dismissDate") ? (
                <p className="mt-1 text-xs text-red-600">{error("dismissDate")}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setField("isActive", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Сотрудник активен
              </label>
            </div>
          </div>

          {formError ? (
            <p className="mx-5 mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}