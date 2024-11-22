import type { ChangeEvent, ReactElement } from 'react';
import React, { useState } from 'react';
import type { TextResource } from '../../types/TextResource';
import { StudioTextResourcePicker } from '../StudioTextResourcePicker';
import { StudioCodeFragment } from '../StudioCodeFragment';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { PencilIcon, MagnifyingGlassIcon } from '@studio/icons';
import classes from './StudioTextResourceInput.module.css';
import { StudioTextfield } from '../StudioTextfield';
import { changeTextResourceInList, editTextResourceValue, getTextResourceById } from './utils';
import { usePropState } from '@studio/hooks';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';

export type StudioTextResourceInputProps = {
  currentId: string;
  onChangeCurrentId: (id: string) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  textResources: TextResource[];
  texts: TextResourceInputTexts;
};

export function StudioTextResourceInput({
  currentId: givenCurrentId,
  onChangeTextResource,
  onChangeCurrentId,
  textResources: givenTextResources,
  texts,
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
  textResources,
  texts,
}: InputBoxProps): ReactElement {
  const currentTextResource = getTextResourceById(textResources, currentId);

  switch (inputMode) {
    case InputMode.EditValue:
      return (
        <ValueField
          label={texts.valueLabel}
          onChange={onChangeTextResource}
          textResource={currentTextResource}
        />
      );
    case InputMode.Search:
      return (
        <StudioTextResourcePicker
          className={classes.inputbox}
          emptyListText={texts.emptyResourceList}
          label={texts.textResourcePickerLabel}
          onValueChange={onChangeCurrentId}
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
};

function ValueField({ textResource, onChange, label }: ValueFieldProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const newTextResource = editTextResourceValue(textResource, value);
    onChange(newTextResource);
  };

  return (
    <StudioTextfield
      label={label}
      hideLabel
      size='sm'
      value={textResource.value}
      onChange={handleChange}
      className={classes.inputbox}
    />
  );
}

type InputModeToggleProps = {
  inputMode: InputMode;
  onToggle: (mode: InputMode) => void;
  texts: TextResourceInputTexts;
};

function InputModeToggle({ inputMode, onToggle, texts }: InputModeToggleProps): ReactElement {
  return (
    <ToggleGroup onChange={onToggle} value={inputMode} size='sm' className={classes.toggle}>
      <ToggleGroup.Item icon value={InputMode.EditValue} title={texts.editValue}>
        <PencilIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item icon value={InputMode.Search} title={texts.search}>
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
