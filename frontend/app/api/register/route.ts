import { forwardAuthRequest } from "../_lib/forward-auth-request";

export async function POST(request: Request) {
  return forwardAuthRequest(request, "/register");
}
