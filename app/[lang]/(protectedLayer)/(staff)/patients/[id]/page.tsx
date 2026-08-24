import Entry from "./_components"

// Тонкий вход: язык и идентификатор из адреса уходят в компонент маршрута.
export default async function Page({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang } = await params
  return <Entry lang={lang} />
}
