import Entry from "./_components"

// Тонкий вход: язык из адреса уходит в компонент маршрута.
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <Entry lang={lang} />
}
