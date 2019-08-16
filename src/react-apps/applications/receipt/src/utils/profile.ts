export function getUserID(): string {
  if (window.location.hostname === 'localhost') {
    return '20000005';
  } else {
    // todo: fetch id from jwt claims
    return '20000006';
  }
}
