import React, { useState } from 'react';
import type { FormComponentType } from '../../../types/global';
import { TextField, Popover, Button } from '@digdir/design-system-react';

const getLastWord = (value: string) => value.split(' ').pop();
const stdAutocompleteOpts = [
  'on',
  'off',
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'email',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'organization-title',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-extension',
  'url',
  'photo',
];

export interface Props {
  handleComponentChange: (component: FormComponentType) => void;
  component: FormComponentType;
}

export const EditAutoComplete = ({ component, handleComponentChange }: Props) => {
  const [value, setValue] = useState<string>(component?.autocomplete || '');
  const handleIdChange = (event: any) => setValue(event.target.value);

  const lastWord = getLastWord(value);

  const alternativesToShow =
    stdAutocompleteOpts.includes(lastWord) || lastWord === ''
      ? []
      : stdAutocompleteOpts.filter((alternative) => alternative.includes(lastWord)).slice(0, 6);

  const handleWordClick = (word: string) => {
    const parts = value.split(' ');
    parts[parts.length - 1] = word;
    setValue(parts.join(' '));
  };

  const handleChange = () =>
    handleComponentChange({
      ...component,
      autocomplete: value,
    });

  return (
    <div>
      <TextField
        id={`component-id-input${component.id}`}
        label='Autocomplete (WCAG)'
        onBlur={handleChange}
        onChange={handleIdChange}
        value={value}
      />
      <Popover
        variant='default'
        open={alternativesToShow.length > 0}
        placement='bottom-start'
        arrow={false}
        trigger={<div />}
      >
        {alternativesToShow.map((word) => (
          <Button
            size='small'
            color='inverted'
            variant='quiet'
            key={word}
            style={{ float: 'left' }}
            onClick={() => handleWordClick(word)}
          >
            {word}
          </Button>
        ))}
      </Popover>
    </div>
  );
};
