import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EnvTextConfigField } from './EnvTextConfigField';
import type { EnvironmentEntry } from '../types';

const fieldLabel = 'Document type';
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');

describe('EnvTextConfigField', () => {
  afterEach(jest.clearAllMocks);

  it('writes the value without the spaces typed around it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvTextConfigField({ onChange });

    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.type(screen.getByLabelText(globalLabel), '  arkivmelding  ');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith([{ value: 'arkivmelding' }]);
  });

  it('writes nothing when only spaces were added to an unchanged value', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderEnvTextConfigField({ entries: [{ value: 'arkivmelding' }], onChange });

    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.type(screen.getByLabelText(globalLabel), '  ');
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });
});

type RenderProps = {
  entries?: EnvironmentEntry<string>[];
  onChange?: (entries: EnvironmentEntry<string>[]) => void;
};

function renderEnvTextConfigField({ entries = [], onChange = jest.fn() }: RenderProps = {}): void {
  render(<EnvTextConfigField entries={entries} label={fieldLabel} onChange={onChange} />);
}
