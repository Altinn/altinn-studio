import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import {
  StudioProperty,
  StudioPropertyButtonProps,
  StudioPropertyGroupProps,
  StudioPropertyFieldsetProps,
} from './index';
import { StudioPropertyGroup } from './StudioPropertyGroup';

type PreviewProps = {
  withoutNegativeMargin: StudioPropertyGroupProps['withoutNegativeMargin'];
  legend: StudioPropertyFieldsetProps['legend'];
  buttons: StudioPropertyButtonProps[];
};

type PreviewStory = StoryFn<PreviewProps>;

const ComposedPreviewComponent = ({ withoutNegativeMargin, legend, buttons }: PreviewProps) => {
  return (
    <StudioProperty.Group withoutNegativeMargin={withoutNegativeMargin}>
      <StudioProperty.Fieldset legend={legend}>
        {buttons.map((button) => (
          <StudioProperty.Button {...button} />
        ))}
      </StudioProperty.Fieldset>
    </StudioProperty.Group>
  );
};

const meta: Meta = {
  title: 'Studio/StudioProperty',
  component: ComposedPreviewComponent,
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
  ],
  withoutNegativeMargin: false,
  legend: 'My addresses',
};

type GroupStory = StoryFn<typeof StudioPropertyGroup>;
export const Group: GroupStory = (args): React.ReactElement => (
  <StudioProperty.Group withoutNegativeMargin={args.withoutNegativeMargin}>
    {args.children}
  </StudioProperty.Group>
);

Group.args = {
  withoutNegativeMargin: false,
  children: "StudioPropertyGroup's children should be StudioProperty.Fieldset component",
};

type FieldsetStory = StoryFn<StudioPropertyFieldsetProps>;
export const Fieldset: FieldsetStory = (args): React.ReactElement => (
  <StudioProperty.Fieldset {...args}>{args.children}</StudioProperty.Fieldset>
);

Fieldset.args = {
  legend: 'My addresses',
  children: 'StudioProperty.Fieldset children should be StudioProperty.Button components',
};

type ButtonStory = StoryFn<StudioPropertyButtonProps>;
export const Button: ButtonStory = (args): React.ReactElement => (
  <StudioProperty.Button {...args} />
);
Button.args = {
  property: 'Home',
  value: 'Sweet Home 41, 0000 No Where',
};

export default meta;
