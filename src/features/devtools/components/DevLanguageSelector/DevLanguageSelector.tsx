import React from 'react';

import { Fieldset } from '@digdir/design-system-react';

import { LanguageSelector } from 'src/components/presentation/LanguageSelector';

export const DevLanguageSelector = () => (
  <Fieldset
    legend='Språk'
    style={{ width: 250 }}
  >
    <LanguageSelector hideLabel={true} />
  </Fieldset>
);
