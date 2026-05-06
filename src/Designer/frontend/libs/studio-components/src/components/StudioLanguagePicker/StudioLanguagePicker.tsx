import { StudioSelect } from '../StudioSelect';
import { StudioButton } from '../StudioButton';
import { StudioDeleteButton } from '../StudioDeleteButton';
import { useCallback, useState, useRef, forwardRef } from 'react';
import type { ChangeEventHandler, KeyboardEventHandler, ReactElement } from 'react';
import classes from './StudioLanguagePicker.module.css';
import { PlusCircleIcon } from '@studio/icons';
import { StudioTextfield } from '../StudioTextfield';
import { validateCode } from './validateCode';
import { ArrayUtils } from '@studio/pure-functions';
import { useForwardedRef } from '@studio/hooks';

export interface StudioLanguagePickerProps {
  readonly languageCodes: string[];
  readonly onAdd: (languageCode: string) => void;
  readonly onRemove: (languageCode: string) => void;
  readonly onSelect?: (languageCode: string) => void;
  readonly texts: StudioLanguagePickerTexts;
}

export interface StudioLanguagePickerTexts {
  readonly add: string;
  readonly errorCodeExists: string;
  readonly errorEmpty: string;
  readonly label: string;
  readonly newLanguageCode: string;
  readonly remove: string;
  readonly removeConfirmMessage: (languageCode: string) => string;
}

export function StudioLanguagePicker({
  languageCodes,
  texts,
  onAdd,
  onSelect,
  onRemove,
}: StudioLanguagePickerProps): ReactElement {
  const [value, setValue] = useState<string>(languageCodes[0] || '');

  const select = useCallback(
    (code: string) => {
      setValue(code);
      onSelect?.(code);
    },
    [onSelect, setValue],
  );

  const handleSelect = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    ({ target }) => select(target.value),
    [select],
  );

  const handleDelete = useCallback((): void => {
    onRemove(value);
    select(ArrayUtils.removeItemByValue(languageCodes, value)[0] || '');
  }, [select, value, languageCodes, onRemove]);

  const handleAdd = useCallback(
    (code: string) => {
      onAdd(code);
      select(code);
    },
    [onAdd, select],
  );

  return (
    <div className={classes.root}>
      <StudioSelect
        label={texts.label}
        value={value}
        onChange={handleSelect}
        disabled={!languageCodes.length}
      >
        {languageCodes.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </StudioSelect>
      {value && (
        <StudioDeleteButton
          onDelete={handleDelete}
          confirmMessage={texts.removeConfirmMessage(value)}
        >
          {texts.remove}
        </StudioDeleteButton>
      )}
      <LanguageAdder languageCodes={languageCodes} onAdd={handleAdd} texts={texts} />
    </div>
  );
}

type LanguageAdderProps = Pick<StudioLanguagePickerProps, 'languageCodes' | 'onAdd' | 'texts'>;

function LanguageAdder({ onAdd, ...rest }: LanguageAdderProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = useCallback(
    (code: string): void => {
      onAdd(code);
      setIsOpen(false);
    },
    [onAdd, setIsOpen],
  );

  if (isOpen) {
    return <OpenLanguageAdder onAdd={handleAdd} {...rest} />;
  } else {
    return (
      <StudioButton
        data-variant='secondary'
        icon={<PlusCircleIcon />}
        onClick={() => setIsOpen(true)}
      >
        {rest.texts.add}
      </StudioButton>
    );
  }
}

type OpenLanguageAdderProps = LanguageAdderProps;

function OpenLanguageAdder({ languageCodes, onAdd, texts }: OpenLanguageAdderProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const tryAdd = useCallback((): void => {
    const input = inputRef.current!;
    if (input.reportValidity()) onAdd(input.value);
  }, [inputRef, onAdd]);

  return (
    <>
      <AddLanguageField
        languageCodes={languageCodes}
        onEnterKeyDown={tryAdd}
        ref={inputRef}
        texts={texts}
      />
      <StudioButton
        className={classes.addFieldButton}
        data-variant='secondary'
        icon={<PlusCircleIcon />}
        onClick={tryAdd}
        title={texts.add}
      />
    </>
  );
}

type AddLanguageFieldProps = Pick<OpenLanguageAdderProps, 'languageCodes' | 'texts'> & {
  readonly onEnterKeyDown: KeyboardEventHandler<HTMLInputElement>;
};

const AddLanguageField = forwardRef<HTMLInputElement, AddLanguageFieldProps>(
  ({ languageCodes, onEnterKeyDown, texts }, ref): ReactElement => {
    const inputRef = useForwardedRef<HTMLInputElement | null>(ref);

    const validateInput = useCallback(
      (input: HTMLInputElement) => {
        const errorMessage = validateCode(
          input.value,
          { existingCodes: languageCodes },
          { empty: texts.errorEmpty, codeExists: texts.errorCodeExists },
        );
        input.setCustomValidity(errorMessage);
      },
      [languageCodes, texts],
    );

    const inputCallback = useCallback(
      (input: HTMLInputElement | null) => {
        inputRef.current = input;
        input && validateInput(input);
      },
      [validateInput, inputRef],
    );

    const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
      ({ target }) => validateInput(target),
      [validateInput],
    );

    const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
      (event) => event.key === 'Enter' && onEnterKeyDown(event),
      [onEnterKeyDown],
    );

    return (
      <StudioTextfield
        autoFocus
        className={classes.addField}
        label={texts.newLanguageCode}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={inputCallback}
      />
    );
  },
);
AddLanguageField.displayName = 'AddLanguageField';
