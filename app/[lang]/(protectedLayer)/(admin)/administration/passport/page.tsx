import PassportEntry from "./_components"

// Тонкий вход: язык из адреса уходит в компонент маршрута.
// Сегмент `[lang]` в пути стоит потому, что так говорит конфиг
// (`NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,ru` — набор больше одного), а не потому,
// что так было в исходнике: языковой режим решает конфиг, а не чужой проект.
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <PassportEntry lang={lang} />
}
