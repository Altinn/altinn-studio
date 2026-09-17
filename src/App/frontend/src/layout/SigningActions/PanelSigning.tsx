import React, { useId, useRef } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';

import { Button, FullWidthWrapper, LiveValidationMessage, Panel } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Dialog, Heading, Paragraph } from '@digdir/designsystemet-react';
import type { PanelProps } from '@app/form-component';

import { useFocusOnRequest } from 'src/core/contexts/ElementFocusProvider';
import { useProcessNext } from 'src/features/instance/useProcessNext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/SigningActions/SigningActions.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

type SigningPanelProps = {
  baseComponentId: string;
  heading: React.ReactElement;
  description?: React.ReactElement;
  variant?: PanelProps['variant'];
  actionButton?: ReactElement<typeof Button>;
  errorMessage?: React.ReactElement;
};

export function SigningPanel({
  baseComponentId,
  heading,
  description,
  variant = 'info',
  actionButton,
  errorMessage,
  children,
}: PropsWithChildren<SigningPanelProps>) {
  const canReject = useIsAuthorized()('reject');
  const focusHeadingOnChange = useFocusOnRequest();

  return (
    <FullWidthWrapper isOnBottom>
      <Panel
        variant={variant}
        className={classes.signingPanel}
      >
        <div className={classes.contentContainer}>
          <Heading
            ref={focusHeadingOnChange}
            level={4}
            data-size='xs'
          >
            {heading}
          </Heading>
          {description && <Paragraph>{description}</Paragraph>}

          {children}
          <div>
            <div className={classes.buttonContainer}>
              {actionButton}
              {canReject && <RejectButton baseComponentId={baseComponentId} />}
            </div>
            <LiveValidationMessage show={!!errorMessage}>{errorMessage}</LiveValidationMessage>
          </div>
        </div>
      </Panel>
    </FullWidthWrapper>
  );
}

type RejectTextProps = {
  baseComponentId: string;
};

/**
 * Moves focus to the dialog title on open, so screen readers announce it
 * We don't use node.focus() since the dialog's content is always mounted (the native <dialog> stays in the DOM while closed)
 */
function setAutoFocus(node: HTMLElement | null) {
  node?.setAttribute('autofocus', '');
}

function RejectButton({ baseComponentId }: RejectTextProps) {
  const { langAsString } = useLanguage();
  const modalRef = useRef<HTMLDialogElement>(null);
  const reactId = useId();
  const titleId = `reject-modal-title-${reactId}`;
  const descId = `reject-modal-description-${reactId}`;
  const { mutate: processReject, isPending: isRejecting } = useProcessNext({ action: 'reject' });
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const rejectModalTitle = useEvalExpression(
    config.textResourceBindings?.rejectModalTitle,
    Expressions.SigningActions.textResourceBindings.rejectModalTitle,
  );
  const rejectModalDescription = useEvalExpression(
    config.textResourceBindings?.rejectModalDescription,
    Expressions.SigningActions.textResourceBindings.rejectModalDescription,
  );
  const rejectModalButton = useEvalExpression(
    config.textResourceBindings?.rejectModalButton,
    Expressions.SigningActions.textResourceBindings.rejectModalButton,
  );
  const rejectModalCloseButton = useEvalExpression(
    config.textResourceBindings?.rejectModalCloseButton,
    Expressions.SigningActions.textResourceBindings.rejectModalCloseButton,
  );
  const rejectModalTriggerButton = useEvalExpression(
    config.textResourceBindings?.rejectModalTriggerButton,
    Expressions.SigningActions.textResourceBindings.rejectModalTriggerButton,
  );

  const modalTitle =
    (config.textResourceBindings?.rejectModalTitle === undefined ? undefined : rejectModalTitle) ??
    'signing.reject_modal_title';
  const modalDescription =
    (config.textResourceBindings?.rejectModalDescription === undefined ? undefined : rejectModalDescription) ??
    'signing.reject_modal_description';
  const modalButton =
    (config.textResourceBindings?.rejectModalButton === undefined ? undefined : rejectModalButton) ??
    'signing.reject_modal_button';
  const modalCloseButton =
    (config.textResourceBindings?.rejectModalCloseButton === undefined ? undefined : rejectModalCloseButton) ??
    'signing.reject_modal_close_button';
  const modalTriggerButton =
    (config.textResourceBindings?.rejectModalTriggerButton === undefined ? undefined : rejectModalTriggerButton) ??
    'signing.reject_modal_trigger_button';

  return (
    <Dialog.TriggerContext>
      <Dialog.Trigger asChild>
        <Button
          color='danger'
          variant='secondary'
          size='md'
        >
          <Lang id={modalTriggerButton} />
        </Button>
      </Dialog.Trigger>
      <Dialog
        aria-labelledby={titleId}
        modal
        ref={modalRef}
      >
        <Dialog.Block>
          <Heading
            id={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            ref={setAutoFocus}
          >
            <Lang id={modalTitle} />
          </Heading>
        </Dialog.Block>
        <Dialog.Block>
          <Paragraph id={descId}>
            <Lang id={modalDescription} />
          </Paragraph>
        </Dialog.Block>
        <Dialog.Block className={classes.dialogButtonContainer}>
          <Button
            color='danger'
            disabled={isRejecting}
            size='md'
            isLoading={isRejecting}
            loadingLabel={langAsString('general.loading')}
            onClick={() => processReject()}
          >
            <Lang id={modalButton} />
          </Button>
          <Button
            variant='secondary'
            size='md'
            onClick={() => modalRef.current?.close()}
          >
            <Lang id={modalCloseButton} />
          </Button>
        </Dialog.Block>
      </Dialog>
    </Dialog.TriggerContext>
  );
}
