"use client";

import Link from "next/link";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { AuthShellSide } from "@/components/menu/account/account-config";
import type { AccountLabels } from "@/components/menu/account/account-menu.i18n";

// ВТОРАЯ ФОРМА АККАУНТА: когда показывать нечего, кроме того, кто вошёл.
//
// 🔒 Решение владельца 2026-08-25, дословно: «если у ящика нет вообще ни одной
// активной секции с ссылками, то вместо ящика показывай Drop Down меню. Нет
// смысла открывать огромный ящик, чтобы показать одну ссылку внизу».
//
// 🔒 ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ВЕТКА ВНУТРИ ЯЩИКА. Ящик и без того шёл к пределу в
// 250 строк, а ветка добавляла к нему сорок: две разные формы одного смысла
// читаются как две формы, а не как условие посреди разметки. Решение «какая
// форма» остаётся в одном месте — в `AccountDrawer`.
//
// 🔒 СОДЕРЖИМОЕ ОБЯЗАНО СОВПАДАТЬ С НИЗОМ ЯЩИКА: кто вошёл и выход. Это одна
// строка идентичности в двух формах, и разъехаться им нельзя — поэтому обе
// ветки получают одни и те же `email`, `roles` и один адрес выхода.
export function AccountDropdown({ lang, side, labels, email, roles }: {
  lang: string;
  side: AuthShellSide;
  labels: AccountLabels;
  email?: string;
  roles?: string[];
}) {
  const roleList = roles && roles.length ? roles : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={labels.account} title={labels.account}>
          <User /><span className="hidden sm:inline">{labels.account}</span>
        </Button>
      </DropdownMenuTrigger>

      {/* Сторона та же, что у ящика: кнопка стоит справа или слева по настройке
          оболочки, и меню обязано открываться от неё, а не от середины экрана. */}
      <DropdownMenuContent align={side === "left" ? "start" : "end"} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm text-foreground">{email}</span>
          {/* Роли строкой, а не подсказкой. В ящике они живут в подсказке, но
              подсказка внутри выпадающего меню отбирает у него фокус, и человек
              теряет и то и другое. */}
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {roleList.length ? roleList.join(", ") : "—"}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Тот же относительный адрес и тот же `prefetch={false}`, что в ящике:
            `/logout` уводит переадресацией на домен службы авторизации, и
            предзагрузка, которой никто не просил, давала бы ошибку CORS. */}
        <DropdownMenuItem asChild>
          <Link href={`/logout?lang=${lang}`} prefetch={false}>
            <LogOut />{labels.signOut}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
