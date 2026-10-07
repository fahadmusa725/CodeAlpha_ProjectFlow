export function getValidatedFrom(fromParam: string | null): string {
  if (
    !fromParam ||
    !fromParam.startsWith("/") ||
    fromParam.startsWith("//") ||
    fromParam.startsWith("/\\")
  ) {
    return "/projects";
  }
  return fromParam;
}
