import type { ReactElement } from 'react';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EnvironmentConfigField } from './EnvironmentConfigField';
import type { EnvironmentValueControlProps } from './EnvironmentConfigField';
import type { EnvironmentEntry } from '../types';

const fieldLabel = 'Correspondence resource';
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const developmentLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_development',
);
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);
const productionLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_production',
);
const addOverrideLabel = textMock(
  'process_editor.configuration_panel.environment_config.add_override',
);

describe('EnvironmentConfigField', () => {
  afterEach(jest.clearAllMocks);

  it('manages focus when opening the field, editing overrides, and closing it', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField();

    await user.click(getCollapsedButton());
    expect(screen.getByRole('textbox', { name: globalLabel })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(stagingLabel));
    expect(screen.getByRole('textbox', { name: stagingLabel })).toHaveFocus();

    await user.click(getDeleteButton(stagingLabel));
    expect(screen.getByRole('textbox', { name: globalLabel })).toHaveFocus();

    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );
    expect(getCollapsedButton()).toHaveFocus();
  });

  it('shows the override count beside the collapsed value', () => {
    renderEnvironmentConfigField({
      entries: [{ value: 'g' }, { env: 'production', value: 'p' }, { env: 'tt02', value: 's' }],
    });

    expect(getCollapsedButton()).toHaveTextContent(
      textMock(
        'process_editor.configuration_panel.environment_config.summary_value_with_overrides',
        { value: 'g', count: 2 },
      ),
    );
  });

  it('shows the override count when no default value is set', () => {
    renderEnvironmentConfigField({ entries: [{ env: 'production', value: 'p' }] });

    expect(getCollapsedButton()).toHaveTextContent(
      textMock('process_editor.configuration_panel.environment_config.summary_overrides', {
        count: 1,
      }),
    );
  });

  it('shows only the default value when there are no overrides', () => {
    renderEnvironmentConfigField({ entries: [{ value: 'g' }] });

    expect(getCollapsedButton()).toHaveTextContent('g');
  });

  it('shows the default value and ordered overrides when expanded', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({
      entries: [{ env: 'production', value: 'p' }, { env: 'local', value: 'd' }, { value: 'g' }],
    });

    await user.click(getCollapsedButton());

    expect(getRowLabels()).toEqual([globalLabel, developmentLabel, productionLabel]);
  });

  it('offers unused environments and hides the menu when none remain', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({ entries: [{ env: 'tt02', value: 's' }] });
    await user.click(getCollapsedButton());

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    expect(getMenuItem(developmentLabel)).toBeInTheDocument();
    expect(getMenuItem(productionLabel)).toBeInTheDocument();
    expect(queryMenuItem(stagingLabel)).not.toBeInTheDocument();

    await user.click(getMenuItem(developmentLabel));
    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(productionLabel));

    expect(screen.queryByRole('button', { name: addOverrideLabel })).not.toBeInTheDocument();
  });

  it('does not save a new override until it has a value', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({ entries: [{ value: 'g' }], onChange });
    await user.click(getCollapsedButton());

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(stagingLabel));
    await user.click(screen.getByLabelText(stagingLabel));
    await user.tab();

    expect(screen.getByLabelText(stagingLabel)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('saves an override with the standard environment name', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({ entries: [{ value: 'g' }], onChange });
    await user.click(getCollapsedButton());

    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(stagingLabel));
    await user.type(screen.getByLabelText(stagingLabel), 'staging-value');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith([
      { value: 'g' },
      { env: 'staging', value: 'staging-value' },
    ]);
  });

  it('deletes the saved entry when an override is cleared', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({
      entries: [{ value: 'g' }, { env: 'tt02', value: 's' }],
      onChange,
    });
    await user.click(getCollapsedButton());

    await user.clear(screen.getByLabelText(stagingLabel));
    await user.tab();

    expect(onChange).toHaveBeenCalledWith([{ value: 'g' }]);
  });

  it('keeps a cleared override row available for input', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({ entries: [{ env: 'tt02', value: 's' }] });
    await user.click(getCollapsedButton());

    await user.clear(screen.getByLabelText(stagingLabel));
    await user.tab();

    expect(screen.getByLabelText(stagingLabel)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    expect(queryMenuItem(stagingLabel)).not.toBeInTheDocument();
  });

  it('removes empty draft overrides when the field closes', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({ entries: [{ value: 'g' }] });
    await user.click(getCollapsedButton());
    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(stagingLabel));

    await user.click(
      screen.getByRole('button', { name: textMock('general.close_item', { item: fieldLabel }) }),
    );
    await user.click(getCollapsedButton());

    expect(screen.queryByLabelText(stagingLabel)).not.toBeInTheDocument();
  });

  it('hides the default delete button when the input can be cleared', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({ entries: [{ value: 'g' }] });

    await user.click(getCollapsedButton());

    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel.environment_config.remove_global_value'),
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /delete_item/ })).toHaveLength(0);
  });

  it('removes an empty draft override when deleted', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({ entries: [{ value: 'g' }], onChange });
    await user.click(getCollapsedButton());
    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    await user.click(getMenuItem(stagingLabel));

    await user.click(getDeleteButton(stagingLabel));

    expect(screen.queryByLabelText(stagingLabel)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: addOverrideLabel }));
    expect(getMenuItem(stagingLabel)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an override when deleted', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({ entries: [{ env: 'tt02', value: 's' }], onChange });
    await user.click(getCollapsedButton());

    await user.click(getDeleteButton(stagingLabel));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('warns about an unknown environment and preserves it when saving another row', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({ entries: [{ env: 'at21', value: 'dead' }], onChange });
    await user.click(getCollapsedButton());

    expect(screen.getByText(unknownEnvironmentsAlert('at21', 1))).toBeInTheDocument();

    await user.type(screen.getByLabelText(globalLabel), 'g');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith([{ env: 'at21', value: 'dead' }, { value: 'g' }]);
  });

  it('includes unknown environments in the collapsed override count', () => {
    renderEnvironmentConfigField({ entries: [{ env: 'at21', value: 'dead' }] });

    expect(getCollapsedButton()).toHaveTextContent(
      textMock('process_editor.configuration_panel.environment_config.summary_overrides', {
        count: 1,
      }),
    );
  });

  it('shows the original name for an unknown environment', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({ entries: [{ env: 'at21', value: 'dead' }] });

    await user.click(getCollapsedButton());

    expect(screen.getByText('at21')).toBeInTheDocument();
    expect(screen.getByText('dead')).toBeInTheDocument();
  });

  it('deletes only the selected entry for a duplicate unknown environment', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({
      entries: [
        { env: 'at21', value: 'first' },
        { env: 'at21', value: 'second' },
      ],
      onChange,
    });
    await user.click(getCollapsedButton());

    await user.click(getDeleteButtons('at21')[0]);

    expect(onChange).toHaveBeenCalledWith([{ env: 'at21', value: 'second' }]);
    expect(screen.getByText(unknownEnvironmentsAlert('at21', 1))).toBeInTheDocument();
  });

  it('warns about duplicate entries for the same environment', async () => {
    const user = userEvent.setup();
    renderEnvironmentConfigField({
      entries: [
        { env: 'tt02', value: 'first' },
        { env: 'at22', value: 'second' },
      ],
    });

    await user.click(getCollapsedButton());

    expect(
      screen.getByText(
        textMock(
          'process_editor.configuration_panel.environment_config.duplicate_environments_alert',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('preserves earlier duplicates when editing the active entry', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvironmentConfigField({
      entries: [
        { env: 'tt02', value: 'shadowed' },
        { env: 'at22', value: 'used' },
      ],
      onChange,
    });
    await user.click(getCollapsedButton());

    await user.clear(screen.getByLabelText(stagingLabel));
    await user.type(screen.getByLabelText(stagingLabel), 'updated');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith([
      { env: 'tt02', value: 'shadowed' },
      { env: 'at22', value: 'updated' },
    ]);
  });
});

function getCollapsedButton(): HTMLElement {
  return screen.getByRole('button', { name: fieldLabel });
}

function unknownEnvironmentsAlert(environments: string, count: number): string {
  return textMock(
    'process_editor.configuration_panel.environment_config.unknown_environments_alert',
    { count, environments },
  );
}

function getRowLabels(): string[] {
  return screen.getAllByRole('textbox').map((input) => input.getAttribute('aria-label'));
}

function getDeleteButton(environmentLabel: string): HTMLElement {
  return screen.getByRole('button', {
    name: textMock('general.delete_item', { item: environmentLabel }),
  });
}

function getDeleteButtons(environmentLabel: string): HTMLElement[] {
  return screen.getAllByRole('button', {
    name: textMock('general.delete_item', { item: environmentLabel }),
  });
}

function getMenuItem(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

function queryMenuItem(name: string): HTMLElement | null {
  return screen.queryByRole('button', { name });
}

type TestProps = Partial<{
  entries: EnvironmentEntry<string>[];
  onChange: (entries: EnvironmentEntry<string>[]) => void;
}>;

const TestValueControl = ({
  label,
  value,
  onChange,
}: EnvironmentValueControlProps<string>): ReactElement => {
  const [localValue, setLocalValue] = useState<string>(value);
  return (
    <input
      aria-label={label}
      onBlur={() => localValue !== value && onChange(localValue)}
      onChange={(event) => setLocalValue(event.target.value)}
      type='text'
      value={localValue}
    />
  );
};

const TestHost = ({ entries: initialEntries = [], onChange }: TestProps): ReactElement => {
  const [entries, setEntries] = useState<EnvironmentEntry<string>[]>(initialEntries);
  return (
    <EnvironmentConfigField<string>
      emptyValue=''
      entries={entries}
      formatValue={(value) => value}
      isEmptyValue={(value) => !value.trim()}
      label={fieldLabel}
      onChange={(updatedEntries) => {
        onChange?.(updatedEntries);
        setEntries(updatedEntries);
      }}
      renderValueControl={(controlProps) => <TestValueControl {...controlProps} />}
    />
  );
};

function renderEnvironmentConfigField(props: TestProps = {}): void {
  render(<TestHost {...props} />);
}
