import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';
import React, { useState } from 'react';
import type { TextResource } from '../../types/TextResource';
import { StudioTextResourcePicker } from '../StudioTextResourcePicker';
import { StudioCodeFragment } from '../StudioCodeFragment';
import { ToggleGroup, ToggleGroupItemProps } from '@digdir/designsystemet-react';
import { PencilIcon, MagnifyingGlassIcon } from '@studio/icons';
import classes from './StudioTextResourceInput.module.css';
import { StudioTextfield, StudioTextfieldProps } from '../StudioTextfield';
import { changeTextResourceInList, editTextResourceValue, getTextResourceById } from './utils';
import { usePropState } from '@studio/hooks';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';

export type StudioTextResourceInputProps = {
  currentId: string;
  onChangeCurrentId: (id: string) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  tabIndex?: number;
  textResources: TextResource[];
  texts: TextResourceInputTexts;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => void;
};

export function StudioTextResourceInput({
  currentId: givenCurrentId,
  onChangeTextResource,
  onChangeCurrentId,
  tabIndex,
  textResources: givenTextResources,
  texts,
  onKeyDown,
}: StudioTextResourceInputProps): ReactElement {
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.EditValue);
  const [currentId, setCurrentId] = usePropState<string>(givenCurrentId);
  const [textResources, setTextResources] = usePropState<TextResource[]>(givenTextResources);

  const handleChangeCurrentId = (id: string) => {
    setCurrentId(id);
    onChangeCurrentId(id);
  };

  const handleTextResourceChange = (newTextResource: TextResource) => {
    const newList = changeTextResourceInList(textResources, newTextResource);
    setTextResources(newList);
    onChangeTextResource(newTextResource);
  };

  return (
    <div className={classes.container}>
      <InputBox
        currentId={currentId}
        inputMode={inputMode}
        onChangeCurrentId={handleChangeCurrentId}
        onChangeTextResource={handleTextResourceChange}
        onKeyDown={onKeyDown}
        tabIndex={tabIndex}
        textResources={textResources}
        texts={texts}
      />
      <InputModeToggle inputMode={inputMode} onToggle={setInputMode} texts={texts} />
      <CurrentId currentId={currentId} label={texts.idLabel} />
    </div>
  );
}

enum InputMode {
  EditValue = 'editValue',
  Search = 'search',
}

type InputBoxProps = StudioTextResourceInputProps & {
  inputMode: InputMode;
};

function InputBox({
  currentId,
  inputMode,
  onChangeCurrentId,
  onChangeTextResource,
  tabIndex,
  textResources,
  texts,
  onKeyDown,
}: InputBoxProps): ReactElement {
  const currentTextResource = getTextResourceById(textResources, currentId);

  switch (inputMode) {
    case InputMode.EditValue:
      return (
        <ValueField
          label={texts.valueLabel}
          onChange={onChangeTextResource}
          onKeyDown={onKeyDown}
          tabIndex={tabIndex}
          textResource={currentTextResource}
        />
      );
    case InputMode.Search:
      return (
        <StudioTextResourcePicker
          className={classes.inputbox}
          emptyListText={texts.emptyResourceList}
          label={texts.textResourcePickerLabel}
          onKeyDown={onKeyDown}
          onValueChange={onChangeCurrentId}
          tabIndex={tabIndex}
          textResources={textResources}
          value={currentId}
        />
      );
  }
}

type ValueFieldProps = {
  label: string;
  textResource: TextResource;
  onChange: (textResource: TextResource) => void;
} & Pick<StudioTextfieldProps, 'onKeyDown' | 'tabIndex'>;

function ValueField({ textResource, onChange, label, ...rest }: ValueFieldProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const newTextResource = editTextResourceValue(textResource, value);
    onChange(newTextResource);
  };

  return (
    <StudioTextfield
      className={classes.inputbox}
      hideLabel
      label={label}
      onChange={handleChange}
      size='sm'
      value={textResource.value}
      {...rest}
    />
  );
}

type InputModeToggleProps = {
  inputMode: InputMode;
  onToggle: (mode: InputMode) => void;
  texts: TextResourceInputTexts;
} & Pick<ToggleGroupItemProps, 'onKeyDown' | 'tabIndex'>;

function InputModeToggle({
  inputMode,
  onToggle,
  texts,
  ...rest
}: InputModeToggleProps): ReactElement {
  return (
    <ToggleGroup onChange={onToggle} value={inputMode} size='sm' className={classes.toggle}>
      <ToggleGroup.Item icon title={texts.editValue} value={InputMode.EditValue} {...rest}>
        <PencilIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item icon value={InputMode.Search} title={texts.search} {...rest}>
        <MagnifyingGlassIcon />
      </ToggleGroup.Item>
    </ToggleGroup>
  );
}

type CurrentIdProps = {
  currentId: string;
  label: string;
};

function CurrentId({ currentId, label }: CurrentIdProps): ReactElement {
  return (
    <div className={classes.id}>
      {label}
      <StudioCodeFragment>{currentId}</StudioCodeFragment>
    </div>
  );
}
