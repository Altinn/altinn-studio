import type { IFooterLayout } from 'src/features/footer/types';

export const getFooterLayoutMock = (
  overrides: Partial<IFooterLayout> | ((footerLayout: IFooterLayout) => void) = {},
): IFooterLayout => {
  const out: IFooterLayout = {
    footer: [
      {
        type: 'Email',
        title: 'general.customer_service_email',
        target: 'support@example.com',
      },
      {
        type: 'Phone',
        title: 'general.customer_service_phone',
        target: '+47 12 34 56 78',
      },
      {
        type: 'Link',
        title: 'general.accessibility_url',
        target: 'https://info.altinn.no/om-altinn/tilgjengelighet/',
        icon: 'information',
      },
      {
        type: 'Text',
        title: 'general.footer_text',
      },
    ],
  };

  if (typeof overrides === 'function') {
    overrides(out);
  } else if (overrides && Object.keys(overrides).length > 0) {
    Object.assign(out, overrides);
  }

  return out;
};