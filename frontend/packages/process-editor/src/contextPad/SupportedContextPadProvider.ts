export default class SupportedContextPadProvider {
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
