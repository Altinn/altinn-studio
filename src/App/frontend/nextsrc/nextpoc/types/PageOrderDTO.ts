export interface PageOrderDTO {
  $schema: string;
  pages: {
    order: string[];
  };
}

export const exampleLayoutSettings: PageOrderDTO = {
  $schema: 'https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json',
  pages: {
    order: [
      'InputPage',
      'TextareaPage',
      'RadioButtonsPage',
      'CheckboxesPage',
      'DropdownPage',
      'MultipleSelectPage',
      'LikertPage',
      'GroupPage',
      'AddressPage',
      'FileUploadPage',
      'MapPage',
      'ListPage',
      'GridPage',
      'CardsPage',
      'RepeatingGroupPage',
      'TabsPage',
      'DatepickerPage',
      'TextPage',
      'NumberPage',
      'DatePage',
      'PersonLookupPage',
      'OrganisationLookupPage',
      'SummaryPage',
    ],
  },
};
