import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { StudioModal } from './';
import type { StudioModalDialogProps } from './StudioModalDialog';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';
import { HouseIcon } from '@studio/icons';

// Test data:
type RenderStudioModalProps = {
  dialogProps: StudioModalDialogProps;
  buttonProps: StudioButtonProps;
};
const contentText = 'Lorem ipsum dolor sit amet';
const triggerText = 'Open';
const defaultDialogProps: StudioModalDialogProps = {
  heading: 'Heading',
  children: contentText,
  closeButtonTitle: 'Close',
};
const defaultButtonProps: StudioButtonProps = {
  children: triggerText,
};
const defaultProps: RenderStudioModalProps = {
  dialogProps: defaultDialogProps,
  buttonProps: defaultButtonProps,
};

// Mocks:
jest.mock('./StudioModalDialog/StudioModalDialog.module.css', () => ({
  dialog: 'dialog',
  withContentPadding: 'withContentPadding',
}));

describe('StudioModal', () => {
  type TestCase = 'built-in trigger' | 'ref and external button';
  const testCases: TestCase[] = ['built-in trigger', 'ref and external button'];

  describe.each(testCases)('When rendered with %s', (testCase) => {
    it('Renders a trigger button with the given name', () => {
      renderStudioModal();
      expect(getTrigger());
    });

    it('Is closed by default', () => {
      renderStudioModal();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Opens when the user clicks the button', async () => {
      const user = userEvent.setup();
      renderStudioModal();
      await openDialog(user);
      getDialog();
    });

    // Todo: Remove "skip" when https://github.com/digdir/designsystemet/issues/2195 is fixed
    it.skip('Closes when the user clicks the close button', async () => {
      const user = userEvent.setup();
      renderStudioModal();
      await openDialog(user);
      await user.click(screen.getByRole('button', { name: defaultDialogProps.closeButtonTitle }));
      expect(queryDialog()).toBeNull();
    });

    // Todo: Remove "skip" when JSDOM adds full support for the dialog element: https://github.com/jsdom/jsdom/issues/3294
    it.skip('Calls onClose when the user closes the dialog', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const dialogProps: StudioModalDialogProps = {
        ...defaultDialogProps,
        onClose,
      };
      renderStudioModal({ dialogProps });
      await openDialog(user);
      expect(onClose).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'close modal' })); // Todo: Replace "close modal" with defaultDialogProps.closeButtonTitle when https://github.com/digdir/designsystemet/issues/2195 is fixed
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Renders the header', async () => {
      const user = userEvent.setup();
      renderStudioModal();
      await openDialog(user);
      screen.getByRole('heading', { name: defaultDialogProps.heading });
    });

    it('Renders the content', async () => {
      const user = userEvent.setup();
      renderStudioModal();
      await openDialog(user);
      screen.getByText(contentText);
    });

    it('Renders the footer', async () => {
      const user = userEvent.setup();
      const footer = 'Footer';
      const dialogProps: StudioModalDialogProps = {
        ...defaultDialogProps,
        footer,
      };
      renderStudioModal({ dialogProps });
      await openDialog(user);
      screen.getByText(footer);
    });

    it('Renders the icon', async () => {
      const user = userEvent.setup();
      const iconTestId = 'icon';
      const icon = <HouseIcon data-testid={iconTestId} />;
      const dialogProps: StudioModalDialogProps = {
        ...defaultDialogProps,
        icon,
      };
      renderStudioModal({ dialogProps });
      await openDialog(user);
      screen.getByTestId(iconTestId);
    });

    it('Appends the given class name for the dialog to the internal class names', async () => {
      const user = userEvent.setup();
      const className = 'test-class';
      const dialogProps: StudioModalDialogProps = {
        ...defaultDialogProps,
        className,
      };
      renderStudioModal({ dialogProps });
      await openDialog(user);
      const dialog = getDialog();
      expect(dialog).toHaveClass(className);
      expect(dialog).toHaveClass('dialog');
    });

    it('Renders with the withContentPadding class on the dialog by default', async () => {
      const user = userEvent.setup();
      renderStudioModal();
      await openDialog(user);
      expect(getDialog()).toHaveClass('withContentPadding');
    });

    it('Renders without the withContentPadding class on the dialog by when contentPadding is set to false', async () => {
      const user = userEvent.setup();
      const dialogProps: StudioModalDialogProps = {
        ...defaultDialogProps,
        contentPadding: false,
      };
      renderStudioModal({ dialogProps });
      await openDialog(user);
      expect(getDialog()).not.toHaveClass('withContentPadding');
    });

    const openDialog = async (user: UserEvent) => {
      await user.click(getTrigger());
    };

    const getTrigger = () => screen.getByRole('button', { name: triggerText });
    const getDialog = () => screen.getByRole('dialog');
    const queryDialog = () => screen.queryByRole('dialog');

    const renderStudioModal =
      testCase === 'built-in trigger' ? renderStudioModalWithTrigger : renderStudioModalWithRef;
  });

  function renderStudioModalWithTrigger({
    dialogProps = defaultDialogProps,
    buttonProps = defaultButtonProps,
  }: Partial<RenderStudioModalProps> = defaultProps) {
    return render(
      <StudioModal.Root>
        <StudioModal.Trigger {...buttonProps} />
        <StudioModal.Dialog {...dialogProps} />
      </StudioModal.Root>,
    );
  }

  function renderStudioModalWithRef({
    dialogProps = defaultDialogProps,
    buttonProps = defaultButtonProps,
  }: RenderStudioModalProps = defaultProps) {
    const Component = () => {
      const ref = useRef<HTMLDialogElement>(null);
      return (
        <>
          <StudioButton onClick={() => ref.current?.showModal()} {...buttonProps} />
          <StudioModal.Dialog {...dialogProps} ref={ref} />
        </>
      );
    };
    return render(<Component />);
  }
});
