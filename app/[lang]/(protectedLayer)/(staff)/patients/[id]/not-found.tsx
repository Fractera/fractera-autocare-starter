import Link from "next/link"
import { ConfigImage } from "@/components/media/config-image.server"

// 404 ОДНОГО пациента — не всего списка. Разница видна человеку: он остаётся в
// разделе и получает ссылку туда, где карточки есть, вместо общего тупика.
export default function PatientNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        {/* Тот же слот «404», что и у списка: разный текст, одна картинка. */}
        <ConfigImage
          slot="notFound"
          alt=""
          sizes="4rem"
          className="mx-auto mb-4 h-16 w-16 object-contain opacity-80"
        />
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <p className="mt-2 text-sm text-foreground">Такого пациента нет.</p>
        <Link href="../.." className="mt-4 inline-block text-xs text-muted-foreground underline hover:text-foreground">
          ← к списку
        </Link>
      </div>
    </main>
  )
}
