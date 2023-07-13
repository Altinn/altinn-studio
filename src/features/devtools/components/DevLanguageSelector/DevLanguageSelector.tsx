import React from 'react';

import { FieldSet } from '@digdir/design-system-react';

import { LanguageSelector } from 'src/components/presentation/LanguageSelector';

export const DevLanguageSelector = () => (
  <FieldSet
    legend='Språk'
    style={{ width: 250 }}
  >
    <LanguageSelector hideLabel={true} />
  </FieldSet>
);
