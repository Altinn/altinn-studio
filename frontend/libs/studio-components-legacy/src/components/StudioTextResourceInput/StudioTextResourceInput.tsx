import { ChangeEvent, FocusEvent, HTMLAttributes, ReactElement, useMemo } from 'react';
import React, { forwardRef, useState } from 'react';
import type { TextResource } from '../../types/TextResource';
import { StudioTextResourcePicker } from '../StudioTextResourcePicker';
import { StudioCodeFragment } from '../StudioCodeFragment';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { PencilIcon, MagnifyingGlassIcon } from '@studio/icons';
import classes from './StudioTextResourceInput.module.css';
import type { StudioTextfieldProps } from '../StudioTextfield';
import { StudioTextfield } from '../StudioTextfield';
import { editTextResourceValue, createNewTextResource } from './utils';
import { usePropState } from '@studio/hooks';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';
import cn from 'classnames';
import { Mode } from './types/Mode';
import { TextResourceUtils } from '@studio/pure-functions';
import { RequiredSelection } from '../../types/RequiredSelection';

export type StudioTextResourceInputProps = TextResourceInputPropsBase &
  HTMLAttributes<HTMLInputElement>;

type TextResourceInputPropsBase = {
  currentId?: string | null;
  currentIdClass?: string;
  inputClass?: string;
  onBlurTextResource?: (textResource: TextResource) => void;
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
      onBlurTextResource,
      onChangeCurrentId,
      onChangeTextResource,
      onCreateTextResource,
      onUpdateTextResource,
      onKeyDown,
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

    const handleChangeCurrentId = (id: string): void => {
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

    const handleBlurTextResource = (textResource: TextResource): void =>
      onBlurTextResource?.(textResource);

    const rootClass = cn(givenClass, classes.container);

    return (
      <div className={rootClass}>
        <InputBox
          currentId={currentId}
          inputClass={inputClass}
          mode={mode}
          onBlurTextResource={handleBlurTextResource}
          onChangeCurrentId={handleChangeCurrentId}
          onChangeTextResource={handleChangeTextResource}
          onCreateTextResource={handleCreateTextResource}
          onUpdateTextResource={handleUpdateTextResource}
          onKeyDown={onKeyDown}
          ref={ref}
          textResources={textResources}
          texts={texts}
          {...rest}
        />
        <ModeToggle className={toggleClass} inputMode={mode} onToggle={setMode} texts={texts} />
        <CurrentId className={currentIdClass} currentId={currentId} label={texts.idLabel} />
      </div>
    );
  },
);

StudioTextResourceInput.displayName = 'StudioTextResourceInput';

type InputBoxProps = RequiredSelection<
  StudioTextResourceInputProps,
  'onBlurTextResource' | 'onChangeTextResource' | 'onCreateTextResource' | 'onUpdateTextResource'
> & {
  mode: Mode;
};

const InputBox = forwardRef<HTMLInputElement, InputBoxProps>(
  (
    {
      currentId,
      inputClass,
      mode,
      onBlurTextResource,
      onChangeCurrentId,
      onChangeTextResource,
      onCreateTextResource,
      onUpdateTextResource,
      onKeyDown,
      required,
      textResources,
      texts,
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
            currentId={currentId}
            label={texts.valueLabel}
            onBlurTextResource={onBlurTextResource}
            onChangeTextResource={onChangeTextResource}
            onCreateTextResource={onCreateTextResource}
            onUpdateTextResource={onUpdateTextResource}
            onKeyDown={onKeyDown}
            ref={ref}
            textResources={textResources}
            {...rest}
          />
        );
      case Mode.Search:
        return (
          <StudioTextResourcePicker
            className={className}
            label={texts.textResourcePickerLabel}
            noTextResourceOptionLabel={texts.noTextResourceOptionLabel}
            onKeyDown={onKeyDown}
            onValueChange={onChangeCurrentId}
            ref={ref}
            required={required}
            textResources={textResources}
            value={currentId}
            {...rest}
          />
        );
    }
  },
);

InputBox.displayName = 'InputBox';

type ValueFieldProps = StudioTextfieldProps & {
  currentId?: string;
  onBlurTextResource: (textResource: TextResource) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  onCreateTextResource: (textResource: TextResource) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  textResources: TextResource[];
};

const ValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  (
    {
      currentId,
      onBlur,
      onBlurTextResource,
      onChange,
      onChangeTextResource,
      onCreateTextResource,
      onUpdateTextResource,
      textResources,
      ...rest
    },
    ref,
  ): ReactElement => {
    const utils = useMemo(() => TextResourceUtils.fromArray(textResources), [textResources]);
    const textResource = useMemo(() => utils.get(currentId), [utils, currentId]);

    const [value, setValue] = useState<string>(utils.getValueIfExists(currentId) ?? '');

    const createTextResource = (value: string): TextResource => {
      const newTextResource = createNewTextResource(value);
      onCreateTextResource(newTextResource);
      return newTextResource;
    };

    const editOrCreateTextResource = (value: string): TextResource => {
      return textResource ? editTextResourceValue(textResource, value) : createTextResource(value);
    };

    const triggerUpdate = (value: string): void => {
      if (textResource) onUpdateTextResource?.(textResource);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
      triggerUpdate(event.target.value);
      const newTextResource = editOrCreateTextResource(event.target.value);
      onBlurTextResource?.(newTextResource);
      onBlur?.(event);
    };

    const changeTextResourceIfExists = (value: string): void => {
      if (!textResource) return;
      const newTextResource = editTextResourceValue(textResource, value);
      onChangeTextResource(newTextResource);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(event.target.value);
      changeTextResourceIfExists(event.target.value);
      onChange?.(event);
    };

    return (
      <StudioTextfield
        onBlur={handleBlur}
        onChange={handleChange}
        ref={ref}
        value={value}
        hideLabel={true}
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
    <ToggleGroup onChange={onToggle} value={inputMode} size='sm' className={className}>
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
