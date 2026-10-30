import { responseJson } from "../../lib/nsw-worker.js";
export function onRequestGet() {
  return responseJson({ error: "API route not found." }, 404);
}
