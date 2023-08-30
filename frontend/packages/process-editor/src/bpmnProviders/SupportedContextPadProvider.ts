class SupportedContextPadProvider {
  constructor(contextPad) {
    contextPad.registerProvider(this);
  }

  public getContextPadEntries() {
    return function (entries) {
      // Should not be able to replace the entry
      delete entries['replace'];
      return entries;
    };
  }
}

export default {
  __init__: ['SupportedContextPadProvider'],
  SupportedContextPadProvider: ['type', SupportedContextPadProvider],
};
