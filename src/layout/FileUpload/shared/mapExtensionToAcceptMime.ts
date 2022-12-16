import mime from 'mime';

type MapExtensionToAcceptMimeProps = {
  extensionList: string | string[];
};

export const mapExtToMimeObject = (ext: string) => {
  const mimeType = mime.getType(ext);

  if (!mimeType) {
    return {
      'application/octet-stream': [ext],
    };
  }

  return {
    [mimeType]: [ext],
  };
};

export const mapExtensionToAcceptMime = ({ extensionList }: MapExtensionToAcceptMimeProps) => {
  if (extensionList.includes(',')) {
    extensionList = (extensionList as string).split(',');
  }

  if (Array.isArray(extensionList)) {
    return extensionList.reduce((list, extension) => {
      return {
        ...list,
        ...mapExtToMimeObject(extension.trim()),
      };
    }, {});
  }

  return mapExtToMimeObject(extensionList);
};
