import React, { useEffect, useMemo, useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import {
  TextField,
  Popover,
  PopoverVariant,
  Button,
  ButtonSize,
  ButtonColor,
  ButtonVariant,
} from '@digdir/design-system-react';
import { stringToArray, arrayToString } from '../../../utils/stringUtils';
import { replaceLastItem } from 'app-shared/utils/arrayUtils';

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
  }, [initialAutocompleteText]);

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
  };

  const persistChange = (): void =>
    handleComponentChange({
      ...component,
      autocomplete: autocompleteText,
    });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setAutocompleteText(event.target.value);
  };

  return (
    <div>
      <TextField
        id={`component-id-input${component.id}`}
        label='Autocomplete (WCAG)'
        onChange={handleChange}
        value={autocompleteText}
        onFocus={(): void => setSearchFieldFocused(true)}
        onBlur={(): void => {
          persistChange();
          setTimeout(() => {
            setSearchFieldFocused(false);
          }, 100);
        }}
      />
      <Popover
        variant={PopoverVariant.Default}
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
              size={ButtonSize.Small}
              color={ButtonColor.Secondary}
              variant={ButtonVariant.Quiet}
              onClick={() => handleWordClick(option)}
            >
              {option}
            </Button>
          )
        )}
      </Popover>
    </div>
  );
};
