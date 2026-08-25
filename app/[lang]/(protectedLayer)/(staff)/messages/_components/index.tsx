import { PageHeader } from "@/components/content-page/page-header.server"
import { messagesUi } from "../_data/ui.i18n"
import { messageThreadsUi } from "../_widgets/dynamic/message-threads/ui.i18n"
import { MessageThreads } from "../_widgets/dynamic/message-threads/index.client"

// Вход страницы ПЕРЕПИСКИ — серверный компонент и статическая оболочка.
export default function MessagesEntry({ lang }: { lang: string }) {
  const t = messagesUi(lang)
  const ui = messageThreadsUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />
        <div className="mt-6">
          <MessageThreads lang={lang} ui={ui} />
        </div>
      </div>
    </main>
  )
}
