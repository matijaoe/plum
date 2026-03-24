import dayjs from "dayjs";

export function formatDate(dateStr: string): string {
  const d = dayjs(dateStr);
  return d.isValid() ? d.format("MMMM D, YYYY") : dateStr;
}
