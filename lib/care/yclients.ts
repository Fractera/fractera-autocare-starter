import "server-only"

// КЛИЕНТ К YCLIENTS — единственное место, которое знает про эту CRM.
//
// 🔒 ПОСТАВЩИК ДАННЫХ ЗАМЕНЯЕМ, И ГРАНИЦА ПРОХОДИТ ЗДЕСЬ. В исходнике обращения
// к YCLIENTS были размазаны по двенадцати файлам — от скрипта синхронизации до
// страницы подключения из маркетплейса. Смена CRM означала бы там правку в
// двенадцати местах; здесь — в одном.
//
// 🔒 ТОЛЬКО ЧТЕНИЕ. Ни один метод отсюда ничего в CRM не пишет: она источник
// правды о визитах, а не наша база.

/** Адрес API. Один на все методы: второй адрес — это вторая интеграция. */
const API = "https://api.yclients.com"

/**
 * 🔒 АВТОРИЗАЦИЯ ДВОЙНАЯ И В ОДНОМ ЗАГОЛОВКЕ — так требует YCLIENTS.
 * Партнёрский токен принадлежит приложению, пользовательский — сотруднику
 * клиники. Ни один из них не работает без другого, и подсказки об этом в ответе
 * нет: приходит просто 401.
 */
function authHeader(): string {
  const partner = process.env.YCLIENTS_PARTNER_TOKEN
  const user = process.env.YCLIENTS_USER_TOKEN
  if (!partner || !user) {
    // 🔒 ОТКАЗ ГРОМКИЙ. Молчаливое «нет ключей → пустой список» неотличимо от
    // «в филиале нет клиентов»: синхронизация отчиталась бы об успехе, записав
    // ноль строк, и это заметили бы через неделю по пустым экранам.
    throw new Error(
      "YCLIENTS: нет ключей. YCLIENTS_PARTNER_TOKEN и YCLIENTS_USER_TOKEN вносятся " +
        "через панель («Переменные окружения»), а не в код.",
    )
  }
  return `Bearer ${partner}, User ${user}`
}

/** Филиал, с которым работает это приложение. Одно приложение — одно учреждение. */
export function salonId(): string {
  const id = process.env.YCLIENTS_SALON_ID
  if (!id) throw new Error("YCLIENTS: не задан YCLIENTS_SALON_ID — с каким филиалом работать, неизвестно.")
  return id
}

/**
 * 🔒 ЗАГОЛОВОК `Accept` ОБЯЗАТЕЛЕН И НЕ ДЕКОРАТИВЕН. Без
 * `application/vnd.yclients.v2+json` API отвечает первой версией, у которой
 * другая форма ответа: поля просто окажутся не там, где их ищет разбор.
 */
async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.yclients.v2+json",
      Authorization: authHeader(),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`YCLIENTS ${init?.method ?? "GET"} ${path} → ${res.status}`)
  return (await res.json()) as T
}

/**
 * 🔒 ПАУЗА МЕЖДУ СТРАНИЦАМИ — ЧАСТЬ ПРОТОКОЛА, А НЕ ОСТОРОЖНОСТЬ.
 * Лимит YCLIENTS: 200 запросов в минуту или 5 в секунду на один адрес. Обход
 * без паузы упирается в него на первой же тысяче клиентов и получает отказы,
 * которые выглядят как «данные кончились».
 */
const PAUSE_MS = 250
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export type YclientsClient = {
  id: number
  name?: string
  surname?: string
  phone?: string
  email?: string
  birth_date?: string
  sms_not?: number
  success_visits_count?: number
  fail_visits_count?: number
  is_new?: boolean
}

export type YclientsRecord = {
  id: number
  date?: string
  attendance?: number
  staff?: { name?: string }
  client?: YclientsClient | null
  services?: { title?: string; cost?: number }[]
}

/** Все клиенты филиала. Страница — 200, как в исходнике. */
export async function fetchAllClients(
  onPage?: (loaded: number, total: number) => void,
): Promise<YclientsClient[]> {
  const salon = salonId()
  const out: YclientsClient[] = []
  let page = 1
  for (;;) {
    const r = await call<{ data: YclientsClient[]; meta?: { total_count?: number } }>(
      `/api/v1/company/${salon}/clients/search`,
      {
        method: "POST",
        body: {
          page,
          page_size: 200,
          fields: ["id", "name", "surname", "phone", "email", "birth_date", "sms_not"],
        },
      },
    )
    out.push(...r.data)
    onPage?.(out.length, r.meta?.total_count ?? 0)
    if (r.data.length < 200) break
    page += 1
    await sleep(PAUSE_MS)
  }
  return out
}

/**
 * Записи филиала за окно дат.
 *
 * Окно берётся с запасом вперёд: будущие записи — это признак «человек записан»,
 * на котором стоят сразу два сегмента. Без них они посчитали бы тревогой тех,
 * кто уже придёт послезавтра.
 */
export async function fetchAllRecords(
  startDate: string,
  endDate: string,
  onPage?: (loaded: number) => void,
): Promise<YclientsRecord[]> {
  const salon = salonId()
  const out: YclientsRecord[] = []
  let page = 1
  for (;;) {
    const r = await call<{ data: YclientsRecord[] }>(
      `/api/v1/records/${salon}?page=${page}&count=200&start_date=${startDate}&end_date=${endDate}`,
    )
    out.push(...r.data)
    onPage?.(out.length)
    if (r.data.length < 200) break
    page += 1
    await sleep(PAUSE_MS)
  }
  return out
}

/** Сведения о филиале — ими проверяют, что ключи вообще работают. */
export async function fetchCompany(): Promise<{ id: number; title: string; city?: string }> {
  const r = await call<{ data: { id: number; title: string; city?: string } }>(
    `/api/v1/company/${salonId()}`,
  )
  return r.data
}
