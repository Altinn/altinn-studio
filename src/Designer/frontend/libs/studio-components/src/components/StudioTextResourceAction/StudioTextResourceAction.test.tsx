import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StudioTextResourceActionProps } from './StudioTextResourceAction';
import { StudioTextResourceAction } from './StudioTextResourceAction';
import type { TextResource } from '@studio/pure-functions';

const textResourceId = 'text-1';
const generatedId = 'generated-id';

describe('StudioTextResourceAction', () => {
  const getSearchTab = (): HTMLElement => screen.getByRole('tab', { name: texts.tabLabelSearch });
  const getTypeTab = (): HTMLElement => screen.getByRole('tab', { name: texts.tabLabelType });
  const getPicker = (): HTMLElement => screen.getByRole('combobox', { name: texts.pickerLabel });

  afterEach(() => jest.clearAllMocks());

  it('uses selected text resource id', async () => {
    const user = userEvent.setup();
    renderStudioTextResourceAction();

    await user.click(getSearchTab());
    await user.selectOptions(getPicker(), textResourceId);
    await user.click(getTypeTab());
    expect(screen.getAllByText(textResourceId)).toHaveLength(2);
  });

  it('uses generated id when user selects empty option in picker', async () => {
    const user = userEvent.setup();
    renderStudioTextResourceAction({ textResourceId });

    await user.click(getSearchTab());
    await user.selectOptions(getPicker(), '');
    await user.click(getTypeTab());

    expect(screen.getByText(generatedId)).toBeInTheDocument();
  });
});

const onSetIsOpen = jest.fn();
const onHandleIdChange = jest.fn();
const onHandleValueChange = jest.fn();
const onHandleRemoveTextResource = jest.fn();

const textResources: TextResource[] = [
  { id: 'text-1', value: 'Text 1' },
  { id: 'text-2', value: 'Text 2' },
];

const texts: StudioTextResourceActionProps['texts'] = {
  cardLabel: 'Card label',
  deleteAriaLabel: 'Delete',
  confirmDeleteMessage: 'Confirm delete?',
  saveLabel: 'Save',
  cancelLabel: 'Cancel',
  pickerLabel: 'Pick text resource',
  valueEditorAriaLabel: 'Edit text value',
  valueEditorIdLabel: 'ID:',
  noTextResourceOptionLabel: 'No text resource',
  tabLabelType: 'Type',
  tabLabelSearch: 'Search',
};

const defaultProps: StudioTextResourceActionProps = {
  textResources,
  generateId: () => generatedId,
  setIsOpen: onSetIsOpen,
  handleIdChange: onHandleIdChange,
  handleValueChange: onHandleValueChange,
  handleRemoveTextResource: onHandleRemoveTextResource,
  texts,
};

const renderStudioTextResourceAction = (
  props: Partial<StudioTextResourceActionProps> = {},
): ReturnType<typeof render> => {
  return render(<StudioTextResourceAction {...defaultProps} {...props} />);
};
