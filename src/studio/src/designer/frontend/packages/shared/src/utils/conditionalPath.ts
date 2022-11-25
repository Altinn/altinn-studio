export default function (start?: string, append?: string) {
  if (!start) {
    return '';
  }
  return append ? `${start}/${append}` : start;
}
