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
  afterEach(jest.clearAllMocks);

  it('reads a value the way the runtime parses it, whatever its casing and spacing', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: ' True ' }] });

    expect(getCollapsedButton()).toHaveTextContent(yesLabel);

    await user.click(getCollapsedButton());

    expect(getRadio(globalLabel, yesLabel)).toBeChecked();
    expect(getRadio(globalLabel, noLabel)).not.toBeChecked();
  });

  it('writes the lower-case spelling, whatever the file had', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvBooleanConfigField({ entries: [{ value: 'TRUE' }], onChange });
    await user.click(getCollapsedButton());

    await user.click(getRadio(globalLabel, noLabel));

    expect(onChange).toHaveBeenCalledWith([{ value: 'false' }]);
  });

  it('leaves both answers unchosen for an override that has no value yet', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'true' }] });
    await user.click(getCollapsedButton());

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(screen.getByRole('button', { name: stagingLabel }));

    expect(getRadio(stagingLabel, yesLabel)).not.toBeChecked();
    expect(getRadio(stagingLabel, noLabel)).not.toBeChecked();
  });

  it('presents a value the runtime cannot parse as no answer rather than as a no', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'maybe' }] });

    expect(getCollapsedButton()).not.toHaveTextContent(noLabel);

    await user.click(getCollapsedButton());

    expect(getRadio(globalLabel, noLabel)).not.toBeChecked();
  });

  it('says the file holds a value it cannot show, so an unanswered field is not the whole story', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: 'maybe' }] });
    await user.click(getCollapsedButton());

    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.environment_config.unreadable_boolean_alert', {
          count: 1,
          values: 'maybe',
        }),
      ),
    ).toBeInTheDocument();
  });

  // A blank element is legal - `AltinnEFormidlingConfiguration` reads it as the default - so it is
  // an unanswered field rather than something to warn about.
  it('says nothing about a blank value, which the runtime accepts', async () => {
    const user = userEvent.setup();
    renderEnvBooleanConfigField({ entries: [{ value: '' }, { env: 'tt02', value: 'True' }] });
    await user.click(getCollapsedButton());

    expect(screen.queryByText(/unreadable_boolean_alert/)).not.toBeInTheDocument();
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

function getRadio(rowLabel: string, answer: string): HTMLElement {
  return within(screen.getByRole('group', { name: rowLabel })).getByRole('radio', { name: answer });
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
}>;

/** Holds the entries the way a real call site does, so a commit feeds back into the field. */
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
