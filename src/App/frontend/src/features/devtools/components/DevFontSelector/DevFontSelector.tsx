import React, { useState } from 'react';

import { Fieldset, ToggleGroup } from '@digdir/designsystemet-react';

import { fontKeys, getCurrentFont, getFontName, isFont, setFont } from 'src/features/devtools/utils/devFont';

const description =
  'Legg til ?font=inter i adressen for å beholde valget ved ny lasting. «Generer PDF» følger ikke valget.';

export function DevFontSelector() {
  const [font, setSelectedFont] = useState(getCurrentFont);

  function handleChange(value: string) {
    if (isFont(value)) {
      setFont(value);
      setSelectedFont(value);
    }
  }

  return (
    <Fieldset>
      <Fieldset.Legend>Font</Fieldset.Legend>
      <Fieldset.Description>{description}</Fieldset.Description>
      <div>
        <ToggleGroup
          data-size='sm'
          onChange={handleChange}
          value={font}
        >
          {fontKeys.map((f) => (
            <ToggleGroup.Item
              key={f}
              value={f}
            >
              {getFontName(f)}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
      </div>
    </Fieldset>
  );
}
