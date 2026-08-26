import { PageHeader } from "@/components/content-page/page-header.server"
import { channelsUi } from "../_data/ui.i18n"
import { ChannelSettings } from "../_widgets/dynamic/channel-settings/index.client"
import { channelSettingsUi } from "../_widgets/dynamic/channel-settings/ui.i18n"
import { knowledgeUi } from "../_widgets/dynamic/channel-settings/knowledge.i18n"
import { testBlockUi } from "../../company/_widgets/dynamic/company-form/test-block.i18n"
import { KeysBlock } from "../../company/_widgets/dynamic/company-form/keys-block.client"
import { keysUi } from "../../company/_widgets/dynamic/company-form/keys.i18n"
import { Troubles } from "../_widgets/dynamic/channel-settings/troubles"
import { troublesUi } from "../_widgets/dynamic/channel-settings/troubles.i18n"

// «НАСТРОЙКА КАНАЛОВ СВЯЗИ» — экран администратора (шаг 32, заказ Ромы 2026-08-25).
//
// 🔒 ОТДЕЛЬНЫЙ ЭКРАН, А НЕ РАЗДЕЛ В НАСТРОЙКАХ КОМПАНИИ. Владелец сказал: «мы добавили
// настройки чата в общую кнопку настройки приложения — наверно, это слишком избыточно».
// Причина глубже тесноты: `/company` отвечает на вопрос «кто мы» — имя, телефон, логотип;
// канал связи отвечает «как мы разговариваем». Один экран на два предмета всегда
// проигрывает: правишь телефон — читаешь про векторные данные.
//
// 🔒 ЧТО ПЕРЕЕХАЛО ПО-НАСТОЯЩЕМУ: тестовые номера — не только на экран, но и в ХРАНИЛИЩЕ
// настроек канала. Пока они лежали в настройках компании, записать их можно было только
// дверью компании, а та требует непустого названия: номер нельзя было сохранить, не трогая
// идентичность сайта. Переезд наполовину и был бы тем самым «мостиком», который потом
// живёт годами.
export default function ChannelsEntry({ lang }: { lang: string }) {
  const t = channelsUi(lang)

  return (
    <main className="min-h-screen bg-background">
      <div data-app-column className="px-6 py-[var(--page-py-work)]">
        <PageHeader lang={lang} breadcrumbs={[{ label: t.title }]} title={t.title} subtitle={t.subtitle} />

        <div className="mt-8">
          <ChannelSettings ui={channelSettingsUi(lang)} testUi={testBlockUi(lang)} knowledgeUi={knowledgeUi(lang)} lang={lang} />
        </div>

        {/* Ключи зовутся из папки настроек компании: их файл остался на месте, копия
            разошлась бы с оригиналом в первый же день правки. */}
        <KeysBlock ui={keysUi(lang)} />

        {/* Блок бед — САМЫМ НИЗОМ страницы: его читают, когда всё выше уже настроено, а
            сообщение всё равно не идёт. */}
        <Troubles ui={troublesUi(lang)} />
      </div>
    </main>
  )
}
