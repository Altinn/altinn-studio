import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EnvIntegerConfigField } from './EnvIntegerConfigField';
import type { EnvironmentEntry } from '../types';

const fieldLabel = 'Sikkerhetsnivå';
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const errorMessage = textMock(
  'process_editor.configuration_panel.environment_config.integer_error',
);

describe('EnvIntegerConfigField', () => {
  afterEach(vi.clearAllMocks);

  it('shows an error without saving an invalid integer', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEnvIntegerConfigField({ onChange });
    await user.click(getCollapsedButton());

    await user.type(screen.getByLabelText(globalLabel), '3.5');
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('keeps the field open and focuses invalid input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEnvIntegerConfigField({ entries: [{ value: '3' }], onChange });
    await user.click(getCollapsedButton());
    await user.clear(screen.getByRole('textbox', { name: globalLabel }));
    await user.type(screen.getByRole('textbox', { name: globalLabel }), '3.5');

    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );

    const input = screen.getByRole('textbox', { name: globalLabel });
    expect(input).toHaveValue('3.5');
    expect(input).toHaveFocus();
    expect(input).toHaveAccessibleDescription(errorMessage);
    expect(onChange).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, '4');
    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );

    expect(getCollapsedButton()).toHaveFocus();
    expect(getCollapsedButton()).toHaveTextContent('4');
    expect(onChange).toHaveBeenCalledWith([{ value: '4' }]);
  });

  it('saves a corrected integer without surrounding spaces', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEnvIntegerConfigField({ onChange });
    await user.click(getCollapsedButton());

    await user.type(screen.getByLabelText(globalLabel), '3.5');
    await user.tab();
    await user.clear(screen.getByLabelText(globalLabel));
    await user.type(screen.getByLabelText(globalLabel), ' 3 ');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith([{ value: '3' }]);
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  it('can close after an invalid override is removed', async () => {
    const user = userEvent.setup();
    const stagingLabel = textMock(
      'process_editor.configuration_panel.environment_config.scope_staging',
    );
    renderEnvIntegerConfigField({ entries: [{ value: '3' }, { env: 'tt02', value: '3.5' }] });
    await user.click(getCollapsedButton());
    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );
    expect(screen.getByRole('textbox', { name: stagingLabel })).toHaveFocus();

    await user.click(
      screen.getByRole('button', { name: textMock('general.delete_item', { item: stagingLabel }) }),
    );
    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );

    expect(getCollapsedButton()).toHaveFocus();
    expect(getCollapsedButton()).toHaveTextContent('3');
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
}>;

const TestHost = ({ entries: initialEntries = [], onChange }: TestProps): ReactElement => {
  const [entries, setEntries] = useState<EnvironmentEntry<string>[]>(initialEntries);
  return (
    <EnvIntegerConfigField
      entries={entries}
      label={fieldLabel}
      onChange={(updatedEntries) => {
        onChange?.(updatedEntries);
        setEntries(updatedEntries);
      }}
    />
  );
};

function renderEnvIntegerConfigField(props: TestProps = {}): void {
  render(<TestHost {...props} />);
}
