export type EmployeeStatus = "all" | "active" | "terminated";

export interface Employee {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  birthDate: string | null;
  hireDate: string;
  dismissDate: string | null;
  isActive: boolean;
  createDate: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export type EmployeePage = PagedResult<Employee>;

export interface EmployeeQuery {
  search: string;
  status: EmployeeStatus;
  page: number;
  pageSize: number;
}

export interface EmployeeWriteModel {
  firstName: string;
  middleName: string | null;
  lastName: string;
  birthDate: string | null;
  hireDate: string;
  dismissDate: string | null;
  isActive: boolean;
}

export type ValidationErrors = Record<string, string[]>;

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  errors?: ValidationErrors;
  traceId?: string;
}