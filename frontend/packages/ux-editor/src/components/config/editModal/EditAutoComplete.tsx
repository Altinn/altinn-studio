import React, { useEffect, useMemo, useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { LegacyTextField, LegacyPopover, Button } from '@digdir/design-system-react';
import { stringToArray, arrayToString } from '../../../utils/stringUtils';
import { replaceLastItem } from 'app-shared/utils/arrayUtils';
import { FormField } from '../../FormField';

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

export const EditAutoComplete = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const [searchFieldFocused, setSearchFieldFocused] = useState<boolean>(false);
  const initialAutocompleteText = component?.autocomplete || '';
  const [autocompleteText, setAutocompleteText] = useState<string>(initialAutocompleteText);

  useEffect(() => {
    setAutocompleteText(initialAutocompleteText);
  }, [initialAutocompleteText, component.id]);

  const autoCompleteOptions = useMemo((): string[] => {
    const lastWord = getLastWord(autocompleteText);
    return stdAutocompleteOpts.filter((alternative) => alternative.includes(lastWord))?.slice(0, 6);
  }, [autocompleteText]);

  const buildNewText = (word: string): string => {
    const wordParts = stringToArray(autocompleteText, ' ');
    const newWordParts = replaceLastItem(wordParts, word);
    return arrayToString(newWordParts);
  };

  const handleWordClick = (word: string): void => {
    const autocomplete = buildNewText(word);
    setAutocompleteText(autocomplete);
    handleComponentChange({
      ...component,
      autocomplete,
    });
    setSearchFieldFocused(false);
  };

  const handleChange = (value: string): void => {
    if (!searchFieldFocused) setSearchFieldFocused(true);
    setAutocompleteText(value);
  };

  return (
    <div>
      <FormField
        id={component.id}
        label='Autocomplete (WCAG)'
        value={autocompleteText}
        onChange={handleWordClick}
        propertyPath={`${component.propertyPath}/properties/autocomplete`}
        renderField={({ fieldProps }) => (
          <LegacyTextField
            {...fieldProps}
            onFocus={(): void => setSearchFieldFocused(true)}
            onBlur={(): void => {
              if (searchFieldFocused) setSearchFieldFocused(false);
            }}
            onChange={(event) => {
              const { value } = event.target;
              handleChange(value);
              fieldProps.onChange(value);
            }}
          />
        )}
      />
      <LegacyPopover
        variant='default'
        open={searchFieldFocused && autoCompleteOptions.length > 0}
        placement='bottom-start'
        arrow={false}
        trigger={<div />}
      >
        {autoCompleteOptions.map(
          (option): JSX.Element => (
            <Button
              role='option'
              key={option}
              size='small'
              color='second'
              variant='tertiary'
              onMouseDown={() => handleWordClick(option)}
            >
              {option}
            </Button>
          ),
        )}
      </LegacyPopover>
    </div>
  );
};
