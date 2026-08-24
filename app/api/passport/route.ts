// @api serve the project passport document to the architect only
import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { requireRoles } from "@/lib/auth/require-roles"

// ПАСПОРТ ПРОЕКТА — ТЕКСТ ЗА ЗАМКОМ.
//
// 🔒 ПОЧЕМУ СОДЕРЖИМОЕ ЕДЕТ ОТСЮДА, А НЕ ИЗ СТРАНИЦЫ. Прочитай файл серверный
// компонент — паспорт запёкся бы в предрендеренный HTML, и его отдали бы
// любому, кто знает адрес: `AccessGate` — вывеска, её выключают в том же
// браузере, где она нарисована. Внутри паспорта стоят решения владельца
// дословно и пометки «со слов, не проверено» — это не то, что публикуют.
// Поэтому оболочка страницы пустая и статическая, а текст приезжает сюда, где
// сессию читают законно.
//
// 🔒 РОЛЬ ОДНА — `architect`, И ЭТО НЕ СУЖЕНИЕ ГРУППЫ «РАДИ ОСТОРОЖНОСТИ».
// Группа `(admin)` пускает `admin` и `architect`; паспорт — документ владельца
// развёртывания, и его аудитория ровно одна. Вывеска на странице сужена тем же
// списком: дверь строже вывески означала бы «пустили и тут же отказали», а
// именно этот дефект уже оплачен на странице учётных записей.
export const runtime = "nodejs"

// Ответ зависит от сессии — кэшировать его нечем и незачем.
export const dynamic = "force-dynamic"

/** Единственный источник: тот же файл, который читает агент в начале сессии. */
const PASSPORT = path.join(process.cwd(), "development-docs", "PASSPORT.md")

export async function GET(req: NextRequest) {
  const denied = await requireRoles(req, ["architect"])
  if (denied) return denied

  try {
    const markdown = await readFile(PASSPORT, "utf8")
    return NextResponse.json({ markdown })
  } catch (e) {
    // 🔒 ЛОВИМ ИМЕННО ОТСУТСТВИЕ ФАЙЛА И ГОВОРИМ ОБ ЭТОМ ВСЛУХ.
    // `catch { return { markdown: "" } }` превратил бы неверный путь в «паспорт
    // пуст» — состояние, неотличимое от честной пустоты, и страница показала бы
    // «здесь ничего нет» вместо поломки. Этот приём уже стоил проекту времени
    // (ANTI-PATTERNS: «A swallowed error turns a wrong path into "no data"»).
    const missing = (e as NodeJS.ErrnoException)?.code === "ENOENT"
    return NextResponse.json(
      { error: missing ? "passport-missing" : "passport-unreadable", path: "development-docs/PASSPORT.md" },
      { status: missing ? 404 : 500 },
    )
  }
}
