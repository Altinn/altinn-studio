import type { ChangeEvent, FocusEvent, HTMLAttributes, ReactElement } from 'react';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
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
import type { RequiredSelection } from '../../types/RequiredSelection';

export type StudioTextResourceInputProps = TextResourceInputPropsBase &
  HTMLAttributes<HTMLInputElement>;
/**
 * @remarks StudioCodeFragment lives in `@studio/components-legacy`. We can not import from `@studio/components`
 *          because of the lint rule forbidding cross-dependency.
 * @todo When Parent legacy-component StudioTextResourceInput moved out of legacy, replace `StudioCodeFragment` with the one from `@studio/components`.
 */
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
          onKeyDown={onKeyDown}
          onUpdateTextResource={handleUpdateTextResource}
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
            onChangeTextResource={onChangeTextResource}
            onCreateTextResource={onCreateTextResource}
            onKeyDown={onKeyDown}
            onUpdateTextResource={onUpdateTextResource}
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
      ...rest
    },
    ref,
  ): ReactElement => {
    const utils = useMemo(() => TextResourceUtils.fromArray(textResources), [textResources]);
    const currentTextResource = useMemo(() => utils.get(currentId), [utils, currentId]);

    const [valueState, setValueState] = useState<string>(utils.getValueIfExists(currentId) ?? '');

    const createTextResource = useCallback(
      (value: string): TextResource => {
        const newTextResource = createNewTextResource(value);
        onCreateTextResource(newTextResource);
        return newTextResource;
      },
      [onCreateTextResource],
    );

    const editCurrentTextResource = useCallback(
      (value: string): TextResource => editTextResourceValue(currentTextResource, value),
      [currentTextResource],
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
      (event: FocusEvent<HTMLInputElement>): void => {
        const { value } = event.target;
        const newTextResource = editOrCreateTextResource(value);
        updateTextResource(newTextResource);
        onBlur?.(event);
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
      (event: ChangeEvent<HTMLInputElement>): void => {
        const { value } = event.target;
        setValueState(value);
        changeTextResourceIfExists(value);
        onChange?.(event);
      },
      [onChange, changeTextResourceIfExists],
    );

    return (
      <StudioTextfield
        onBlur={handleBlur}
        onChange={handleChange}
        ref={ref}
        value={valueState}
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
