import { markdownRoute } from "@/lib/aio/md-route";

// Markdown-версия страницы для машинных читателей. Логика общая —
// `lib/aio/md-route.ts`; здесь только адрес поверхности и значения сегмента:
// Next разбирает их статически и переэкспорт из объекта не принимает.
const md = markdownRoute("/connect/yclients");

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = md.generateStaticParams;
export const GET = md.GET;
