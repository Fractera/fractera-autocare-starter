// Слова страницы ПАСПОРТА — каркас: заголовок, подзаголовок, объяснение права.
//
// 🔒 ДВА ЯЗЫКА, И ЭТО ЗАПИСАННЫЙ ДОЛГ, А НЕ ДЫРА. Правило проекта: в разработке
// пишем на включённом наборе (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru`), а
// обещание — в `development-docs/TRANSLATION-DEBT.md`.
//
// 🔒 КЛАСС СЛОВАРЯ — СТРАНИЧНЫЙ, А НЕ ПРОДУКТОВЫЙ, И РАЗНИЦА НЕ КОСМЕТИЧЕСКАЯ.
// Соседи по папке `administration/` обязаны 82 языкам: они ЕДУТ С ПРОДУКТОМ к
// клиенту, который вправе включить любой язык. Паспорт — документ ЭТОГО
// развёртывания, его читает владелец этого сервера и никто больше. Обещать ему
// 82 языка значило бы записать долг, который никогда не будет никому нужен.

export type PassportUi = {
  title: string
  subtitle: string
  /** Почему страница доступна одной роли — человек видит причину, а не пустоту. */
  roleNote: string
}

const DICT: Record<string, PassportUi> = {
  en: {
    title: "Project passport",
    subtitle: "What this project is and by which rules it is built.",
    roleNote:
      "The passport holds the owner's decisions verbatim, open questions and claims marked as unverified. It is written for the architect and is not published: the page shell is public and empty, the text arrives from a door that checks the role.",
  },
  ru: {
    title: "Паспорт проекта",
    subtitle: "Что это за проект и по каким правилам он устроен.",
    roleNote:
      "В паспорте — решения владельца дословно, открытые вопросы и утверждения с пометкой «не проверено». Он написан для архитектора и не публикуется: оболочка страницы пуста и статична, а текст приезжает из двери, которая спрашивает роль.",
  },
}

export function passportUi(lang: string): PassportUi {
  return DICT[lang] ?? DICT.en
}
