import type { Meta, StoryObj } from '@storybook/react-vite';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import { ArrayUtils } from '@studio/pure-functions';
import { FixedWidthDecorator } from '../../storybook-utils/decorators/FixedWidthDecorator';

const meta = {
  title: 'Components/StudioTextResourceInput',
  component: StudioTextResourceInput,
  argTypes: {
    currentId: {
      control: {
        type: 'select',
        options: ArrayUtils.mapByKey(textResourcesMock, 'id'),
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on.+' },
  },
  decorators: [
    (Story): React.ReactElement => (
      <FixedWidthDecorator>
        <Story />
      </FixedWidthDecorator>
    ),
  ],
} satisfies Meta<typeof StudioTextResourceInput>;
export default meta;

type Story = StoryObj<typeof StudioTextResourceInput>;

export const WithId: Story = {
  args: {
    currentId: 'land.NO',
    textResources: textResourcesMock,
    texts: {
      editValue: 'Rediger verdi',
      emptyTextResourceList: 'Ingen tekstressurser er tilgjengelige',
      idLabel: 'ID:',
      search: 'Søk',
      textResourcePickerLabel: 'Velg tekstressurs',
      noTextResourceOptionLabel: 'Ikke oppgitt',
      valueLabel: 'Tekstverdi',
    },
  },
};

export const WithoutId: Story = {
  args: {
    ...WithId.args,
    currentId: undefined,
  },
};
