import type { ChangeEvent, FocusEvent, HTMLAttributes, ReactElement } from 'react';
import React, { forwardRef, useState } from 'react';
import type { TextResource } from '../../types/TextResource';
import { StudioTextResourcePicker } from '../StudioTextResourcePicker';
import { StudioCodeFragment } from '../StudioCodeFragment';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { PencilIcon, MagnifyingGlassIcon } from '@studio/icons';
import classes from './StudioTextResourceInput.module.css';
import type { StudioTextfieldProps } from '../StudioTextfield';
import { StudioTextfield } from '../StudioTextfield';
import {
  changeTextResourceInList,
  editTextResourceValue,
  createNewTextResource,
  getTextResourceById,
} from './utils';
import { usePropState } from '@studio/hooks';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';
import cn from 'classnames';
import { Mode } from './types/Mode';

export type StudioTextResourceInputProps = TextResourceInputPropsBase &
  HTMLAttributes<HTMLInputElement>;

type TextResourceInputPropsBase = {
  currentId?: string | null;
  currentIdClass?: string;
  inputClass?: string;
  onBlurTextResource?: (textResource: TextResource) => void;
  onChangeCurrentId: (id: string | null) => void;
  onChangeTextResource?: (textResource: TextResource) => void;
  required?: boolean;
  textResources: TextResource[];
  texts: TextResourceInputTexts;
  onCreateTextResource?: (textResource: TextResource) => void;
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
      onChangeTextResource,
      onChangeCurrentId,
      onKeyDown,
      textResources: givenTextResources,
      texts,
      toggleClass,
      onCreateTextResource,
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

    const handleTextResourceBlur = (textResource: TextResource): void => {
      onBlurTextResource?.(textResource);
    };

    const handleCreateTextResource = (textResource: TextResource): void => {
      onCreateTextResource?.(textResource);
      // handleChangeCurrentId(textResource.id);
    };

    const handleTextResourceChange = (newTextResource: TextResource): void => {
      const newList = changeTextResourceInList(textResources, newTextResource);
      setTextResources(newList);
      onChangeTextResource?.(newTextResource);
    };

    const rootClass = cn(givenClass, classes.container);
    // const isCurrentIdTextResource: boolean =
    //   textResources.filter((resource) => resource.id === currentId).length !== 0;

    // console.log('textResources', textResources);
    // console.log('currentId', currentId);
    // console.log('isCurrentIdTextResource', isCurrentIdTextResource);

    return (
      <div className={rootClass}>
        <InputBox
          currentId={currentId}
          inputClass={inputClass}
          mode={mode}
          onBlurTextResource={handleTextResourceBlur}
          onChangeCurrentId={handleChangeCurrentId}
          onChangeTextResource={handleTextResourceChange}
          onCreateTextResource={handleCreateTextResource}
          onKeyDown={onKeyDown}
          ref={ref}
          textResources={textResources}
          texts={texts}
          {...rest}
        />
        <ModeToggle className={toggleClass} inputMode={mode} onToggle={setMode} texts={texts} />
        <CurrentId
          className={currentIdClass}
          // currentId={isCurrentIdTextResource ? currentId : ''}
          currentId={currentId}
          label={texts.idLabel}
        />
      </div>
    );
  },
);

StudioTextResourceInput.displayName = 'StudioTextResourceInput';

type InputBoxProps = StudioTextResourceInputProps & {
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
      onKeyDown,
      required,
      textResources,
      texts,
      ...rest
    },
    ref,
  ): ReactElement => {
    const currentTextResource = getTextResourceById(textResources, currentId);
    const className = cn(inputClass, classes.inputbox);

    switch (mode) {
      case Mode.EditValue:
        return (
          <ValueField
            className={className}
            label={texts.valueLabel}
            onBlurTextResource={onBlurTextResource}
            onChangeTextResource={onChangeTextResource}
            onKeyDown={onKeyDown}
            ref={ref}
            textResource={currentTextResource}
            textResources={textResources}
            onCreateTextResource={onCreateTextResource}
            currentId={currentId}
            onChangeCurrentId={onChangeCurrentId}
            {...rest}
          />
        );
      case Mode.Search:
        return (
          <StudioTextResourcePicker
            className={className}
            label={texts.textResourcePickerLabel}
            onValueChange={onChangeCurrentId}
            onKeyDown={onKeyDown}
            ref={ref}
            required={required}
            textResources={textResources}
            noTextResourceOptionLabel={texts.noTextResourceOptionLabel}
            value={currentId}
            {...rest}
          />
        );
    }
  },
);

InputBox.displayName = 'InputBox';

type ValueFieldProps = StudioTextfieldProps & {
  textResource: TextResource | null;
  textResources: TextResource[] | null;
  onBlurTextResource: (textResource: TextResource) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  onCreateTextResource?: (textResource: TextResource) => void;
  onChangeCurrentId: (textResource: string) => void;
} & Pick<StudioTextResourceInputProps, 'currentId'>;

const ValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  (
    {
      textResource,
      textResources,
      onBlurTextResource,
      onChangeTextResource,
      onCreateTextResource,
      currentId,
      onChangeCurrentId,
      ...rest
    },
    ref,
  ): ReactElement => {
    const generalProps: StudioTextfieldProps = {
      hideLabel: true,
      ...rest,
    };

    return (
      <EnabledValueField
        ref={ref}
        textResources={textResources}
        onBlurTextResource={onBlurTextResource}
        onChangeTextResource={onChangeTextResource}
        textResource={textResource}
        onCreateTextResource={onCreateTextResource}
        currentId={currentId}
        onChangeCurrentId={onChangeCurrentId}
        {...generalProps}
      />
    );
  },
);

ValueField.displayName = 'ValueField';

const EnabledValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  (
    {
      textResource,
      textResources,
      onBlur,
      onChange,
      onBlurTextResource,
      onChangeTextResource,
      onCreateTextResource,
      currentId,
      onChangeCurrentId,
      ...rest
    },
    ref,
  ): ReactElement => {
    const isCurrentIdTextResource: boolean =
      textResources.filter((item) => item.id === currentId).length !== 0;
    // const initialValue: string = isCurrentIdTextResource ? textResource.value : currentId;
    const initialValue: string = isCurrentIdTextResource ? textResource.value : '';
    const [value, setValue] = React.useState<string>(initialValue);

    const handleCreateNewTextResource = (value: string): void => {
      const newTextResource: TextResource = createNewTextResource(value);
      onCreateTextResource?.(newTextResource);
      setValue(newTextResource.value);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
      const { value } = event.target;

      onChangeCurrentId(value);
      if (textResource == undefined) {
        handleCreateNewTextResource(value);
      } else {
        const updatedTextResource = editTextResourceValue(textResource, value);
        onBlurTextResource(updatedTextResource);
        setValue(updatedTextResource.value);
      }

      onBlur?.(event);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      const newTextResource = editTextResourceValue(textResource, value);
      onChangeTextResource(newTextResource);
      onChange?.(event);
    };

    return (
      <StudioTextfield
        onBlur={handleBlur}
        onChange={handleChange}
        ref={ref}
        value={value}
        {...rest}
      />
    );
  },
);

EnabledValueField.displayName = 'EnabledValueField';

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
