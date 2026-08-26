"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { uploadFile } from "@/services/upload/upload.service"
import type { MessageThreadsUi } from "./ui.i18n"

export type Thread = {
  phone: string
  total: number
  incoming: number
  last_at: string
  last_text: string | null
  last_direction: "incoming" | "outgoing"
  channel: string
  person_id: string | null
  full_name: string | null
  consent_to_contact: number | null
}

export type Message = {
  id: string
  phone: string
  person_id: string | null
  direction: "incoming" | "outgoing"
  text: string | null
  channel: string
  ai_generated: number
  status: string
  created_at: string
  attachment_url: string | null
  attachment_mime: string | null
  attachment_name: string | null
  /** Части сообщения по стандарту AI SDK. Главное поле содержания. */
  parts: MessagePart[] | null
  /** `pending` — записано, но наружу не ушло: канала нет. */
  delivery: string | null
  /** Каким каналом ушло: служба возвращает это в ответе. */
  channel_used: string | null
  /** Причина СЛОВАМИ службы, а не кодом. */
  delivery_detail: string | null
  /** manager | ai | timer. */
  origin: string | null
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; filename?: string; url: string }

export type Summary = { threads: number; messages: number; unknownNumbers: number; aiReplies: number }

export function useThreads(ui: MessageThreadsUi) {
  const [loading, setLoading] = useState(true)
  const [threads, setThreads] = useState<Thread[]>([])
  const [summary, setSummary] = useState<Summary>({ threads: 0, messages: 0, unknownNumbers: 0, aiReplies: 0 })
  /** Открытая ветка. `null` — показан список. */
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  /** Номер тестового юзера — им экран отличает проверку канала от живого пациента. */
  const [testPhone, setTestPhone] = useState<string | null>(null)

  const say = useCallback((s: number) => {
    toast.error(s === 401 || s === 403 ? ui.forbidden : s === 502 ? ui.unreachable : ui.failed)
  }, [ui])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/care/messages", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setThreads(Array.isArray(data.threads) ? data.threads : [])
      setSummary(data.summary as Summary)
      setTestPhone(data.testPhone ?? null)
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui, say])

  const open = useCallback(async (phone: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/care/messages?phone=${encodeURIComponent(phone)}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { say(res.status); return }
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      setOpenPhone(phone)
    } catch {
      toast.error(ui.unreachable)
    } finally {
      setLoading(false)
    }
  }, [ui, say])

  const close = useCallback(() => { setOpenPhone(null); setMessages([]) }, [])

  // 🔒 НОМЕР В АДРЕСЕ ОТКРЫВАЕТ ВЕТКУ СРАЗУ (Рома, 2026-08-25). Кнопка «Перейти в чат» с
  // карточки человека ведёт сюда с `?phone=…`; без этого чтения она приводила бы к списку
  // из двух сотен веток, где номер надо искать глазами, — то есть экономила бы одно
  // нажатие и дарила поиск.
  //
  // 🔒 АДРЕС ЧИТАЕТСЯ ИЗ `window.location`, А НЕ `useSearchParams`. Оболочка защищённой
  // страницы статическая, и хук в ней требует границы `Suspense` вокруг островка: плата —
  // лишний слой ради значения, которое нужно ОДИН раз, при монтировании, и уже в браузере.
  //
  // Список грузится в любом случае: открытая ветка показывает имя и согласие человека из
  // сводки, и без неё шапка разговора осталась бы голым номером.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      await load()
      const phone = new URLSearchParams(window.location.search).get("phone")?.trim()
      if (phone) await open(phone)
    })()
  }, [load, open])

  // 🪦 ЗДЕСЬ БЫЛА ПАРА КНОПОК «показать / убрать демонстрацию» и посев выдуманных веток.
  // Удалены шагом 30: канал заработал, и выдуманный собеседник стал вреден — он отвечает
  // там, где теперь отвечает живой человек. Вместо посева — переход в ветку ТЕСТОВОГО
  // ЮЗЕРА, которого владелец заводит в настройках компании.

  return { loading, threads, summary, openPhone, messages, open, close, testPhone }
}

// ─── Отправка оператором ─────────────────────────────────────────────────────
//
// 🔒 КАРТИНКА УХОДИТ В МЕДИАХРАНИЛИЩЕ ИЗ БРАУЗЕРА, а в базу переписки едет только адрес
// (заказ Ромы: «изображение должно попадать в хранилище медиафайлов»). Готовый путь уже
// был — `services/upload`; второй способ класть файлы означал бы два места, где медиа
// живёт по разным правилам.
//
// 🔒 ПОЛЕ ВВОДА ОТДАЁТ `blob:`-ССЫЛКУ, А НЕ ФАЙЛ. AI Elements хранит вложение как
// `URL.createObjectURL(file)`; чтобы отдать его хранилищу, ссылку надо прочитать обратно
// в файл. Это не обход, а цена выбранной библиотеки, и она стоит здесь одной строкой.
export function useSending(ui: MessageThreadsUi, reload: (phone: string) => Promise<void>) {
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)

  const send = useCallback(async (phone: string, text: string, files: { url: string; mediaType?: string; filename?: string }[], channel = "auto") => {
    setSending(true)
    try {
      // 🔒 ГРУЗЯТСЯ ВСЕ ФАЙЛЫ, А НЕ ПЕРВЫЙ (Рома: «не более трёх вложений»). ✗ Здесь
      // стояло `files?.[0]`: поле разрешало выбрать несколько, а до хранилища доезжал
      // один — и молча, без единого слова человеку.
      //
      // 🔒 ЕДИНИЦА ОТКАЗА — ВСЁ СООБЩЕНИЕ. Упал один файл — не отправляем ничего:
      // сообщение с половиной приложенного хуже неотправленного, потому что выглядит
      // отправленным. `Promise.all` и падает целиком, что здесь ровно то, что нужно.
      let stored: { url: string; mediaType: string; filename?: string }[] = []
      if (files.length) {
        try {
          stored = await Promise.all(
            files.map(async (f) => {
              // Поле отдаёт вложение адресом (`blob:` или `data:`), а хранилищу нужен
              // файл — читаем адрес обратно. Это цена выбранной библиотеки, названная
              // вслух, а не обход.
              const blob = await fetch(f.url).then((r) => r.blob())
              const file = new File([blob], f.filename ?? "file", { type: f.mediaType ?? blob.type })
              const up = await uploadFile(file)
              return { url: up.url, mediaType: up.mime_type, filename: up.name }
            }),
          )
        } catch {
          toast.error(ui.uploadFailed)
          // 🔒 БРОСАЕМ, А НЕ ВОЗВРАЩАЕМ (Рома, 2026-08-25). `PromptInput` очищает поле и
          // снимает вложение, ЕСЛИ обработчик завершился успешно, и не очищает, если он
          // бросил. Тихий `return` означал: «не смогли загрузить» — и картинка при этом
          // исчезала, а человеку предлагалось прикреплять её заново, ничего не поняв.
          throw new Error("upload")
        }
      }

      const res = await fetch("/api/care/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text, files: stored, channel }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(res.status === 401 || res.status === 403 ? ui.forbidden : ui.failed)
        throw new Error("send")
      }
      await reload(phone)

      // Ответ «клиента» уже лежит в базе — дверь пишет его сразу. Пауза здесь нужна не
      // ему, а ГЛАЗУ: мгновенный ответ читается как эхо, а не как собеседник.
      if (data.demoReply) {
        setTyping(true)
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500))
        setTyping(false)
        await reload(phone)
      }
    } catch (e) {
      // 🔒 СВОЙ ОТКАЗ НЕ ОБЪЯСНЯЕТСЯ ДВАЖДЫ, И НИ ОДИН НЕ ГЛОТАЕТСЯ. Загрузка и отправка
      // уже сказали человеку, что именно не вышло; накрыв это общим «сервер не ответил»,
      // мы назвали бы причиной не то. А бросок обязан дойти до `PromptInput`: он решает
      // по нему, чистить поле или оставить написанное для повтора. Поэтому любая неудача
      // — своя или сетевая — уходит наверх.
      if (!(e instanceof Error && (e.message === "upload" || e.message === "send"))) {
        toast.error(ui.unreachable)
      }
      throw e
    } finally {
      setSending(false)
    }
  }, [ui, reload])

  return { sending, typing, send }
}
