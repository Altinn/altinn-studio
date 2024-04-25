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
              'Prosess-steget du vil slette kan være knyttet til en sidegruppe. Den kan inneholde visningsoppsett eller skjema du har satt opp. Hvis du sletter steget, sletter du også hele sidegruppen og alt som hører til.',
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
      delete entries['append.intermediate-event'];
      delete entries['append.end-event'];
      delete entries['append.gateway'];
      delete entries['append.append-task'];

      // Should be moved to our custom properties panel
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
