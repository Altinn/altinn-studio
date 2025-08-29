import type { ForwardedRef, PropsWithChildren } from 'react';
import React from 'react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudioCombobox, type StudioComboboxProps } from './index';
import userEvent from '@testing-library/user-event';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const options = {
  ole: 'Ole',
  dole: 'Dole',
  doffen: 'Doffen',
  invalid: 'Kinkliane Koff',
};
const noResults = 'No results';
const dsUnselectAllText = 'Fjern alt';

type VerifyOnValueChangeProps = {
  onValueChange: jest.Mock;
  expectedNumberOfCalls: number;
  expectedValue: string[];
};

const verifyOnValueChange = async ({
  onValueChange,
  expectedNumberOfCalls,
  expectedValue,
}: VerifyOnValueChangeProps) => {
  await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(expectedNumberOfCalls));
  expect(onValueChange).toHaveBeenCalledWith(expectedValue);
};

describe('StudioCombobox', () => {
  it('should render the component', () => {
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    expect(studioCombobox).toBeInTheDocument();
  });

  it('should render the empty state when no results are found', async () => {
    const user = userEvent.setup();
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    await user.type(studioCombobox, options.invalid);
    const emptyState = screen.getByText(noResults);
    expect(emptyState).toBeInTheDocument();
  });

  it('should be possible to select an option', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ onValueChange });
    const studioCombobox = screen.getByRole('combobox');
    expect(studioCombobox).toHaveValue('');

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.ole }));
    await verifyOnValueChange({
      onValueChange,
      expectedNumberOfCalls: 1,
      expectedValue: [options.ole],
    });
    expect(studioCombobox).toHaveValue(options.ole);

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.dole }));
    await verifyOnValueChange({
      onValueChange,
      expectedNumberOfCalls: 2,
      expectedValue: [options.dole],
    });
    expect(studioCombobox).toHaveValue(options.dole);
  });

  it('should be possible to select multiple options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ multiple: true, onValueChange });
    const studioCombobox = screen.getByRole('combobox');
    await user.click(studioCombobox);

    await user.click(screen.getByRole('option', { name: options.ole }));
    await verifyOnValueChange({
      onValueChange,
      expectedNumberOfCalls: 1,
      expectedValue: [options.ole],
    });

    await user.click(screen.getByRole('option', { name: options.dole }));
    await verifyOnValueChange({
      onValueChange,
      expectedNumberOfCalls: 2,
      expectedValue: [options.ole, options.dole],
    });

    await user.click(screen.getByRole('option', { name: options.doffen }));
    await verifyOnValueChange({
      onValueChange,
      expectedNumberOfCalls: 3,
      expectedValue: [options.ole, options.dole, options.doffen],
    });
  });

  it('should close the combobox when an option is selected', async () => {
    const user = userEvent.setup();
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.ole }));

    await waitFor(() => {
      const comboboxOption = screen.queryByRole('option', { name: options.ole });
      expect(comboboxOption).toBeNull();
    });
  });

  it('should keep open when an option is selected and the combobox is set to multiple', async () => {
    const user = userEvent.setup();
    renderTestCombobox({ multiple: true });
    const studioCombobox = screen.getByRole('combobox');
    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.ole }));

    const comboboxOption = screen.getByRole('option', { name: options.ole });
    expect(comboboxOption).toBeInTheDocument();
  });

  it('should be possible to clear the selected options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({
      multiple: true,
      onValueChange,
      value: [options.ole, options.dole, options.doffen],
    });

    const clearButton = screen.getByRole('button', { name: dsUnselectAllText });
    await user.click(clearButton);
    await verifyOnValueChange({ onValueChange, expectedNumberOfCalls: 1, expectedValue: [] });
  });

  it('Renders the list box in portal mode by default', async () => {
    const wrapperTestId = 'wrapper';
    const wrapper = ({ children }: PropsWithChildren) => (
      <div data-testid={wrapperTestId}>{children}</div>
    );
    renderTestCombobox({}, { wrapper });
    const combobox = screen.getByRole('combobox');
    await userEvent.click(combobox);
    expect(screen.getByTestId(wrapperTestId)).not.toContainElement(screen.getByRole('listbox'));
  });

  it('Renders the list box within the wrapper element when portal is set to false', async () => {
    const wrapperTestId = 'wrapper';
    const wrapper = ({ children }: PropsWithChildren) => (
      <div data-testid={wrapperTestId}>{children}</div>
    );
    renderTestCombobox({ portal: false }, { wrapper });
    const combobox = screen.getByRole('combobox');
    await userEvent.click(combobox);
    expect(screen.getByTestId(wrapperTestId)).toContainElement(screen.getByRole('listbox'));
  });

  it('Renders the list box within the dialog element when used inside a dialog', async () => {
    const user = userEvent.setup();
    const wrapper = ({ children }: PropsWithChildren) => <dialog open>{children}</dialog>;
    renderTestCombobox({}, { wrapper });
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('listbox'));
  });

  it('Forwards the ref to the combobox element', () => {
    testRefForwarding<HTMLInputElement>(
      (ref) => renderTestCombobox({}, undefined, ref),
      () => screen.getByRole('combobox'),
    );
  });

  it('Sets the ref to null when unmounted', () => {
    const ref = React.createRef<HTMLInputElement>();
    const { unmount } = renderTestCombobox({}, undefined, ref);
    unmount();
    expect(ref.current).toBeNull();
  });
});

const renderTestCombobox = (
  props?: StudioComboboxProps,
  renderOptions?: RenderOptions,
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult =>
  render(
    <StudioCombobox {...props} ref={ref}>
      <StudioCombobox.Empty>{noResults}</StudioCombobox.Empty>
      <StudioCombobox.Option value={options.ole}>{options.ole}</StudioCombobox.Option>
      <StudioCombobox.Option value={options.dole}>{options.dole}</StudioCombobox.Option>
      <StudioCombobox.Option value={options.doffen}>{options.doffen}</StudioCombobox.Option>
    </StudioCombobox>,
    renderOptions,
  );
