import { buildSearchParams } from "./employee-query";
import type {
  Employee,
  EmployeePage,
  EmployeeQuery,
  EmployeeWriteModel,
  ProblemDetails,
  ValidationErrors,
} from "./types";

/**
 * На сервере (Server Component) обращаемся к API напрямую по абсолютному адресу,
 * в браузере — по относительному пути, который проксирует rewrite из next.config.ts.
 * Так клиенту не нужны CORS-настройки на стороне ASP.NET Core.
 */
const serverOrigin = process.env.API_ORIGIN ?? "http://localhost:5080";

export class ApiError extends Error {
  readonly status: number;

  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function apiUrl(path: string): string {
  return typeof window === "undefined" ? `${serverOrigin}${path}` : path;
}

async function parseProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}

/**
 * Ключи ошибок приходят по-разному: у полей модели — имя свойства C#,
 * у ошибок биндинга — путь вида $.firstName. Приводим к одному виду (lowercase).
 */
function toFieldErrors(errors: ValidationErrors | undefined): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const [key, messages] of Object.entries(errors ?? {})) {
    if (messages.length === 0) {
      continue;
    }

    const field = key
      .replace(/^\$\./, "")
      .split(".")[0]
      ?.toLowerCase();

    if (field) {
      fieldErrors[field] = messages.join(" ");
    }
  }

  return fieldErrors;
}

async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const problem = await parseProblem(response);

  return new ApiError(
    response.status,
    problem?.title ?? fallback,
    toFieldErrors(problem?.errors),
  );
}

export async function fetchEmployees(
  query: EmployeeQuery,
  signal?: AbortSignal,
): Promise<EmployeePage> {
  const searchParams = buildSearchParams(query);
  const url = `${apiUrl("/api/employees")}${searchParams === "" ? "" : `?${searchParams}`}`;

  // cache: "no-store" — иначе router.refresh() может вернуть закэшированный ответ.
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    throw await toApiError(response, `Не удалось загрузить данные (HTTP ${response.status})`);
  }

  return (await response.json()) as EmployeePage;
}

export async function createEmployee(model: EmployeeWriteModel): Promise<Employee> {
  const response = await fetch(apiUrl("/api/employees"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(model),
  });

  if (!response.ok) {
    throw await toApiError(response, `Не удалось создать сотрудника (HTTP ${response.status})`);
  }

  return (await response.json()) as Employee;
}

export async function updateEmployee(
  id: number,
  model: EmployeeWriteModel,
): Promise<Employee> {
  const response = await fetch(apiUrl(`/api/employees/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(model),
  });

  if (!response.ok) {
    throw await toApiError(response, `Не удалось сохранить сотрудника (HTTP ${response.status})`);
  }

  return (await response.json()) as Employee;
}

export async function deleteEmployee(id: number, soft = false): Promise<void> {
  const response = await fetch(
    `${apiUrl(`/api/employees/${id}`)}${soft ? "?soft=true" : ""}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw await toApiError(response, `Не удалось удалить сотрудника (HTTP ${response.status})`);
  }
}