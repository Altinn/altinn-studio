import React from 'react';

import { Fieldset } from '@digdir/designsystemet-react';

import { LanguageSelector } from 'src/components/presentation/LanguageSelector';

export const DevLanguageSelector = () => (
  <Fieldset
    legend='Språk'
    style={{
      width: 250,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <LanguageSelector />
  </Fieldset>
);
