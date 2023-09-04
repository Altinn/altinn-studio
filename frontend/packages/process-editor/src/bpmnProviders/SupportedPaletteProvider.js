const supportedEntries = [
  'create.exclusive-gateway',
  'create.start-event',
  'create.end-event',
  'create.task',
];

class SupportedPaletteProvider {
  constructor(palette) {
    palette.registerProvider(this);
  }

  getPaletteEntries() {
    return (entries) => {
      this._deleteUnsupportedEntries(entries);
      return entries;
    };
  }

  _deleteUnsupportedEntries(entries) {
    const entriesToDelete = this._getUnsupportedEntries(entries);
    entriesToDelete.forEach((entry) => {
      delete entries[entry];
    });
  }

  _getUnsupportedEntries(entries) {
    return Object.keys(entries).filter(this._isUnsupportedEntry);
  }

  _isUnsupportedEntry(entry) {
    return !supportedEntries.includes(entry);
  }
}

SupportedPaletteProvider.$inject = ['palette'];

export default {
  __init__: ['supportedPaletteProvider'],
  supportedPaletteProvider: ['type', SupportedPaletteProvider],
};
