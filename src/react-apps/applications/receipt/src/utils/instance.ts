export function getInstanceOwnerId(): string {
  if (!window.location.pathname) {
    return '';
  } else {
    return window.location.pathname.split('/')[2];
  }
}

export function getInstanceId(): string {
  if (!window.location.pathname) {
    return '';
  } else {
    return window.location.pathname.split('/')[3];
  }
}
