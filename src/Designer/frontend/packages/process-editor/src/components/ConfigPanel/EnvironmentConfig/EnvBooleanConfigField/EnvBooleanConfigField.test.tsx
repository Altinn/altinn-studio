import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EnvBooleanConfigField } from './EnvBooleanConfigField';
import type { EnvironmentEntry } from '../types';

const fieldLabel = 'Slå av eFormidling';
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);
const addOverrideLabel = textMock(
  'process_editor.configuration_panel.environment_config.add_override',
);
const yesLabel = textMock('general.yes');
const noLabel = textMock('general.no');

describe('EnvBooleanConfigField', () => {
  afterEach(vi.clearAllMocks);

  it('reads boolean values regardless of case or surrounding spaces', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: ' True ' }] });

    expect(getCollapsedButton()).toHaveTextContent(yesLabel);

    await user.click(getCollapsedButton());

    expect(getRadio(globalLabel, yesLabel)).toBeChecked();
    expect(getRadio(globalLabel, noLabel)).not.toBeChecked();
  });

  it('saves boolean values in lowercase', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEnvBooleanConfigField({ entries: [{ value: 'TRUE' }], onChange });
    await user.click(getCollapsedButton());

    await user.click(getRadio(globalLabel, noLabel));

    expect(onChange).toHaveBeenCalledWith([{ value: 'false' }]);
  });

  it('focuses the selected answer when the field opens', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'false' }] });

    await user.click(getCollapsedButton());

    expect(getRadio(globalLabel, noLabel)).toHaveFocus();
  });

  it('leaves both options unselected for an empty override', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'true' }] });
    await user.click(getCollapsedButton());

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(screen.getByRole('button', { name: stagingLabel }));

    expect(getRadio(stagingLabel, yesLabel)).not.toBeChecked();
    expect(getRadio(stagingLabel, noLabel)).not.toBeChecked();
  });

  it('leaves both options unselected for an invalid boolean value', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'maybe' }] });

    expect(getCollapsedButton()).not.toHaveTextContent(noLabel);

    await user.click(getCollapsedButton());

    expect(getRadio(globalLabel, noLabel)).not.toBeChecked();
  });

  it('provides a delete button for the default boolean value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderEnvBooleanConfigField({ onChange });
    await user.click(getCollapsedButton());

    expect(queryRemoveGlobalValueButton()).not.toBeInTheDocument();

    await user.click(getRadio(globalLabel, yesLabel));
    await user.click(queryRemoveGlobalValueButton());

    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

function getRadio(rowLabel: string, answer: string): HTMLElement {
  return within(screen.getByRole('group', { name: rowLabel })).getByRole('radio', { name: answer });
}

function queryRemoveGlobalValueButton(): HTMLElement | null {
  return screen.queryByRole('button', {
    name: textMock('process_editor.configuration_panel.environment_config.remove_global_value'),
  });
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
}>;

const TestHost = ({ entries: initialEntries = [], onChange }: TestProps): ReactElement => {
  const [entries, setEntries] = useState<EnvironmentEntry<string>[]>(initialEntries);
  return (
    <EnvBooleanConfigField
      entries={entries}
      label={fieldLabel}
      onChange={(updatedEntries) => {
        onChange?.(updatedEntries);
        setEntries(updatedEntries);
      }}
    />
  );
};

function renderEnvBooleanConfigField(props: TestProps = {}): void {
  render(<TestHost {...props} />);
}
