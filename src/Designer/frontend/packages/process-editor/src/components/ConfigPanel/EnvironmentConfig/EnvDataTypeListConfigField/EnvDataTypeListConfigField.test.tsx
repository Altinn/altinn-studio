import type { ReactElement } from 'react';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EnvDataTypeListConfigField } from './EnvDataTypeListConfigField';
import type { EnvironmentEntry } from '../types';

const fieldLabel = 'Datatyper';
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);
const combinedAlert = textMock(
  'process_editor.configuration_panel.environment_config.combined_environments_alert',
);
const dataTypeIds = ['model', 'ref-data-as-pdf', 'attachment'];

describe('EnvDataTypeListConfigField', () => {
  afterEach(jest.clearAllMocks);

  it('shows the values of one environment as the single list the app puts together', async () => {
    const user = userEvent.setup();
    renderEnvDataTypeListConfigField({
      entries: [{ value: ['model'] }, { value: ['ref-data-as-pdf'] }],
    });

    expect(getCollapsedButton()).toHaveTextContent('model, ref-data-as-pdf');

    await user.click(getCollapsedButton());

    expect(screen.getByText(combinedAlert)).toBeInTheDocument();
  });

  it('writes the whole list back as one entry when a value is removed from it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvDataTypeListConfigField({
      entries: [
        { env: 'tt02', value: ['model'] },
        { env: 'at22', value: ['ref-data-as-pdf'] },
      ],
      onChange,
    });
    await user.click(getCollapsedButton());

    expect(getSelectedDataTypes()).toEqual(['model', 'ref-data-as-pdf']);

    await user.click(getSelectedDataTypeChip('model'));

    // Removing one leaves the other, and the two entries that held them become the single entry
    // the user can see. The app reads the same list from it as it read from the two.
    expect(onChange).toHaveBeenCalledWith([{ env: 'at22', value: ['ref-data-as-pdf'] }]);
  });

  it('writes the whole list back as one entry when a value is added to it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvDataTypeListConfigField({
      entries: [
        { env: 'tt02', value: ['model'] },
        { env: 'at22', value: ['ref-data-as-pdf'] },
      ],
      onChange,
    });
    await user.click(getCollapsedButton());

    await addDataType(user, stagingLabel, 'attachment');

    // The two entries become one, the added id goes last rather than where the option list happens
    // to have it, and the ids the file already had keep the order the app saw them in.
    expect(onChange).toHaveBeenCalledWith([
      { env: 'at22', value: ['model', 'ref-data-as-pdf', 'attachment'] },
    ]);
  });

  it('leaves out a data type element with no id in it, and says that it will go', async () => {
    const user = userEvent.setup();
    renderEnvDataTypeListConfigField({ entries: [{ value: ['model', ''] }] });

    expect(getCollapsedButton()).toHaveTextContent('model');

    await user.click(getCollapsedButton());

    expect(getSelectedDataTypes()).toEqual(['model']);
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.environment_config.unnamed_data_types_alert', {
          count: 1,
        }),
      ),
    ).toBeInTheDocument();
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

/**
 * The input of one row. The suggestion appends a hint about the current selection to the label it
 * is given, so the label match is a partial one.
 */
function getRowInput(rowLabel: string): HTMLElement {
  return screen.getByLabelText(rowLabel, { exact: false });
}

/**
 * The ids a row has selected, which the suggestion renders as `option`s beside its input. The ids
 * it merely offers sit in a list that stays hidden until the input is typed in, so a selected id is
 * the only kind of option on screen. Every case here leaves just one row with a selection, which is
 * what lets the query stay a plain role query instead of walking up to the row element.
 */
function getSelectedDataTypes(): string[] {
  return screen.getAllByRole('option').map((option) => option.getAttribute('value'));
}

function getSelectedDataTypeChip(dataType: string): HTMLElement {
  return screen.getAllByRole('option').find((option) => option.getAttribute('value') === dataType);
}

/**
 * Typing narrows the row's option list to the wanted id and makes it visible, which is the only way
 * to reach it. It is then the one option on screen that is not already selected.
 */
async function addDataType(user: UserEvent, rowLabel: string, dataType: string): Promise<void> {
  await user.type(getRowInput(rowLabel), dataType);
  await user.click(
    screen
      .getAllByRole('option')
      .find((option) => option.getAttribute('aria-selected') === 'false'),
  );
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string[]>[];
  onChange: (entries: EnvironmentEntry<string[]>[]) => void;
}>;

/** Holds the entries the way a real call site does, so a commit feeds back into the field. */
const TestHost = ({ entries: initialEntries = [], onChange }: TestProps): ReactElement => {
  const [entries, setEntries] = useState<EnvironmentEntry<string[]>[]>(initialEntries);
  return (
    <EnvDataTypeListConfigField
      dataTypeIds={dataTypeIds}
      entries={entries}
      label={fieldLabel}
      onChange={(updatedEntries) => {
        onChange?.(updatedEntries);
        setEntries(updatedEntries);
      }}
    />
  );
};

function renderEnvDataTypeListConfigField(props: TestProps = {}): void {
  render(<TestHost {...props} />);
}
