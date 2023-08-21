const supportedEntries: string[] = [
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
      this.deleteUnsupportedEntries(entries);
      return entries;
    };
  }

  private deleteUnsupportedEntries(entries): void {
    const entriesToDelete = this.getUnsupportedEntries(entries);
    entriesToDelete.forEach((entry) => {
      delete entries[entry];
    });
  }

  private getUnsupportedEntries(entries): string[] {
    return Object.keys(entries).filter(this.isUnsupportedEntry);
  }

  private isUnsupportedEntry(entry: string): boolean {
    return !supportedEntries.includes(entry);
  }
}

export default {
  __init__: ['SupportedPaletteProvider'],
  SupportedPaletteProvider: ['type', SupportedPaletteProvider],
};
