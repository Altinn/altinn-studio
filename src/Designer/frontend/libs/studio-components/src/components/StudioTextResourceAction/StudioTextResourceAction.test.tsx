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
  const getPicker = (): HTMLElement =>
    screen.getByRole('combobox', { name: RegExp('^' + texts.pickerLabel) });
  const getOption = (name: string | RegExp): HTMLElement =>
    screen.getByRole('option', { name, hidden: true });

  afterEach(() => jest.clearAllMocks());

  it('uses selected text resource id', async () => {
    const user = userEvent.setup();
    renderStudioTextResourceAction();

    await user.click(getSearchTab());
    await user.click(getPicker());
    await user.click(getOption(RegExp(textResourceId)));
    await user.click(getTypeTab());
    expect(screen.getAllByText(textResourceId)).toHaveLength(2);
  });

  it('filters the text resources by text value when the user searches', async () => {
    const user = userEvent.setup();
    renderStudioTextResourceAction();

    await user.click(getSearchTab());
    await user.type(getPicker(), 'Text 2');

    expect(getOption(/text-2/)).toBeVisible();
    expect(screen.queryByRole('option', { name: /text-1/, hidden: true })).not.toBeInTheDocument();
  });

  it('uses generated id when user clears the picker', async () => {
    const user = userEvent.setup();
    renderStudioTextResourceAction({ textResourceId });

    await user.click(getSearchTab());
    await user.clear(getPicker());
    await user.tab();
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
  noSearchResultsText: 'No results',
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
