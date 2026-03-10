export function normalizeCallbackBodyPayload(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return { raw: value };
  }
  if (value == null) {
    return {};
  }
  return { raw: JSON.stringify(value) };
}
