import React, { useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDialog, type StudioDialogProps } from './';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { StudioButton } from '../StudioButton';
import type { StudioButtonProps } from '../StudioButton';

// Test data:
const triggerButtonText: string = 'Trigger button';
const dialogText: string = 'Block 1';
const icon1TestId: string = 'Icon 1';
const icon1: ReactNode = <span data-testid={icon1TestId} />;

const defaultDialogProps: StudioDialogProps = {
  children: (
    <StudioDialog.Block>
      <span>{dialogText}</span>
    </StudioDialog.Block>
  ),
};
const defaultButtonProps: StudioButtonProps = {
  children: triggerButtonText,
  icon: icon1,
};
const defaultProps: RenderStudioDialogProps = {
  dialogProps: defaultDialogProps,
  buttonProps: defaultButtonProps,
};

type RenderStudioDialogProps = {
  dialogProps: StudioDialogProps;
  buttonProps: StudioButtonProps;
};

describe('StudioDialog', () => {
  type TestCase = 'built-in trigger' | 'ref and external button';
  const testCases: TestCase[] = ['built-in trigger', 'ref and external button'];

  describe.each(testCases)('When rendered with %s', (testCase) => {
    beforeEach(jest.clearAllMocks);

    it('Displays a dialog when the button is clicked', async () => {
      const user = userEvent.setup();
      renderStudioDialog();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await openDialog(user);
      expect(getDialog()).toBeInTheDocument();
    });

    it('Renders dialog content', async () => {
      const user = userEvent.setup();
      renderStudioDialog();
      await openDialog(user);
      expect(screen.getByText(dialogText)).toBeInTheDocument();
    });

    it('Renders triggerbutton with icon when provided', async () => {
      const user = userEvent.setup();
      renderStudioDialog();
      await openDialog(user);
      expect(screen.getByTestId(icon1TestId)).toBeInTheDocument();
    });

    it('applies custom data-size correctly', async () => {
      const user = userEvent.setup();
      renderStudioDialog({
        dialogProps: { ...defaultDialogProps, 'data-size': 'lg' },
        buttonProps: { ...defaultButtonProps, 'data-size': 'lg' },
      });
      await openDialog(user);
      expect(getDialog().getAttribute('data-size')).toBe('lg');
    });

    const openDialog = async (user: UserEvent): Promise<void> =>
      await user.click(screen.getByRole('button', { name: triggerButtonText }));

    const getDialog = (): HTMLDialogElement => screen.getByRole('dialog');

    const renderStudioDialog =
      testCase === 'built-in trigger' ? renderStudioDialogWithTrigger : renderStudioDialogWithRef;
  });

  function renderStudioDialogWithTrigger({
    dialogProps = defaultDialogProps,
    buttonProps = defaultButtonProps,
  }: Partial<RenderStudioDialogProps> = defaultProps): RenderResult {
    return render(
      <StudioDialog.TriggerContext>
        <StudioDialog.Trigger {...buttonProps} />
        <StudioDialog {...dialogProps} />
      </StudioDialog.TriggerContext>,
    );
  }

  function renderStudioDialogWithRef({
    dialogProps = defaultDialogProps,
    buttonProps = defaultButtonProps,
  }: Partial<RenderStudioDialogProps> = defaultProps): RenderResult {
    const Component = (): ReactElement => {
      const ref = useRef<HTMLDialogElement>(null);
      return (
        <>
          <StudioButton onClick={() => ref.current?.showModal()} {...buttonProps} />
          <StudioDialog {...dialogProps} ref={ref} />
        </>
      );
    };

    return render(<Component />);
  }
});
