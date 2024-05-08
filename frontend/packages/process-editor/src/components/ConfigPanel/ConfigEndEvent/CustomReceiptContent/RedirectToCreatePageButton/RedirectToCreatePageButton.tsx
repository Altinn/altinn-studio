import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { PencilWritingIcon } from '@studio/icons';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { org, app } = useStudioUrlParams();
  const packagesRouter = new PackagesRouter({ org, app });

  return (
    <div className={classes.goToCreatePageWrapper}>
      <StudioLabelAsParagraph size='small'>
        Gå til Lage for å utforme kvitteringen din
      </StudioLabelAsParagraph>
      <StudioButton
        as='a'
        size='small'
        variant='primary'
        color='second'
        icon={<PencilWritingIcon />}
        href={packagesRouter.getPackageNavigationUrl('editorUiEditor')}
        className={classes.goToCreateButton}
      >
        Gå til Lage
      </StudioButton>
    </div>
  );
};
