import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Справочник сотрудников",
  description: "Список сотрудников: поиск, фильтрация, серверная пагинация, добавление и редактирование",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}