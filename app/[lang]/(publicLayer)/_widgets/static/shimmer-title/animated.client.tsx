"use client"

// Мерцающая версия заголовка. Отдельным файлом — чтобы `lazy` мог отрезать её вместе с
// библиотекой движения в отдельный кусок; в одном файле со свапом она уехала бы в общий.
//
// 🔒 РАЗМЕТКА 1:1 С БЛИЗНЕЦОМ (`static.tsx`): тот же тег, те же классы размера. Подмена
// обязана быть незаметной по геометрии, иначе первый экран дёргается на глазах у человека.

import { Shimmer } from "@/components/ai-elements/shimmer"
import { H1_STYLE } from "./parts"

export default function ShimmerTitle({ text }: { text: string }) {
  return <Shimmer as="h1" className={H1_STYLE} duration={3}>{text}</Shimmer>
}
