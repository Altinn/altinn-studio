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

export function getArchiveRef(): string {
  var instanceGuid:string = getInstanceId();

  if(instanceGuid.length > 0){
    return instanceGuid.split('-')[4];
  } else {
    return '';
  }
}
