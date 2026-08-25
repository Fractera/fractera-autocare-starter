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

/**
 * Карточка клиента целиком. Здесь перечислено только то, что мы читаем.
 *
 * 🔒 `client_agreements` — НАСТОЯЩЕЕ СОГЛАСИЕ, и его форма не булева. Поля
 * бывают `true`, `false` и `null`, и `null` — это «не спрашивали», а не «нет».
 */
export type YclientsCard = {
  id: number
  sms_not?: number
  birth_date?: string
  client_agreements?: {
    is_newsletter_allowed?: boolean | null
    is_personal_data_processing_allowed?: boolean | null
    is_yc_newsletter_allowed?: boolean | null
    is_yc_personal_data_processing_allowed?: boolean | null
  } | null
}

export type YclientsRecord = {
  id: number
  date?: string
  attendance?: number
  staff?: { name?: string }
  client?: YclientsClient | null
  services?: { title?: string; cost?: number }[]
}

/**
 * Все клиенты филиала — ОПТОВЫМ маршрутом, 25 полей на запись.
 *
 * 🔒 ЭТОТ МАРШРУТ, А НЕ `clients/search`. ✗ Оплачено 2026-08-25: `clients/search`
 * МОЛЧА ИГНОРИРУЕТ список `fields` и всегда отдаёт пять полей —
 * `id, name, surname, phone, email`. Просишь `sms_not` — приходит `{id}`; просишь
 * `birth_date` — приходит `{id}`. Ни ошибки, ни предупреждения. Из-за этого шаг 11
 * полагал согласие известным, а оно не приходило вовсе.
 *
 * ✗ ЛОВУШКА РАЗМЕРА: `count=1000` возвращает ДВАДЦАТЬ записей, а не тысячу и не
 * ошибку. Больше попросил — меньше получил, молча. Рабочий предел — 200.
 *
 * Цена полного обхода филиала: 1849 записей за 7.5 секунды.
 */
export async function fetchAllClients(
  onPage?: (loaded: number, total: number) => void,
): Promise<YclientsClient[]> {
  const salon = salonId()
  const out: YclientsClient[] = []
  let page = 1
  for (;;) {
    const r = await call<{ data: YclientsClient[]; meta?: { total_count?: number } }>(
      `/api/v1/clients/${salon}?count=200&page=${page}`,
    )
    const rows = r.data ?? []
    out.push(...rows)
    onPage?.(out.length, r.meta?.total_count ?? 0)
    if (rows.length < 200) break
    page += 1
    await sleep(PAUSE_MS)
  }
  return out
}

/**
 * Карточка ОДНОГО клиента: 26 полей, и среди них `client_agreements`.
 *
 * 🔒 СОГЛАСИЕ ЖИВЁТ ТОЛЬКО ЗДЕСЬ. В оптовом маршруте этого поля нет, а старые
 * флаги (`sms_not`, `sms_check`, `sms_bot`) в этом учреждении мертвы — у всех
 * 1849 стоит ноль, то есть ими никогда не пользовались. Ноль в них означает
 * «никто не трогал», а не «человек разрешил».
 *
 * 🔒 ПОЭТОМУ ОБХОД ЗА СОГЛАСИЕМ ДОРОГОЙ: карточка на клиента, 1849 запросов,
 * около 15 минут. Он и вынесен в отдельную дверь — решение владельца 2026-08-25.
 */
export async function fetchClientCard(clientId: number | string): Promise<YclientsCard | null> {
  // 🔒 ПАУЗА ЗДЕСЬ, А НЕ У ВЫЗЫВАЮЩЕГО — И ЭТО ОПЛАЧЕНО. ✗ 2026-08-25: первый
  // проход за согласием звал эту функцию в цикле БЕЗ паузы. Вышло 4.4 запроса в
  // секунду при лимите 5, CRM начала отказывать, и 491 карточка из 1844 (27%
  // базы) осталась непрочитанной. Пауза в постраничных обходах была, а здесь её
  // не было: ограничение принадлежит АДРЕСУ, значит и жить обязано у адреса, а
  // не у каждого, кто его позовёт и вспомнит.
  //
  // 🔒 ОДИН ПОВТОР ПОСЛЕ ОТКАЗА. Лимит — состояние временное: та же карточка
  // через полсекунды отвечает. Без повтора отказ становится «согласие
  // неизвестно» навсегда, хотя спросить было можно.
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(PAUSE_MS)
    try {
      const r = await call<{ data: YclientsCard }>(`/api/v1/client/${salonId()}/${clientId}`)
      return r.data ?? null
    } catch {
      // Вторая попытка ждёт дольше: если это лимит, короткая пауза его не снимет.
      if (attempt === 0) await sleep(PAUSE_MS * 3)
    }
  }
  // 🔒 ОТКАЗ ВОЗВРАЩАЕТСЯ, А НЕ ПРЯЧЕТСЯ. Одна недоступная карточка не валит
  // обход из тысячи восьмисот, но вызывающий обязан её посчитать: непрочитанный
  // человек — это человек с НЕИЗВЕСТНЫМ согласием, а не с разрешением.
  return null
}

/**
 * Сколько клиентов у филиала по мнению самой CRM.
 *
 * Нужен для сверки: число людей в нашей базе обязано сходиться с этим числом
 * за вычетом пропущенных без телефона и схлопнутых по телефону.
 */
export async function fetchClientsTotal(): Promise<number> {
  const r = await call<{ meta?: { total_count?: number } }>(
    `/api/v1/clients/${salonId()}?count=1&page=1`,
  )
  return Number(r.meta?.total_count ?? 0)
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
