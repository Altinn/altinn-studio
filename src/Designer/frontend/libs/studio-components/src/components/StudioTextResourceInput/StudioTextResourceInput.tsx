import type { ChangeEvent, FocusEvent, HTMLAttributes, ReactElement } from 'react';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';
import { StudioCodeFragment } from '../StudioCodeFragment';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { PencilIcon, MagnifyingGlassIcon } from '@studio/icons';
import classes from './StudioTextResourceInput.module.css';
import { StudioTextfield, type StudioTextfieldProps } from '../StudioTextfield';
import { editTextResourceValue, createNewTextResource } from './utils';
import { usePropState } from '@studio/hooks';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';
import cn from 'classnames';
import { Mode } from './types/Mode';
import { TextResourceUtils } from '@studio/pure-functions';
import type { RequiredSelection } from '../../types/RequiredSelection';
import { StudioTextResourcePicker } from '../StudioTextResourcePicker';

export type StudioTextResourceInputProps = TextResourceInputPropsBase &
  HTMLAttributes<HTMLInputElement>;

type TextResourceInputPropsBase = {
  currentId?: string | null;
  currentIdClass?: string;
  inputClass?: string;
  onChangeCurrentId: (id: string | null) => void;
  onChangeTextResource?: (textResource: TextResource) => void;
  onCreateTextResource?: (newTextResource: TextResource) => void;
  onUpdateTextResource?: (textResource: TextResource) => void;
  required?: boolean;
  textResources: TextResource[];
  texts: TextResourceInputTexts;
  toggleClass?: string;
};

export const StudioTextResourceInput = forwardRef<HTMLInputElement, StudioTextResourceInputProps>(
  (
    {
      className: givenClass,
      currentId: givenCurrentId,
      currentIdClass,
      inputClass,
      onChangeCurrentId,
      onChangeTextResource,
      onCreateTextResource,
      onKeyDown,
      onUpdateTextResource,
      textResources: givenTextResources,
      texts,
      toggleClass,
      ...rest
    },
    ref,
  ): ReactElement => {
    const [currentId, setCurrentId] = usePropState<string | null | undefined>(givenCurrentId);
    const [textResources, setTextResources] = usePropState<TextResource[]>(givenTextResources);
    const [mode, setMode] = useState<Mode>(Mode.EditValue);
    const handleChangeCurrentId = (id: string | null): void => {
      setCurrentId(id);
      onChangeCurrentId(id);
    };
    const setTextResourceInList = (textResource: TextResource): void => {
      const newList = TextResourceUtils.fromArray(textResources).set(textResource).asArray();
      setTextResources(newList);
    };

    const handleCreateTextResource = (textResource: TextResource): void => {
      setCurrentId(textResource.id);
      setTextResourceInList(textResource);
      onCreateTextResource?.(textResource);
    };

    const handleUpdateTextResource = (textResource: TextResource): void =>
      onUpdateTextResource?.(textResource);

    const handleChangeTextResource = (newTextResource: TextResource): void => {
      setTextResourceInList(newTextResource);
      onChangeTextResource?.(newTextResource);
    };

    const rootClass = cn(givenClass, classes.container);

    return (
      <div className={rootClass}>
        <InputBox
          currentId={currentId}
          inputClass={inputClass}
          mode={mode}
          onChangeCurrentId={handleChangeCurrentId}
          onChangeTextResource={handleChangeTextResource}
          onCreateTextResource={handleCreateTextResource}
          onKeyDown={onKeyDown as unknown as React.KeyboardEventHandler<HTMLInputElement>}
          onUpdateTextResource={handleUpdateTextResource}
          ref={ref}
          textResources={textResources}
          texts={texts}
          {...rest}
        />
        <ModeToggle className={toggleClass} inputMode={mode} onToggle={setMode} texts={texts} />
        <CurrentId className={currentIdClass} currentId={currentId ?? ''} label={texts.idLabel} />
      </div>
    );
  },
);

StudioTextResourceInput.displayName = 'StudioTextResourceInput';

type InputBoxProps = RequiredSelection<
  StudioTextResourceInputProps,
  'onChangeTextResource' | 'onCreateTextResource' | 'onUpdateTextResource'
> & {
  mode: Mode;
};

const InputBox = forwardRef<HTMLInputElement, InputBoxProps>(
  (
    {
      currentId,
      inputClass,
      mode,
      onChangeCurrentId,
      onChangeTextResource,
      onCreateTextResource,
      onKeyDown,
      onUpdateTextResource,
      required,
      textResources,
      texts,
      currentIdClass,
      toggleClass,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      defaultValue,
      ...rest
    },
    ref,
  ): ReactElement => {
    const className = cn(inputClass, classes.inputbox);

    switch (mode) {
      case Mode.EditValue:
        return (
          <ValueField
            className={className}
            data-size='sm'
            currentId={currentId}
            label={texts.valueLabel}
            onChangeTextResource={onChangeTextResource}
            onCreateTextResource={onCreateTextResource}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
            onUpdateTextResource={onUpdateTextResource}
            ref={ref}
            textResources={textResources}
            {...rest}
          />
        );
      case Mode.Search:
        return (
          <StudioTextResourcePicker
            emptyText={texts.emptyTextResourceList ?? ''}
            className={cn(className, classes.searchField)}
            label={texts.textResourcePickerLabel}
            noTextResourceOptionLabel={texts.noTextResourceOptionLabel}
            onValueChange={onChangeCurrentId}
            required={required}
            textResources={textResources}
            value={currentId ?? undefined}
          />
        );
    }
  },
);

InputBox.displayName = 'InputBox';

type ValueFieldProps = StudioTextfieldProps &
  Pick<
    InputBoxProps,
    | 'currentId'
    | 'onChangeTextResource'
    | 'onCreateTextResource'
    | 'onUpdateTextResource'
    | 'textResources'
  >;

const ValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  (
    {
      currentId,
      onBlur,
      onChange,
      onChangeTextResource,
      onCreateTextResource,
      onUpdateTextResource,
      textResources,
      label,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...rest
    },
    ref,
  ): ReactElement => {
    const utils = useMemo(() => TextResourceUtils.fromArray(textResources), [textResources]);
    const currentTextResource = useMemo(() => utils.get(currentId ?? ''), [utils, currentId]);

    const [valueState, setValueState] = useState<string>(
      utils.getValueIfExists(currentId ?? '') ?? '',
    );

    const createTextResource = useCallback(
      (value: string): TextResource => {
        const newTextResource = createNewTextResource(value);
        onCreateTextResource(newTextResource);
        return newTextResource;
      },
      [onCreateTextResource],
    );

    const editCurrentTextResource = useCallback(
      (value: string): TextResource =>
        currentTextResource
          ? editTextResourceValue(currentTextResource, value)
          : createTextResource(value),
      [currentTextResource, createTextResource],
    );

    const editOrCreateTextResource = useCallback(
      (value: string): TextResource =>
        currentTextResource ? editCurrentTextResource(value) : createTextResource(value),
      [currentTextResource, editCurrentTextResource, createTextResource],
    );

    const updateTextResource = useCallback(
      (newTextResource: TextResource) => {
        const shouldTriggerUpdate = !!currentTextResource;
        if (shouldTriggerUpdate) onUpdateTextResource(newTextResource);
      },
      [currentTextResource, onUpdateTextResource],
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { value } = event.target;
        const newTextResource = editOrCreateTextResource(value);
        updateTextResource(newTextResource);
        if (onBlur) {
          onBlur(event as FocusEvent<HTMLInputElement> & FocusEvent<HTMLTextAreaElement>);
        }
      },
      [onBlur, editOrCreateTextResource, updateTextResource],
    );

    const changeTextResourceIfExists = useCallback(
      (value: string): void => {
        if (!currentTextResource) return;
        const newTextResource = editCurrentTextResource(value);
        onChangeTextResource?.(newTextResource);
      },
      [currentTextResource, onChangeTextResource, editCurrentTextResource],
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { value } = event.target;
        setValueState(value);
        changeTextResourceIfExists(value);
        if (onChange) {
          onChange(event as ChangeEvent<HTMLInputElement> & ChangeEvent<HTMLTextAreaElement>);
        }
      },
      [onChange, changeTextResourceIfExists],
    );

    return (
      <StudioTextfield
        onBlur={handleBlur}
        onChange={handleChange}
        ref={ref}
        value={valueState}
        data-size='md'
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : String(label))}
        {...rest}
      />
    );
  },
);

ValueField.displayName = 'ValueField';

type InputModeToggleProps = {
  className?: string;
  inputMode: Mode;
  onToggle: (mode: Mode) => void;
  texts: TextResourceInputTexts;
};

function ModeToggle({
  className: givenClass,
  inputMode,
  onToggle,
  texts,
}: InputModeToggleProps): ReactElement {
  const className = cn(givenClass, classes.toggle);
  return (
    <ToggleGroup onChange={onToggle} value={inputMode} data-size='sm' className={className}>
      <ToggleGroup.Item icon value={Mode.EditValue} title={texts.editValue}>
        <PencilIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item icon value={Mode.Search} title={texts.search}>
        <MagnifyingGlassIcon />
      </ToggleGroup.Item>
    </ToggleGroup>
  );
}

type CurrentIdProps = {
  className?: string;
  currentId: string;
  label: string;
};

function CurrentId({ className: givenClass, currentId, label }: CurrentIdProps): ReactElement {
  const className = cn(givenClass, classes.id);
  return (
    <div className={className}>
      {label}
      <StudioCodeFragment>{currentId}</StudioCodeFragment>
    </div>
  );
}
