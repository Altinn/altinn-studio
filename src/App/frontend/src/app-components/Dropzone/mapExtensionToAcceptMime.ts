import mime from 'mime';

/**
 * The 'mime' library isn't perfect. This map can be used to add
 * additional mime types for specific extensions.
 */
const extraTypes = {
  csv: ['application/csv', 'application/vnd.ms-excel'], // The last one here fixes csv uploads in Firefox on Windows
};

export const mapExtensionToAcceptMime = (extensions: string | string[]) => {
  if (typeof extensions === 'string' && extensions.includes(',')) {
    extensions = extensions.split(',');
  }
  const extensionList = Array.isArray(extensions) ? extensions : [extensions];

  const outputObject = {};
  for (const _extension of extensionList) {
    const extension = _extension.trim().replace(/^\./, '');
    const mimeType = mime.getType(extension);

    if (extension in extraTypes) {
      for (const extraMime of extraTypes[extension]) {
        pushTo(extraMime, extension, outputObject);
      }
    }

    if (mimeType) {
      pushTo(mimeType, extension, outputObject);
    } else {
      pushTo('application/octet-stream', extension, outputObject);
    }
  }

  return outputObject;
};

function pushTo(property: string, extension: string, object: Record<string, string[]>) {
  if (object[property]) {
    object[property].push(`.${extension}`);
  } else {
    object[property] = [`.${extension}`];
  }
}
