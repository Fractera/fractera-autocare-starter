"use client"

// ВИДЖЕТ «аудит базы» — динамический островок в статической странице.
//
// 🔒 ЕДИНИЦА ВЛАДЕНИЯ: выборка, скелетон, плитка, слова — всё в этой папке.
// Снеси папку маршрута, и виджет исчезнет целиком.
//
// 🔒 ЧИСЛО, КОТОРОЕ НЕ ИЗМЕРЕНО, НЕ ПОКАЗЫВАЕТСЯ ЦИФРОЙ. Если CRM не отдала
// поле, на его месте стоит «не измерено» словами. ✗ Иначе экран сообщил бы
// «отказников 0» как факт — и это ровно та ложь, ради поимки которой экран
// существует.

import { EmptyState } from "@/components/ui/empty-state"
import { H4 } from "@/components/ui/typography"
import { useAudit } from "./use-audit"
import { BaseAuditSkeleton } from "./skeleton"
import { AuditTile } from "./tile"
import type { BaseAuditUi } from "./ui.i18n"

function when(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]}` : iso
}

export function BaseAudit({ ui }: { ui: BaseAuditUi }) {
  const state = useAudit(ui)
  const labels = { size: ui.sizeTitle, gaps: ui.gapsTitle, crm: ui.crmTitle, sync: ui.syncTitle }

  if (state.kind === "loading") return <BaseAuditSkeleton labels={labels} />
  if (state.kind === "failed") return <EmptyState title={ui.failed} />

  const { base, sync, consent } = state

  // 🔒 ТРИ СОСТОЯНИЯ, А НЕ ДВА: не спрашивали · спросили и пусто у всех ·
  // спросили и есть значения. Среднее — измеренный факт, и называть его «не
  // измерено» значит терять ровно то, что стоило пятнадцати минут разведки.
  const birthdayAsked = Boolean(sync && sync.birthdayFieldSeen > 0)
  const birthdayEmptyEverywhere = birthdayAsked && sync!.birthdayKnown === 0

  // Сверка с CRM — арифметика самого отчёта, а не сторонний скрипт.
  const reconcile = sync
    ? (() => {
        const expected = sync.clients - sync.skippedNoPhone - sync.mergedByPhone
        const ok = expected === base.people
        return {
          ok,
          text: (ok ? ui.reconcileOk : ui.reconcileBad)
            .replace("{clients}", String(sync.clients))
            .replace("{skipped}", String(sync.skippedNoPhone))
            .replace("{merged}", String(sync.mergedByPhone))
            .replace("{people}", String(base.people)),
        }
      })()
    : null

  return (
    <div className="space-y-8">
      <section>
        <H4 variant="ui" className="mb-3">{ui.sizeTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AuditTile value={base.people} label={ui.people} hint={ui.peopleHint} />
          <AuditTile value={base.visitRows} label={ui.visitRows} hint={ui.visitRowsHint} />
          <AuditTile value={base.crmRecords} label={ui.crmRecords} hint={ui.crmRecordsHint} />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.gapsTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AuditTile
            value={base.visitsWithoutPerson}
            label={ui.visitsWithoutPerson}
            hint={ui.visitsWithoutPersonHint}
            tone="warn"
          />
          <AuditTile value={base.neverVisited} label={ui.neverVisited} hint={ui.neverVisitedHint} />
          <AuditTile
            value={base.visitsWithoutService}
            label={ui.visitsWithoutService}
            hint={ui.visitsWithoutServiceHint}
          />
        </div>
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.crmTitle}</H4>
        <div className="grid gap-3 sm:grid-cols-2">
          {birthdayEmptyEverywhere ? (
            <AuditTile
              value={<span className="text-base">{ui.birthdayNoneAtAll}</span>}
              label={ui.birthdayUnknown}
              hint={ui.birthdayNoneAtAllHint}
              tone="warn"
            />
          ) : birthdayAsked ? (
            <AuditTile value={base.withoutBirthday} label={ui.withoutBirthday} hint={ui.withoutBirthdayHint} />
          ) : (
            <AuditTile
              value={<span className="text-base">{ui.notMeasured}</span>}
              label={ui.birthdayUnknown}
              hint={ui.birthdayUnknownHint}
              tone="warn"
            />
          )}
        </div>
      </section>

      {/* 🔒 СОГЛАСИЕ — СВОЙ РАЗДЕЛ, А НЕ ПЛИТКА В ЧУЖОМ. От него зависит, кому
          продукт вправе написать; это единственное число на экране, у которого
          цена ошибки не «неточный отчёт», а письмо человеку, который отказался. */}
      <section>
        <H4 variant="ui" className="mb-3">{ui.consentTitle}</H4>
        {!consent ? (
          <EmptyState title={ui.noConsentRun} hint={ui.noConsentRunHint} />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {ui.syncAt}: <span className="tabular-nums text-foreground">{when(consent.at)}</span>
              {" · "}
              {ui.syncBy}: <span className="text-foreground">{consent.actor}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AuditTile
                value={consent.refused}
                label={ui.consentRefused}
                hint={ui.consentRefusedHint}
                tone={consent.refused > 0 ? "warn" : "plain"}
              />
              <AuditTile value={consent.noRecord} label={ui.consentNoRecord} hint={ui.consentNoRecordHint} />
              <AuditTile value={consent.allowed} label={ui.consentAllowed} hint={ui.consentAllowedHint} />
              {/* 🔒 НЕПРОЧИТАННЫЕ — ПЛИТКА, А НЕ ПОДПИСЬ МЕЛКИМ. ✗ Оплачено
                  2026-08-25: первый проход не прочитал 491 карточку из 1844 —
                  27% базы, — и эти люди остались с прежним «писать можно», хотя
                  про них не измерено ничего. Число такого размера не имеет права
                  стоять в сноске. */}
              {consent.unreadable > 0 && (
                <AuditTile
                  value={consent.unreadable}
                  label={ui.consentUnreadableLabel}
                  hint={ui.consentUnreadableHint}
                  tone="warn"
                />
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{ui.consentRule}</p>
          </>
        )}
      </section>

      <section>
        <H4 variant="ui" className="mb-3">{ui.syncTitle}</H4>
        {!sync ? (
          <EmptyState title={ui.noSync} hint={ui.noSyncHint} />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {ui.syncAt}: <span className="tabular-nums text-foreground">{when(sync.at)}</span>
              {" · "}
              {ui.syncBy}: <span className="text-foreground">{sync.actor}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AuditTile value={sync.clients} label={ui.clients} hint={ui.clientsHint} />
              <AuditTile
                value={sync.skippedNoPhone}
                label={ui.skippedNoPhone}
                hint={ui.skippedNoPhoneHint}
                tone={sync.skippedNoPhone > 0 ? "warn" : "plain"}
              />
              <AuditTile value={sync.mergedByPhone} label={ui.mergedByPhone} hint={ui.mergedByPhoneHint} />
            </div>
            {reconcile && (
              <p
                className={`mt-3 text-xs ${reconcile.ok ? "text-muted-foreground" : "text-destructive"}`}
              >
                {ui.reconcile} — {reconcile.text}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
