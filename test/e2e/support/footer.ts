import type { IFooterLayout } from 'src/features/footer/types';

export const mockFooter: IFooterLayout = {
  footer: [
    {
      type: 'Text',
      title: '**Frontend Test**<br>*Testdepartementet*',
    },
    {
      type: 'Link',
      icon: 'information',
      title: 'general.accessibility',
      target: 'https://www.altinn.no/om-altinn/tilgjengelighet/',
    },
    {
      type: 'Email',
      title: 'hjelp@etaten.no',
      target: 'hjelp@etaten.no',
    },
    {
      type: 'Phone',
      title: '+47 987 65 432',
      target: '+4798765432',
    },
  ],
};
