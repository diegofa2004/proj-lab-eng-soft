import { forwardWritingRequest, invalidBookId } from "@/app/api/_lib/writing";

type RouteContext = {
  params: Promise<{ id: string; chapterId: string }>;
};

function parseIds(params: { id: string; chapterId: string }) {
  const bookId = Number(params.id);
  const chapterId = Number(params.chapterId);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) return null;
  if (!Number.isSafeInteger(chapterId) || chapterId <= 0) return null;
  return { bookId, chapterId };
}

export async function PATCH(request: Request, context: RouteContext) {
  const ids = parseIds(await context.params);
  if (!ids) return invalidBookId();
  return forwardWritingRequest(
    request,
    `/v2/books/${ids.bookId}/chapters/${ids.chapterId}`,
    "PATCH",
    await request.text(),
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const ids = parseIds(await context.params);
  if (!ids) return invalidBookId();
  return forwardWritingRequest(
    request,
    `/v2/books/${ids.bookId}/chapters/${ids.chapterId}`,
    "DELETE",
  );
}
