import { useState } from 'react';
import type { ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditor } from '@altinn/policy-editor';
import type { Policy } from '@altinn/policy-editor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { VersionedPolicyEditor } from './VersionedPolicyEditor';

jest.mock('@altinn/policy-editor', () => ({ PolicyEditor: jest.fn() }));
jest.mocked(PolicyEditor).mockImplementation(DraftEditor);

const initialPolicy: Policy = {
  revision: '"initial"',
  rules: [{ ruleId: '1', description: 'Original', subject: [], actions: [], resources: [] }],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '3',
};
const defaultProps: ComponentProps<typeof VersionedPolicyEditor> = {
  policy: initialPolicy,
  actions: [],
  subjects: [],
  usageType: 'app',
  showAllErrors: true,
  onSave: jest.fn(),
  onReload: jest.fn(),
};

describe('VersionedPolicyEditor', () => {
  afterEach(jest.clearAllMocks);

  it('retains the draft revision across refreshes and adopts the saved revision for the next edit', async () => {
    const user = userEvent.setup();
    let finishSave: (policy: Policy) => void;
    const onSave = jest
      .fn()
      .mockImplementationOnce(() => new Promise<Policy>((resolve) => (finishSave = resolve)))
      .mockImplementation(async (policy: Policy) => policy);
    const props = { ...defaultProps, onSave };
    const { rerender } = renderVersionedPolicyEditor(props);
    await user.type(getDescription(), ' edited');
    rerender(
      <VersionedPolicyEditor {...props} policy={{ ...initialPolicy, revision: '"external"' }} />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      revision: '"initial"',
      rules: [{ description: 'Original edited' }],
    });
    expect(getDescription()).toBeDisabled();
    finishSave({ ...onSave.mock.calls[0][0], revision: '"saved"' });
    await waitFor(() => expect(getDescription()).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[1][0].revision).toBe('"saved"');
  });

  it('shows a generic save error for server failures', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockRejectedValue({ response: { status: 500 } });
    renderVersionedPolicyEditor({ onSave });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('app_settings.policy_save_failed'),
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      textMock('app_settings.policy_save_conflict'),
    );
    expect(getDescription()).toBeDisabled();
  });
});

function DraftEditor({ policy, onSave }: ComponentProps<typeof PolicyEditor>) {
  const [description, setDescription] = useState(policy.rules[0].description);
  return (
    <>
      <input
        aria-label='Rule description'
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button onClick={() => onSave({ ...policy, rules: [{ ...policy.rules[0], description }] })}>
        Save
      </button>
    </>
  );
}

const getDescription = () => screen.getByRole('textbox', { name: 'Rule description' });

function renderVersionedPolicyEditor(
  props: Partial<ComponentProps<typeof VersionedPolicyEditor>> = {},
) {
  return render(<VersionedPolicyEditor {...defaultProps} {...props} />);
}
