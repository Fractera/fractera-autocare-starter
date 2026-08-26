"use client"

// ЛЕНТА РАЗГОВОРА И ПОЛЕ ОТВЕТА — на компонентах AI Elements (шаг 25, заказ Ромы
// 2026-08-25: «реальный интерфейс для переписки… возможность написать сообщение отправить
// прикрепить изображение»).
//
// 🔒 ОТДЕЛЬНЫМ ФАЙЛОМ ВНУТРИ ВИДЖЕТА, А НЕ В `index.client.tsx`. Предел компонента —
// 250 строк, и лента с полем ввода не помещается рядом со списком веток. Единица владения
// при этом не разрушена: файл лежит в папке виджета и умирает вместе с ней.
//
// 🔒 СТОРОНЫ ЧИТАЮТСЯ ГЛАЗАМИ ОПЕРАТОРА: его собственные ответы (`outgoing`) идут справа с
// подложкой, сообщения пациента (`incoming`) — слева. В словаре AI Elements это `user` и
// `assistant`; названия чужие, но геометрия та, что нужна.

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Bot, X, Film, Music, FileText, Clock, UserRoundCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputProvider,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import {
  AudioPlayer,
  AudioPlayerControlBar,
  AudioPlayerElement,
  AudioPlayerMuteButton,
  AudioPlayerPlayButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
} from "@/components/ai-elements/audio-player"
import { EmptyState } from "@/components/ui/empty-state"
import { InputGroupAddon } from "@/components/ui/input-group"
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { VoiceButton } from "./voice.client"
import { when, partsOf } from "./format"
import type { Message as ChatMessage } from "./use-threads"
import type { MessageThreadsUi } from "./ui.i18n"

// Часть сообщения по стандарту AI SDK: у файла есть тип и адрес, и рисовать его надо
// ПО ТИПУ. ✗ До этого всё шло через один тег картинки, и pdf выглядел бы битым изображением.
type FilePart = { url: string; mediaType?: string; filename?: string | null }

function kindOf(mediaType?: string): "image" | "video" | "audio" | "file" {
  if (!mediaType) return "file"
  if (mediaType.startsWith("image/")) return "image"
  if (mediaType.startsWith("video/")) return "video"
  if (mediaType.startsWith("audio/")) return "audio"
  return "file"
}

/** Миниатюра в поле ввода: квадрат 64×64, у не-картинки — значок и имя. */
function AttachmentThumb({ part, ui }: { part: FilePart; ui: MessageThreadsUi }) {
  const kind = kindOf(part.mediaType)
  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={part.url} alt={part.filename ?? ui.imageAlt} className="size-16 rounded-lg border border-border object-cover" />
  }
  const Icon = kind === "video" ? Film : kind === "audio" ? Music : FileText
  return (
    <span
      title={part.filename ?? undefined}
      className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-center"
    >
      <Icon size={16} className="text-muted-foreground" />
      <span className="line-clamp-2 text-[9px] leading-tight text-muted-foreground">{part.filename ?? ""}</span>
    </span>
  )
}

/** Вложение В ЛЕНТЕ: картинка — превью, видео и аудио — плеер, остальное — ссылка. */
function AttachmentView({ part, ui }: { part: FilePart; ui: MessageThreadsUi }) {
  const kind = kindOf(part.mediaType)
  if (kind === "image") {
    // 🔒 ОБЫЧНЫЙ img, А НЕ next/image: адрес приходит из медиахранилища и на сборке
    // неизвестен, а оптимизатор требует, чтобы домен был назван в конфигурации заранее.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={part.url} alt={part.filename ?? ui.imageAlt} className="mt-1 max-h-64 w-auto max-w-full rounded-lg border border-border" />
  }
  if (kind === "video") {
    return <video src={part.url} controls className="mt-1 max-h-64 w-full max-w-sm rounded-lg border border-border" />
  }
  if (kind === "audio") {
    // 🔒 ПЛЕЕР БИБЛИОТЕКИ, А НЕ ГОЛЫЙ `<audio controls>` (Рома, 2026-08-25, со ссылкой на
    // `elements.ai-sdk.dev/components/audio-player`). Разница не в красоте: системный
    // плеер выглядит по-своему в каждом браузере и не знает ни одного нашего токена, то
    // есть в тёмной теме он остаётся светлым. Здесь же цвета и шрифт берутся из
    // `DESIGN-CONFIG` через переменные `--media-*`, и плеер живёт по законам продукта.
    //
    // 🔒 ПЛЕЕР ПУТЕШЕСТВУЕТ ВМЕСТЕ С ЛЕНТОЙ: он часть сообщения, а не отдельный экран.
    // Голосовое, присланное пациентом, слушается там же, где читается разговор.
    return (
      <AudioPlayer className="mt-1 w-full max-w-xs overflow-hidden rounded-lg border border-border">
        <AudioPlayerElement src={part.url} />
        <AudioPlayerControlBar className="gap-1 px-2">
          <AudioPlayerPlayButton />
          <AudioPlayerTimeDisplay showDuration />
          <AudioPlayerTimeRange />
          <AudioPlayerMuteButton />
        </AudioPlayerControlBar>
      </AudioPlayer>
    )
  }
  return (
    <a
      href={part.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-accent"
    >
      <FileText size={13} className="text-muted-foreground" />
      {part.filename ?? ui.imageAlt}
    </a>
  )
}

// 🔒 ПРЕВЬЮ ПРИКРЕПЛЁННОГО РИСУЕМ САМИ, И ЭТО НЕ САМОДЕЯТЕЛЬНОСТЬ (Рома нашёл на живом
// экране 2026-08-25: «когда я прикрепляю изображение, они не появляются в чате»).
//
// ✗ Я взял `PromptInput` голым: кнопка «прикрепить» есть, файл в состояние ложится, а
// показать его НЕЧЕМ — в версии 1.9.0 готового `PromptInputAttachments` не существует, из
// всего хозяйства вложений наружу торчит только хук `usePromptInputAttachments`. Человек
// выбирал файл, не видел ровно ничего и справедливо считал, что вложения не работают.
//
// 🔒 УРОК ШИРЕ ЭТОГО ЭКРАНА: «библиотека умеет вложения» и «библиотека ПОКАЗЫВАЕТ
// вложения» — разные утверждения. Состав компонентов надо смотреть в её файле, а не
// выводить из наличия кнопки.
function Attachments({ ui }: { ui: MessageThreadsUi }) {
  const attachments = usePromptInputAttachments()
  if (attachments.files.length === 0) return null

  return (
    // 🔒 ПРЕВЬЮ ПРИЖАТО ВЛЕВО, И ЭТО НЕ КЛАСС `justify-start` (Рома, 2026-08-25).
    // ✗ Здесь стоял голый `div`, и он попадал ПРЯМЫМ ребёнком `InputGroup`, а тот —
    // `flex w-full items-center`, то есть горизонтальный ряд: миниатюра вставала в один
    // ряд с текстовым полем и центрировалась по нему.
    // В колонку `InputGroup` переключается ТОЛЬКО при ребёнке с `data-align="block-start"`,
    // и такой ребёнок у него уже есть — `InputGroupAddon align="block-start"`. Поэтому
    // обёртка не косметическая: она сообщает группе, что это отдельная строка сверху.
    // `justify-start` при этом всё равно нужен — в базовом классе аддона стоит
    // `justify-center`.
    <InputGroupAddon align="block-start" className="flex-wrap justify-start gap-2">
      {attachments.files.map((f) => (
        <div key={f.id} className="relative">
          <AttachmentThumb part={f} ui={ui} />
          <button
            type="button"
            aria-label={ui.removeAttachment}
            title={ui.removeAttachment}
            onClick={() => attachments.remove(f.id)}
            className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-background p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </InputGroupAddon>
  )
}


// ОТКУДА ВЗЯЛОСЬ ИСХОДЯЩЕЕ СООБЩЕНИЕ — заказ Ромы 2026-08-25.
//
// 🔒 ЦВЕТ ЗДЕСЬ НЕСЁТ СМЫСЛ, А НЕ УКРАШАЕТ. Оператор, открывший ветку, обязан за секунду
// понять, кто говорил от имени клиники: он сам, модель или расписание. От этого зависит,
// можно ли верить обещаниям в тексте и надо ли вмешиваться прямо сейчас.
//
// 🔒 ПОЛОСА СЛЕВА, А НЕ ФОН ПУЗЫРЯ. Фон уже занят стороной разговора (свой или чужой), и
// второй смысл на том же признаке сделал бы нечитаемыми оба.
const ORIGIN = {
  manager: { border: "border-l-emerald-500", icon: UserRoundCheck, text: "text-emerald-600 dark:text-emerald-400" },
  ai: { border: "border-l-sky-500", icon: Bot, text: "text-sky-600 dark:text-sky-400" },
  timer: { border: "border-l-orange-500", icon: Clock, text: "text-orange-600 dark:text-orange-400" },
} as const

/** Строки старше колонки origin: у них есть только старый признак модели. */
function originOf(m: { origin: string | null; ai_generated: number; direction: string }): keyof typeof ORIGIN | null {
  if (m.direction !== "outgoing") return null
  if (m.origin === "ai" || m.origin === "timer" || m.origin === "manager") return m.origin
  return m.ai_generated ? "ai" : "manager"
}

export function Thread(
  { messages, ui, lang, sending, typing, isTest, onSend }: {
    messages: ChatMessage[]
    ui: MessageThreadsUi
    /** Язык нужен инструменту распознавания речи. */
    lang: string
    sending: boolean
    typing: boolean
    /** Ветка ТЕСТОВОГО ЮЗЕРА: номер владельца, писать можно что угодно. */
    isTest: boolean
    onSend: (text: string, files: PromptInputMessage["files"], channel: string) => void | Promise<void>
  },
) {
  // Одна ссылка на два потребителя: поле её ставит, микрофон по ней вставляет речь.
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  // 🔒 «АВТО» ПО УМОЛЧАНИЮ, И ЭТО НЕ ЛЕНЬ. Служба знает состояние своих сессий лучше нас:
  // сегодня WhatsApp не поднят, и жёстко выбранный WhatsApp означал бы гарантированную
  // недоставку там, где Telegram дошёл бы сам.
  const [channel, setChannel] = useState<"auto" | "whatsapp" | "telegram">("auto")

  return (
    <div className="flex flex-col gap-3">
      {/* 🔒 СТРОКА НАД ЛЕНТОЙ ОТВЕЧАЕТ НА ВОПРОС ЭТОЙ ВЕТКИ, А НЕ ВООБЩЕ. В живой ветке
          главное — что канала нет и наружу ничего не уходит. В тестовой это неправда по
          форме: там и вопросы придуманы скриптом, и говорить про доставку не о чем. */}
      {/* 🔒 ЖИВАЯ ВЕТКА ПРЕДУПРЕЖДАЕТ ГРОМЧЕ ТЕСТОВОЙ, И ЦВЕТ ЗДЕСЬ — ЧАСТЬ СМЫСЛА.
          ✗ 2026-08-25 владелец набрал в ЖИВОЙ ветке «s.dmlf;zldf» — проверял, как работает
          отправка. Не ушло только потому, что ключа канала в тот час ещё не было. Теперь
          ключ есть, и такое сообщение дошло бы до настоящей пациентки. Экран обязан
          сказать это ДО нажатия, а не после. */}
      <p className={`rounded-lg border px-3 py-2 text-[11px] ${isTest ? "border-amber-500/40 bg-amber-500/5 text-muted-foreground" : "border-destructive/50 bg-destructive/5 font-medium text-destructive"}`}>
        {isTest ? ui.demoThreadNotice : ui.liveThreadNotice}
      </p>

      <Conversation className="h-[55vh] rounded-xl border border-border">
        <ConversationContent>
          {messages.length === 0 && <EmptyState title={ui.emptyThread} />}

          {messages.map((m) => (
            <Message key={m.id} from={m.direction === "outgoing" ? "user" : "assistant"}>
              {/* 🔒 ПОЛОСА — НА КАРТОЧКЕ, А НЕ НА КОНТЕЙНЕРЕ (Рома, 2026-08-25).
                  ✗ Сначала я поставил её на `Message` — а это внешняя обёртка во всю
                  ширину ленты, и полоса оказалась у края экрана, оторванная от самого
                  пузыря. Метка обязана держаться того, что помечает: полоса на карточке
                  читается как её левая грань, полоса на контейнере — как разделитель
                  списка. */}
              <MessageContent className={originOf(m) ? `border-l-4 rounded-l-none pl-3 ${ORIGIN[originOf(m)!].border}` : undefined}>
                {/* 🔒 РИСУЮТСЯ ЧАСТИ, А НЕ ПОЛЯ (решение владельца о стандарте AI SDK).
                    ✗ Здесь стояло «текст плюс одно вложение» — форма, в которую я разобрал
                    стандартную структуру в шаге 25. Она не умеет ни трёх файлов, ни их
                    порядка: приложенное всегда оказывалось после сказанного, даже если
                    человек сделал наоборот. Части несут и то, и другое. */}
                {partsOf(m).map((part, i) =>
                  part.type === "text" ? (
                    <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                  ) : (
                    <AttachmentView key={i} part={part} ui={ui} />
                  ),
                )}

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="tabular-nums">{when(m.created_at)}</span>
                  {(() => {
                    const o = originOf(m)
                    if (!o) return null
                    const C = ORIGIN[o].icon
                    const word = o === "ai" ? ui.byAi : o === "timer" ? ui.byTimer : ui.byManager
                    return (
                      <span className={`inline-flex items-center gap-1 ${ORIGIN[o].text}`}>
                        <C size={11} />{word}
                      </span>
                    )
                  })()}
                  {/* 🔒 ДВА РАЗНЫХ ВОПРОСА, ДВА РАЗНЫХ СЛОВА (Рома, 2026-08-25).
                      ✗ Здесь стояла одна пометка «не доставлено» на всём подряд, и в
                      ТЕСТОВОЙ ветке она была бессмысленна: доставки там не бывает по
                      устройству — никто эти сообщения не отправляет и не получает.
                      Пометка о доставке в придуманном разговоре учит человека не верить
                      пометкам вообще, а они ему понадобятся на живом потоке.
                      В живой ветке слово про доставку — настоящее состояние (сейчас
                      всегда «не доставлено»: канала нет; появится ChatPush — станет
                      приходить ответ системы). В тестовой — «тестовое сообщение». */}
                  {isTest ? (
                    <Badge variant="outline" className="border-amber-500/50 px-1.5 py-0 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                      {ui.testMessage}
                    </Badge>
                  ) : m.direction === "outgoing" ? (
                    <>
                      {/* 🔒 МАРШРУТ ВИДЕН, И ЭТО ЗАКАЗ РОМЫ 25.08: «почему в нашем чате не
                          видно, куда отправляются сообщения». Раньше показать было нечего —
                          мы САМИ не знали: канал выбирала служба, и обратно он не
                          возвращался. Теперь возвращается и хранится. */}
                      {m.channel_used && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                          {m.channel_used.includes("tdlib") ? "Telegram" : m.channel_used.includes("whatsapp") ? "WhatsApp" : m.channel_used}
                        </Badge>
                      )}
                      {m.delivery === "accepted" && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                          {ui.accepted}
                        </Badge>
                      )}
                      {/* Канала нет вовсе — сообщение сохранено и ждёт. Это не отказ
                          службы, а её отсутствие, и слово другое. */}
                      {m.delivery === "pending" && (
                        <Badge variant="outline" className="border-amber-500/50 px-1.5 py-0 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                          {ui.notDelivered}
                        </Badge>
                      )}
                      {m.delivery === "failed" && (
                        <Badge variant="outline" className="border-destructive/50 px-1.5 py-0 text-[10px] font-normal text-destructive">
                          {/* 🔒 ПРИЧИНА СЛОВАМИ СЛУЖБЫ, А НЕ КОДОМ: «Пользователь не найден
                              в Telegram» говорит человеку, что чинить; число 58 — нет. */}
                          {m.delivery_detail ?? ui.notDelivered}
                        </Badge>
                      )}
                    </>
                  ) : null}
                </div>
              </MessageContent>
            </Message>
          ))}

          {/* Имитация набора — та же геометрия, что у входящего: подменять сторону
              значило бы, что «печатает» относится к другому человеку. */}
          {typing && (
            <Message from="assistant">
              <MessageContent>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  {ui.typing}
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* 🔒 ПРЕДЕЛЫ ЗАДАНЫ БИБЛИОТЕКЕ, А НЕ НАПИСАНЫ ЗАНОВО (Рома: «не более трёх
          вложений»). Свойства maxFiles, maxFileSize и onError у PromptInput были всё это
          время — я их просто не задал, и поле молча брало сколько угодно файлов любого
          размера. Отказ теперь назван словом: слишком много, слишком большой, не тот тип.

          🔒 ТИПЫ — КАРТА ПРОЕКТА (services/upload/file-upload-field.client.tsx), а не свой
          список: два перечня допустимых расширений разойдутся в первый же день, и
          разойдутся молча — файл выберется, а загрузка откажет. */}
      {/* 🔒 ПРОВАЙДЕР НУЖЕН МИКРОФОНУ: без него текст поля неуправляем (живёт в форме),
          и вставить туда расшифровку нечем. С ним значение ведёт контроллер, и диктовка
          ложится в то же поле, где человек набирает руками. */}
      <PromptInputProvider>
      <PromptInput
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.html,.htm"
        multiple
        maxFiles={3}
        maxFileSize={25 * 1024 * 1024}
        onError={(err) => toast.error(err.code === "max_files" ? ui.tooManyFiles : err.code === "max_file_size" ? ui.fileTooBig : ui.badFileType)}
        // 🔒 ПРОМИС ВОЗВРАЩАЕТСЯ, А НЕ ГЛОТАЕТСЯ. ✗ Здесь стояло `void onSend(…)`, и
        // `PromptInput` видел синхронный обработчик: он чистил поле СРАЗУ, не дожидаясь
        // ни загрузки картинки, ни ответа двери, — то есть написанное пропадало ровно в
        // тот момент, когда отправка могла не удаться.
        //
        // Пустое не отправляем: дверь ответила бы `400 empty`, и человек увидел бы
        // «не удалось сохранить» вместо простого «здесь пока нечего отправлять».
        onSubmit={(message) => {
          if (!message.text.trim() && message.files.length === 0) return
          return onSend(message.text, message.files, channel)
        }}
      >
        <PromptInputBody>
          {/* Превью стоит НАД полем ввода, как в любом мессенджере: человек видит, что
              именно уйдёт вместе с текстом, и может снять это до отправки. */}
          <Attachments ui={ui} />
          <PromptInputTextarea ref={areaRef} placeholder={ui.writeHere} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                {/* ✗ ЗДЕСЬ БЫЛО НАПИСАНО «Прикрепить изображение», и надпись пережила
                    расширение типов: файлы принимались любые, а меню продолжало обещать
                    только картинки. Владелец так и сказал — «до сих пор горит только
                    возможность прикрепить изображение».
                    🔒 УРОК: расширив ЧТО принимается, проверь, что об этом сказано ТАМ,
                    ГДЕ ЧЕЛОВЕК ВЫБИРАЕТ. Возможность, о которой не написано, не
                    существует — ровно как невидимая ссылка на карточку в шаге 23. */}
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                  {ui.attachHint}
                </DropdownMenuLabel>
                <PromptInputActionAddAttachments label={ui.attach} />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            {/* Микрофон стоит РЯДОМ со скрепкой: обе кнопки про то, чем дополнить
                сообщение. Разница названа в самом инструменте — он показывает запись и
                отдаёт текст, а не файл. */}
            <VoiceButton lang={lang} disabled={sending} areaRef={areaRef} />

            {/* 🔒 ВЫБОР КАНАЛА — ЗАКАЗ РОМЫ 25.08: «почему я не могу выбрать, куда
                отправить». Возможность проверена запросами к службе, а не взята из
                документации: неверное значение она молча заменила своим, верное приняла и
                записала. */}
            {(["auto", "whatsapp", "telegram"] as const).map(c => (
              <button
                key={c}
                type="button"
                disabled={sending}
                title={ui.channelHint}
                onClick={() => setChannel(c)}
                className={`rounded-md px-2 py-1 text-[11px] transition-colors ${channel === c ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c === "auto" ? ui.channelAuto : c === "whatsapp" ? ui.channelWhatsapp : ui.channelTelegram}
              </button>
            ))}
          </PromptInputTools>
          <PromptInputSubmit status={sending ? "submitted" : undefined} />
        </PromptInputFooter>
      </PromptInput>
      </PromptInputProvider>
    </div>
  )
}
