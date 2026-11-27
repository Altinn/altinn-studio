import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDropdown, StudioLinkButton } from '@designer/components';
import {
  ArrowCirclepathIcon,
  CheckmarkIcon,
  ExternalLinkIcon,
  MenuElipsisVerticalIcon,
  SidebarRightIcon,
} from '@designer/icons';
import classes from './PreviewActions.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSearchParams } from 'react-router-dom';
import { usePreviewParty } from 'app-shared/hooks/usePreviewParty';
import type { PreviewParty } from 'app-shared/types/api/PreviewSession';

const parties: PreviewParty[] = ['person', 'organization'];

export type PreviewActionsProps = {
  toggleTitle?: string;
  className: string;
  onCollapseToggle: () => void;
  /** Starts preview over. Without it, the actions have no menu, as when preview is collapsed or shows no page. */
  onStartOver?: () => void;
};

export const PreviewActions = ({
  toggleTitle,
  className,
  onCollapseToggle,
  onStartOver,
}: PreviewActionsProps) => {
  const { t } = useTranslation();
  const { party: selectedParty, setParty } = usePreviewParty();
  const { org, app } = useStudioEnvironmentParams();
  const packagesRouter = new PackagesRouter({ org, app });
  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');
  const previewLinkQueryParams = layout ? `?layout=${layout}` : '';
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${previewLinkQueryParams}`;

  return (
    <div className={className}>
      <StudioButton
        variant='tertiary'
        data-color='neutral'
        icon={<SidebarRightIcon aria-hidden />}
        title={toggleTitle}
        onClick={onCollapseToggle}
      />
      <StudioLinkButton
        variant='tertiary'
        className={classes.previewInNewTabButton}
        title={t('ux_editor.open_preview_in_new_tab')}
        href={previewLink}
        target='_blank'
        rel='noopener noreferrer'
      >
        <ExternalLinkIcon aria-hidden />
      </StudioLinkButton>
      {onStartOver && (
        <div className={classes.menu}>
          <StudioDropdown
            icon={<MenuElipsisVerticalIcon />}
            triggerButtonVariant='tertiary'
            triggerButtonTitle={t('ux_editor.preview.options')}
          >
            <StudioDropdown.List>
              <StudioDropdown.Item>
                <StudioDropdown.Button
                  role='menuitem'
                  icon={<ArrowCirclepathIcon aria-hidden />}
                  onClick={onStartOver}
                >
                  {t('ux_editor.preview.start_over')}
                </StudioDropdown.Button>
              </StudioDropdown.Item>
            </StudioDropdown.List>
            <StudioDropdown.Heading>{t('preview.test_as')}</StudioDropdown.Heading>
            <StudioDropdown.List>
              {parties.map((party) => (
                <StudioDropdown.Item key={party}>
                  <StudioDropdown.Button
                    role='menuitemradio'
                    aria-checked={party === selectedParty}
                    icon={party === selectedParty ? <CheckmarkIcon aria-hidden /> : undefined}
                    onClick={() => setParty(party)}
                  >
                    {t(`preview.test_as_${party}`)}
                  </StudioDropdown.Button>
                </StudioDropdown.Item>
              ))}
            </StudioDropdown.List>
          </StudioDropdown>
        </div>
      )}
    </div>
  );
};
