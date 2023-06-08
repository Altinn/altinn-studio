import { editorPath } from 'app-shared/api/paths';
import { ButtonVariant } from '@digdir/design-system-react';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { TopBarMenu } from 'app-development/layout/AppBar/appBarConfig';

export const subPreviewMenuContent = () => {
  // This content will not be shown in production now
  return null;
  /*    <div className={classes.leftSubHeaderButtons}>
      <Button icon={<ArrowCirclepathIcon />} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.restart.button')}
      </Button>
      <Button icon={<EyeIcon />} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.showas.button')}
      </Button>
      <Button icon={<LinkIcon />} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.sharelink.button')}
      </Button>
    </div> */
};

export const appPreviewButtonActions = (org: string, app: string): AltinnButtonActionItem[] => {
  const action = [
    {
      title: 'top_menu.preview_back_to_editing',
      path: editorPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = editorPath(org, app)),
    },
  ];
  return action;
};

export const AppPreviewHeader = () => {};
