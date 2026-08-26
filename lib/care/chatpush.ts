import "server-only"
import { integrationKey } from "@/lib/company/keys"

// ОТПРАВКА НАРУЖУ ЧЕРЕЗ ChatPush — единственная дверь продукта во внешний мир.
//
// 🔒 ВРЕМЕННО, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА (Рома, 2026-08-24, паспорт). ChatPush выбран как
// то, что уже работало в исходнике; когда канал сменится, меняется ОДИН этот файл —
// поэтому наружу отсюда торчит `sendText`, а не устройство чужого API.
//
// 🔒 КЛЮЧ ИЗ ОКРУЖЕНИЯ, А НЕ ИЗ БАЗЫ. В исходнике он лежал в таблице `chatpush_connections`
// вместе с `clinic_id`: там одно приложение обслуживало НЕСКОЛЬКО клиник, и у каждой был
// свой ключ. У нас одно приложение — одно учреждение (закон ⑮), и таблица связей
// превратилась бы в строку, которую некому заполнить.

const API = "https://api.chatpush.ru/api/v1/delivery"

/** Канал:  — выбирает служба по своему списку; иначе жёстко наш. */
export type Channel = "auto" | "whatsapp" | "telegram"

export type SendResult =
  | { ok: true; id?: string; routing?: string[] }
  | { ok: false; error: "not-configured" | "refused" | "unreachable"; detail?: string }

/**
 * Отправить текст на номер.
 *
 * 🔒 «НЕ НАСТРОЕНО» — ОТДЕЛЬНЫЙ ОТВЕТ, А НЕ ОШИБКА СЕТИ. Без ключа продукт обязан сказать
 * это словом: молчаливая неудача выглядит как «отправлено» и обнаруживается пациентом,
 * который ничего не получил. Ровно поэтому у сообщений есть поле `delivery`.
 */
export async function sendText(phone: string, text: string, channel: Channel = "auto"): Promise<SendResult> {
  // 🔒 КЛЮЧ ЧЕРЕЗ ОБЩИЙ ЧИТАТЕЛЬ, А НЕ ИЗ process.env НАПРЯМУЮ (шаг 29): администратор
  // вводит его на своём экране, и значение обязано действовать СРАЗУ. Окружение осталось
  // запасным источником — там, где переменная задана владельцем сервера, всё работает.
  const token = integrationKey("CHATPUSH_TOKEN")
  if (!token) return { ok: false, error: "not-configured" }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // 🔒 ВЫБОР КАНАЛА ПРОВЕРЕН ЗАПРОСАМИ К СЛУЖБЕ, А НЕ ВЗЯТ ИЗ ДОКУМЕНТАЦИИ (её у нас
      // нет). Неверное значение служба молча заменила своим списком, верное — приняла и
      // записала. Значит поле распознаётся у ОТДЕЛЬНОГО сообщения.
      //
      // 🔒 «АВТО» НЕ ПЕРЕДАЁТ ПОЛЕ ВОВСЕ. Служба знает состояние своих сессий лучше нас:
      // сегодня WhatsApp не поднят, и жёстко выбранный WhatsApp означал бы гарантированную
      // недоставку там, где Telegram бы дошёл.
      body: JSON.stringify({
        text,
        phone,
        ...(channel === "auto" ? {} : { dispatch_routing: [channel === "telegram" ? "tdlib" : "whatsapp"] }),
      }),
      // Чужая служба может молчать; висящий запрос держит нашу очередь.
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await res.json().catch(() => ({}))) as { delivery?: { id?: number; dispatch_routing?: string[] }; error?: string }
    if (!res.ok) return { ok: false, error: "refused", detail: body.error ?? String(res.status) }
    // 🔒 ОТВЕТ СЛУЖБЫ — «ПРИНЯТО», А НЕ «ДОСТАВЛЕНО». Настоящее состояние придёт позже
    // её событием; здесь мы узнаём только идентификатор доставки и выбранный ею канал.
    return { ok: true, id: body.delivery?.id != null ? String(body.delivery.id) : undefined, routing: body.delivery?.dispatch_routing }
  } catch (e) {
    return { ok: false, error: "unreachable", detail: String((e as Error).message ?? e) }
  }
}

/** Настроен ли канал. Экраны спрашивают это, чтобы не обещать доставку впустую. */
export function chatpushConfigured(): boolean {
  return Boolean(integrationKey("CHATPUSH_TOKEN"))
}
