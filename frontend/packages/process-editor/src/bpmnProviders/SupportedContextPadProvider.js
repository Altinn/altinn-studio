class SupportedContextPadProvider {
  constructor(contextPad) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries() {
    return function (entries) {
      // Should not be able to replace the entry
      delete entries['replace'];
      return entries;
    };
  }
}

SupportedContextPadProvider.$inject = ['contextPad'];

export default {
  __init__: ['supportedContextPadProvider'],
  supportedContextPadProvider: ['type', SupportedContextPadProvider],
};
