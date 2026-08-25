import Entry from "./_components"

// Тонкий вход: язык И идентификатор из адреса уходят в компонент маршрута.
//
// ✗ Здесь `id` брался из `params` и ВЫБРАСЫВАЛСЯ — заглушке шага 7 он был не
// нужен. Карточке нужен: без него островок не знает, чью историю просить.
export default async function Page({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  return <Entry lang={lang} id={id} />
}
