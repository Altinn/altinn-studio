class SupportedContextPadProvider {
  constructor(contextPad) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries() {
    const overrideDeleteEntry = (entries) => {
      const deleteEntry = entries['delete'];
      entries['delete'] = {
        ...deleteEntry,
        action: {
          click: function (event, element) {
            if (element.type !== 'bpmn:Task') {
              deleteEntry.action.click(event, element);
              return;
            }

            const isConfirmed = confirm(
              'Prosessteget du ønsker å slette er knyttet til en sidegruppe, som kan inneholde konfigureringer du selv har lagt til. Hvis du sletter dette prosessteget, sletter du også tilhørende sidegruppe.',
            );

            if (isConfirmed) {
              deleteEntry.action.click(event, element);
            }
          },
        },
      };
    };

    return function (entries) {
      // Should not be able to replace the entry
      delete entries['replace'];
      overrideDeleteEntry(entries);
      return entries;
    };
  }
}

SupportedContextPadProvider.$inject = ['contextPad'];

export default {
  __init__: ['supportedContextPadProvider'],
  supportedContextPadProvider: ['type', SupportedContextPadProvider],
};
