import Link from "next/link"
import { ConfigImage } from "@/components/media/config-image.server"

// Сегментный 404 раздела «Пациенты». Существует затем, чтобы неверный адрес
// внутри раздела не выбрасывал человека на общий 404 приложения: он остаётся в
// разделе, видит его язык и ссылку обратно в список.
//
// Язык здесь недоступен: `not-found.tsx` не получает params. Поэтому текст
// короткий, а ссылка ведёт на относительный корень раздела — работает на любом
// языке.
//
// 🔒 ТЕКСТ ПО-РУССКИ, А У ОБРАЗЦА ПО-АНГЛИЙСКИ — И ЭТО НАЗВАННЫЙ ВЫБОР.
// Ограничение то же (params нет, словарь не подключить), но у проекта
// `NEXT_PUBLIC_DEFAULT_LOCALE=ru`, а рабочей областью пользуется персонал
// русскоязычного учреждения. Английская строка была бы верна для стартера и
// неверна здесь.
export default function PatientsNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        {/* Слот «404» из настроек — тот же, что на общей странице, но соразмерный:
            это сообщение ВНУТРИ раздела, с сохранённой навигацией. */}
        <ConfigImage
          slot="notFound"
          alt=""
          sizes="4rem"
          className="mx-auto mb-4 h-16 w-16 object-contain opacity-80"
        />
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <p className="mt-2 text-sm text-foreground">В этом разделе такого нет.</p>
        <Link href=".." className="mt-4 inline-block text-xs text-muted-foreground underline hover:text-foreground">
          ← к списку
        </Link>
      </div>
    </main>
  )
}
