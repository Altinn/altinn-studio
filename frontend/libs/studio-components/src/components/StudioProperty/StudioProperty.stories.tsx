import type { ChangeEvent } from 'react';
import React, { useEffect } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioProperty } from './index';
import { ObjectUtils } from '@studio/pure-functions';
import { StudioTextfield } from '../StudioTextfield';
import { StudioButton } from '../StudioButton';
import { XMarkIcon } from '@studio/icons';

const meta: Meta = {
  title: 'Components/StudioProperty',
  component: ComposedPreviewComponent,
  decorators: [
    (Story) => (
      <div style={{ width: 500, border: '1px solid #000', padding: 'var(--fds-spacing-5) 0' }}>
        <Story />
      </div>
    ),
  ],
};

export const Preview: PreviewStory = (args): React.ReactElement => (
  <ComposedPreviewComponent {...args} />
);

Preview.args = {
  buttons: [
    {
      property: 'Home',
      value: 'Sweet Home 41, 0000 No Where',
    },
    {
      property: 'Cabin',
      value: 'Mountain Street, 99999 Snow Place',
    },
    {
      property: 'Work',
      value: 'Workstation 1, 12345 Office Town',
    },
    {
      property: 'School',
      value: '',
    },
    {
      property: 'Kindergarten',
      value: '',
    },
  ],
};

type PreviewProps = {
  buttons: PreviewButtonProps[];
};

type PreviewButtonProps = {
  property: string;
  value: string;
};

type PreviewStory = StoryFn<PreviewProps>;

function ComposedPreviewComponent({ buttons: givenButtons }: PreviewProps) {
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
  buttons: PreviewButtonProps[],
  index: number,
  value: string,
): PreviewButtonProps[] {
  const newButtons = ObjectUtils.deepCopy<PreviewButtonProps[]>(buttons);
  newButtons[index].value = value;
  return newButtons;
}

type PreviewPropertyProps = PreviewButtonProps & {
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
      menubar={<StudioButton icon={<XMarkIcon />} onClick={onClose} variant='secondary' />}
    >
      <StudioTextfield
        autoFocus
        hideLabel
        label={property}
        onChange={handleChange}
        style={{
          margin:
            '0 var(--studio-property-fieldset-spacing) var(--studio-property-fieldset-spacing)',
        }}
        value={value}
      />
    </StudioProperty.Fieldset>
  );
}

export default meta;
