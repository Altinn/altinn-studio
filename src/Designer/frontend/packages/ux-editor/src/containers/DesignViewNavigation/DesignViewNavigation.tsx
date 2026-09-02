import classes from './DesignViewNavigation.module.css';
import { EyeClosedIcon, EyeIcon, MenuElipsisVerticalIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useConvertToPageOrder } from '../../hooks/mutations/useConvertToPageOrder';
import { useConvertToPageGroups } from '../../hooks/mutations/useConvertToPageGroups';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePagesQuery } from 'app-shared/hooks/queries/usePagesQuery';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import { StudioSpinner, StudioSectionHeader, StudioDropdown } from '@studio/components';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export const DesignViewNavigation = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();

  const { mutate: convertToPageOrder } = useConvertToPageOrder(org, app, layoutSet);
  const { mutate: convertToPageGroups } = useConvertToPageGroups(org, app, layoutSet);
  const { data: pagesModel, isPending: pagesQueryPending } = usePagesQuery(org, app, layoutSet);

  if (pagesQueryPending) return <StudioSpinner aria-label={t('general.loading')} />;

  const isUsingPageGroups = isPagesModelWithGroups(pagesModel);

  return (
    <div data-testid='design-view-navigation'>
      <StudioSectionHeader
        className={classes.sectionHeader}
        heading={{
          text: t('ux_editor.page_layout_header'),
          level: 2,
        }}
        menu={
          <div className={classes.menu}>
            <StudioDropdown
              icon={<MenuElipsisVerticalIcon />}
              triggerButtonVariant='tertiary'
              triggerButtonTitle={t('general.options')}
            >
              <StudioDropdown.List>
                {isUsingPageGroups ? (
                  <StudioDropdown.Item>
                    <StudioDropdown.Button
                      role='menuitem'
                      onClick={() => {
                        if (confirm(t('ux_editor.page_layout_convert_to_pages_confirm')))
                          convertToPageOrder();
                      }}
                    >
                      <EyeClosedIcon className={classes.deleteGroupIcon} />
                      {t('ux_editor.page_layout_remove_group_division')}
                    </StudioDropdown.Button>
                  </StudioDropdown.Item>
                ) : (
                  <StudioDropdown.Item>
                    <StudioDropdown.Button
                      role='menuitem'
                      onClick={() => {
                        if (confirm(t('ux_editor.page_layout_convert_to_group_confirm')))
                          convertToPageGroups();
                      }}
                    >
                      <EyeIcon className={classes.groupPagesIcon} />
                      {t('ux_editor.page_layout_add_group_division')}
                    </StudioDropdown.Button>
                  </StudioDropdown.Item>
                )}
              </StudioDropdown.List>
            </StudioDropdown>
          </div>
        }
      />
    </div>
  );
};
