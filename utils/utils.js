export function cleanAndParse(raw) {
  // strip leading ```json and trailing ``` if present
  const clean = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "");
  return JSON.parse(clean);
}
