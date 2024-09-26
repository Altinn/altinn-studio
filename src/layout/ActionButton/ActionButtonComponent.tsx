import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import type { PropsFromGenericComponent } from '..';

import { PDFGeneratorPreview } from 'src/features/devtools/components/PDFPreviewButton/PDFGeneratorPreview';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { ButtonLoader } from 'src/layout/Button/ButtonLoader';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useActionAuthorization } from 'src/layout/CustomButton/CustomButtonComponent';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ActionButtonStyle } from 'src/layout/ActionButton/config.generated';
import type { ButtonColor, ButtonVariant } from 'src/layout/Button/WrappedButton';

export const buttonStyles: { [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type IActionButton = PropsFromGenericComponent<'ActionButton'>;

export function ActionButtonComponent({ node }: IActionButton) {
  const { busyWithId, busy, next } = useProcessNavigation() || {};
  const { isAuthorized } = useActionAuthorization();

  const { setPdfPreview, pdfPreview } = useDevToolsStore((state) => ({
    setPdfPreview: state.actions.setPdfPreview,
    pdfPreview: state.pdfPreview,
  }));

  const { action, buttonStyle, id, textResourceBindings } = useNodeItem(node);
  const disabled = !isAuthorized(action);
  const isLoadingHere = busyWithId === id;

  function handleClick() {
    if (action === 'printPreview') {
      setPdfPreview(!pdfPreview);
    }

    if (!disabled && !busy && action !== 'printPreview') {
      next && next({ action, nodeId: id });
    }
  }

  const parentIsPage = node.parent instanceof LayoutPage;

  // FIXME: app crashes hard if buttonStyle is configured incorrectly
  const { color, variant } = buttonStyles[buttonStyle];

  if (action === 'printPreview') {
    return <PDFGeneratorPreview buttonTitle={textResourceBindings?.title} />;
  }
  return (
    <ComponentStructureWrapper node={node}>
      <ButtonLoader
        isLoading={isLoadingHere}
        style={{
          marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined,
        }}
      >
        <Button
          size='small'
          id={`action-button-${id}`}
          variant={variant}
          color={color}
          disabled={disabled || isLoadingHere || busy}
          onClick={handleClick}
        >
          <Lang id={textResourceBindings?.title ?? `actions.${action}`} />
        </Button>
      </ButtonLoader>
    </ComponentStructureWrapper>
  );
}
