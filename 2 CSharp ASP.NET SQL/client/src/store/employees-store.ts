"use client";

import { create } from "zustand";
import { fromDateInputValue, toDateInputValue } from "@/lib/format";
import type { Employee, EmployeeWriteModel } from "@/lib/types";

export type ModalMode = "create" | "edit";

export interface EmployeeForm {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  hireDate: string;
  dismissDate: string;
  isActive: boolean;
}

const emptyForm: EmployeeForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  birthDate: "",
  hireDate: "",
  dismissDate: "",
  isActive: true,
};

function formFromEmployee(employee: Employee): EmployeeForm {
  return {
    firstName: employee.firstName,
    middleName: employee.middleName ?? "",
    lastName: employee.lastName,
    birthDate: toDateInputValue(employee.birthDate),
    hireDate: toDateInputValue(employee.hireDate),
    dismissDate: toDateInputValue(employee.dismissDate),
    isActive: employee.isActive,
  };
}

export function formToModel(form: EmployeeForm): EmployeeWriteModel {
  return {
    firstName: form.firstName,
    middleName: form.middleName.trim() === "" ? null : form.middleName,
    lastName: form.lastName,
    birthDate: fromDateInputValue(form.birthDate),
    hireDate: fromDateInputValue(form.hireDate) ?? "",
    dismissDate: fromDateInputValue(form.dismissDate),
    isActive: form.isActive,
  };
}

function withoutField(errors: Record<string, string>, field: string): Record<string, string> {
  const key = field.toLowerCase();

  if (!(key in errors)) {
    return errors;
  }

  const next = { ...errors };

  delete next[key];

  return next;
}

interface EmployeesStore {
  modalMode: ModalMode | null;
  editingId: number | null;
  form: EmployeeForm;
  fieldErrors: Record<string, string>;
  formError: string | null;
  saving: boolean;

  deleteTarget: Employee | null;
  deleting: boolean;

  openCreate: () => void;
  openEdit: (employee: Employee) => void;
  closeModal: () => void;
  setField: <K extends keyof EmployeeForm>(field: K, value: EmployeeForm[K]) => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  setFormError: (message: string | null) => void;
  setSaving: (saving: boolean) => void;

  askDelete: (employee: Employee) => void;
  cancelDelete: () => void;
  setDeleting: (deleting: boolean) => void;
}

export const useEmployeesStore = create<EmployeesStore>()((set) => ({
  modalMode: null,
  editingId: null,
  form: emptyForm,
  fieldErrors: {},
  formError: null,
  saving: false,

  deleteTarget: null,
  deleting: false,

  openCreate: () =>
    set({
      modalMode: "create",
      editingId: null,
      form: emptyForm,
      fieldErrors: {},
      formError: null,
    }),

  openEdit: (employee) =>
    set({
      modalMode: "edit",
      editingId: employee.id,
      form: formFromEmployee(employee),
      fieldErrors: {},
      formError: null,
    }),

  closeModal: () =>
    set({
      modalMode: null,
      editingId: null,
      fieldErrors: {},
      formError: null,
    }),

  setField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
      fieldErrors: withoutField(state.fieldErrors, field),
      formError: null,
    })),

  setFieldErrors: (fieldErrors) => set({ fieldErrors, formError: null }),
  setFormError: (formError) => set({ formError }),
  setSaving: (saving) => set({ saving }),

  askDelete: (employee) => set({ deleteTarget: employee, deleting: false }),
  cancelDelete: () => set({ deleteTarget: null, deleting: false }),
  setDeleting: (deleting) => set({ deleting }),
}));