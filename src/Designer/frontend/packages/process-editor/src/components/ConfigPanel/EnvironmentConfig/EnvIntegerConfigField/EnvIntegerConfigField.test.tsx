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
  afterEach(jest.clearAllMocks);

  it('shows the error and writes nothing while the value is not a whole number', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvIntegerConfigField({ onChange });
    await user.click(getCollapsedButton());

    await user.type(screen.getByLabelText(globalLabel), '3.5');
    await user.tab();

    // The runtime parses this field with int.TryParse and refuses to boot when it fails, so a
    // value the panel knows is unparseable must never reach the BPMN.
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('writes the value once it is corrected, without the spaces around it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
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

  // The message is below the field, and the field can be the last one in a panel that scrolls, so
  // the sentence explaining what is wrong would otherwise be cut off where it stands.
  it('brings the error into view when it appears', async () => {
    const user = userEvent.setup();
    renderEnvIntegerConfigField();
    await user.click(getCollapsedButton());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(globalLabel), '3.5');

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  // Opening a task whose bpmn already holds an unparseable value must not scroll the panel away
  // from its own top before the developer has done anything.
  it('does not scroll when the field is shown with the error it arrived with', async () => {
    const user = userEvent.setup();
    renderEnvIntegerConfigField({ entries: [{ value: '3.5' }] });

    await user.click(getCollapsedButton());

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
}>;

/** Holds the entries the way a real call site does, so a commit feeds back into the field. */
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
