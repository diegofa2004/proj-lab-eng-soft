import { forwardWritingRequest, invalidBookId } from "@/app/api/_lib/writing";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookId = Number(id);
  if (!Number.isSafeInteger(bookId) || bookId <= 0) {
    return invalidBookId();
  }
  return forwardWritingRequest(
    request,
    `/v2/books/${bookId}/chapters/reorder`,
    "PUT",
    await request.text(),
  );
}
