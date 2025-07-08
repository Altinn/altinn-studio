import React, { type ChangeEvent, useEffect } from 'react';
import { StudioProperty } from '../../';
import { StudioButton } from '../../../StudioButton';
import { XMarkIcon } from '../../../../../../studio-icons';
import { StudioTextfield } from '../../../StudioTextfield';
import { ObjectUtils } from '@studio/pure-functions';
import classes from './ComposedComponent.module.css';

export type ComposedComponentProps = {
  buttons: ComposedComponentButtonProps[];
};

export type ComposedComponentButtonProps = {
  property: string;
  value: string;
};

export function ComposedComponent({ buttons: givenButtons }: ComposedComponentProps) {
  const [buttons, setButtons] = React.useState(givenButtons);

  useEffect(() => {
    setButtons(givenButtons);
  }, [givenButtons]);

  const handleButtonChange = (index: number) => (value: string) => {
    setButtons(updateButtonValue(buttons, index, value));
  };

  return (
    <StudioProperty.Group>
      {buttons.map((buttonProps, index) => (
        <PreviewProperty
          key={buttonProps.property}
          onChange={handleButtonChange(index)}
          property={buttonProps.property}
          value={buttonProps.value}
        />
      ))}
    </StudioProperty.Group>
  );
}

function updateButtonValue(
  buttons: ComposedComponentButtonProps[],
  index: number,
  value: string,
): ComposedComponentButtonProps[] {
  const newButtons = ObjectUtils.deepCopy<ComposedComponentButtonProps[]>(buttons);
  newButtons[index].value = value;
  return newButtons;
}

type PreviewPropertyProps = ComposedComponentButtonProps & {
  onChange: (value: string) => void;
};

function PreviewProperty({ property, value, onChange }: PreviewPropertyProps): React.ReactElement {
  const [isEditMode, setIsEditMode] = React.useState(false);

  if (isEditMode) {
    return (
      <PreviewFieldset
        property={property}
        value={value}
        onChange={onChange}
        onClose={() => setIsEditMode(false)}
      />
    );
  } else {
    return (
      <StudioProperty.Button
        property={property}
        value={value}
        onClick={() => setIsEditMode(true)}
      />
    );
  }
}

type PreviewFieldsetProps = PreviewPropertyProps & {
  onClose: () => void;
};

function PreviewFieldset({
  property,
  value,
  onChange,
  onClose,
}: PreviewFieldsetProps): React.ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <StudioProperty.Fieldset
      legend={property}
      menubar={
        <StudioButton icon={<XMarkIcon />} onClick={onClose} variant='secondary' title='Close' />
      }
    >
      <StudioTextfield
        autoFocus
        className={classes.textfield}
        label={property}
        onChange={handleChange}
        value={value}
      />
    </StudioProperty.Fieldset>
  );
}
