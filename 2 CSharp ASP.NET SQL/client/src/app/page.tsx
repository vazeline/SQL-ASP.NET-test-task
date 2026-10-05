import { EmployeesScreen } from "@/components/employees/employees-screen";
import { RetryButton } from "@/components/retry-button";
import { ApiError, fetchEmployees } from "@/lib/api";
import { parseEmployeeQuery } from "@/lib/employee-query";
import type { EmployeePage } from "@/lib/types";

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    return `API вернул ошибку ${error.status}: ${error.message}`;
  }

  return "Не удалось получить данные от API. Убедитесь, что ASP.NET Core запущен на порту из API_ORIGIN.";
}

export default async function Page(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const query = parseEmployeeQuery(searchParams);

  let result: EmployeePage | null = null;
  let failure: string | null = null;

  try {
    result = await fetchEmployees(query);
  } catch (error) {
    failure = describeFailure(error);
  }

  if (result === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Справочник сотрудников недоступен</h1>
        <p className="mt-3 text-sm text-slate-700">{failure}</p>
        <p className="mt-2 text-sm text-slate-500">
          Ожидается API_ORIGIN=http://localhost:5080 — см. <code>client/.env.local</code>.
        </p>
        <div className="mt-6">
          <RetryButton />
        </div>
      </div>
    );
  }

  return <EmployeesScreen result={result} query={query} />;
}