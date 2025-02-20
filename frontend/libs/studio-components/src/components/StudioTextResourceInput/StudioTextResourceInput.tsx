import type { ChangeEvent, HTMLAttributes, ReactElement } from 'react';
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
  determineDefaultMode,
  editTextResourceValue,
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
  onChangeCurrentId: (id: string | null) => void;
  onChangeTextResource?: (textResource: TextResource) => void;
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
      onChangeTextResource,
      onChangeCurrentId,
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
    const [mode, setMode] = useState<Mode>(determineDefaultMode(currentId));

    const handleChangeCurrentId = (id: string): void => {
      setCurrentId(id);
      onChangeCurrentId(id);
    };

    const handleTextResourceChange = (newTextResource: TextResource): void => {
      const newList = changeTextResourceInList(textResources, newTextResource);
      setTextResources(newList);
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
          onChangeTextResource={handleTextResourceChange}
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

type InputBoxProps = StudioTextResourceInputProps & {
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
      onKeyDown,
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
            onChangeTextResource={onChangeTextResource}
            onKeyDown={onKeyDown}
            ref={ref}
            textResource={currentTextResource}
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
  textResource?: TextResource;
  onChangeTextResource: (textResource: TextResource) => void;
};

const ValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  ({ textResource, onChangeTextResource, ...rest }, ref): ReactElement => {
    const generalProps: StudioTextfieldProps = {
      hideLabel: true,
      ...rest,
    };

    if (textResource) {
      return (
        <EnabledValueField
          ref={ref}
          onChangeTextResource={onChangeTextResource}
          textResource={textResource}
          {...generalProps}
        />
      );
    } else {
      return <DisabledValueField ref={ref} {...generalProps} />;
    }
  },
);

ValueField.displayName = 'ValueField';

const EnabledValueField = forwardRef<HTMLInputElement, ValueFieldProps>(
  ({ textResource, onChange, onChangeTextResource, ...rest }, ref): ReactElement => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      const newTextResource = editTextResourceValue(textResource, value);
      onChangeTextResource(newTextResource);
      onChange?.(event);
    };

    return (
      <StudioTextfield onChange={handleChange} ref={ref} value={textResource.value} {...rest} />
    );
  },
);

EnabledValueField.displayName = 'EnabledValueField';

const DisabledValueField = forwardRef<HTMLInputElement, StudioTextfieldProps>(
  (props, ref): ReactElement => <StudioTextfield disabled ref={ref} {...props} />,
);

DisabledValueField.displayName = 'DisabledValueField';

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
