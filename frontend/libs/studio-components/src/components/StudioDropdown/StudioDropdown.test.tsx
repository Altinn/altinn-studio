import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDropdown, type StudioDropdownProps } from './';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

describe('StudioDropdown', () => {
  beforeEach(jest.clearAllMocks);

  it('Displays a dropdown menu when the button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
    await openDropdown(user);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('Renders all headings', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(screen.getByRole('heading', { name: list1Heading })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: list2Heading })).toBeInTheDocument();
  });

  it('Renders all menu items', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(getButton(list1Item1Text)).toBeInTheDocument();
    expect(getButton(list2Item1Text)).toBeInTheDocument();
    expect(getButton(list2Item2Text)).toBeInTheDocument();
  });

  it('Calls the onClick function and closes the dialog when an item is clicked', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    await user.click(getButton(list1Item1Text));
    expect(list1Item1Action).toHaveBeenCalled();
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('Renders all icons', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    expect(screen.getByTestId(icon1TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon2TestId)).toBeInTheDocument();
    expect(screen.getByTestId(icon3TestId)).toBeInTheDocument();
  });

  it('Closes the dialog when clicking outside', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);
    const triggerButton = getButton(triggerButtonText);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(document.body);
    expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('Renders the file uploader item with the correct text and icon', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);

    const fileUploaderItem = getButton(fileUploaderEnabledText);
    expect(fileUploaderItem).toBeInTheDocument();
    expect(screen.getByTestId(icon4TestId)).toBeInTheDocument();
  });

  it('Triggers onFileUpload when a file is selected', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);

    const file = new File(['test'], 'test.json', { type: fileAcceptApplicationJson });
    const fileInputElement = screen.getByLabelText(fileUploaderEnabledText);

    await user.upload(fileInputElement, file);

    expect(onFileUpload).toHaveBeenCalledTimes(1);
    expect(onFileUpload).toHaveBeenCalledWith(expect.any(Object));
  });

  it('Passes fileInputProps to the input element', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();

    await openDropdown(user);

    const fileInputElement = screen.getByLabelText(fileUploaderDisabledText);
    expect(fileInputElement).toHaveAttribute('accept', fileAcceptApplicationJson);
  });

  it('Does not trigger file selection when disabled', async () => {
    const user = userEvent.setup();
    renderStudioDropdown();
    await openDropdown(user);

    const file = new File(['test'], 'test.json', { type: fileAcceptApplicationJson });
    const fileInputElement = screen.getByLabelText(fileUploaderDisabledText);

    await user.upload(fileInputElement, file);

    expect(onFileUpload).not.toHaveBeenCalled();
  });

  const openDropdown = (user: UserEvent): Promise<void> =>
    user.click(screen.getByRole('button', { name: triggerButtonText }));
});

const triggerButtonText: string = 'Open';
const list1Heading: string = 'Group 1';
const list2Heading: string = 'Group 2';
const list1Item1Text: string = 'Group 1 Item 1';
const list2Item1Text: string = 'Group 2 Item 1';
const list2Item2Text: string = 'Group 2 Item 2';
const list2Item3Text: string = 'Group 2 Item 3';
const fileUploaderEnabledText: string = 'Upload file 1';
const fileUploaderDisabledText: string = 'Upload file 2';
const onFileUpload = jest.fn();
const list1Item1Action = jest.fn();
const icon1TestId: string = 'Icon 1';
const icon2TestId: string = 'Icon 2';
const icon3TestId: string = 'Icon 3';
const icon4TestId: string = 'Icon 4';
const icon5TestId: string = 'Icon 5';
const icon1: ReactElement = <span data-testid={icon1TestId} />;
const icon2: ReactElement = <span data-testid={icon2TestId} />;
const icon3: ReactElement = <span data-testid={icon3TestId} />;
const icon4: ReactElement = <span data-testid={icon4TestId} />;
const icon5: ReactElement = <span data-testid={icon5TestId} />;
const fileAcceptApplicationJson: string = 'application/json';
const fileUploaderDisabled: boolean = true;

const defaultProps: StudioDropdownProps = {
  triggerButtonText: triggerButtonText,
};

const renderStudioDropdown = (props?: Partial<StudioDropdownProps>): RenderResult => {
  return render(
    <StudioDropdown {...defaultProps} {...props}>
      <StudioDropdown.List>
        <StudioDropdown.Heading>{list1Heading}</StudioDropdown.Heading>
        <StudioDropdown.Item>
          <StudioDropdown.Button onClick={list1Item1Action}>{list1Item1Text}</StudioDropdown.Button>
        </StudioDropdown.Item>
      </StudioDropdown.List>
      <StudioDropdown.List>
        <StudioDropdown.Heading>{list2Heading}</StudioDropdown.Heading>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon1}>{list2Item1Text}</StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon2} iconPlacement='left'>
            {list2Item2Text}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button icon={icon3} iconPlacement='right'>
            {list2Item3Text}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.FileUploaderButton
            icon={icon4}
            iconPlacement='right'
            onFileUpload={onFileUpload}
          >
            {fileUploaderEnabledText}
          </StudioDropdown.FileUploaderButton>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.FileUploaderButton
            icon={icon5}
            onFileUpload={onFileUpload}
            fileInputProps={{
              accept: fileAcceptApplicationJson,
              disabled: fileUploaderDisabled,
            }}
          >
            {fileUploaderDisabledText}
          </StudioDropdown.FileUploaderButton>
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>,
  );
};

const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });
