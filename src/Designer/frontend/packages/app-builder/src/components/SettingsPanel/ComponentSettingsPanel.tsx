import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ComponentType } from 'app-shared/types/ComponentType';
import { StudioButton, StudioSelect } from '@designer/components';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import { getMainTextProperty } from '../../utils/componentUtils';
import { isGroup, setProperty } from '../../utils/layoutUtils';
import { isQuestionType, savesToDataModel } from '../../utils/newComponentUtils';
import { getPageTitle } from '../../utils/pageUtils';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { AnswerSection } from './AnswerSection';
import { FillingSection } from './FillingSection';
import { PrefillSection } from './PrefillSection';
import { SettingsPanelFrame, SettingsSection } from './SettingsPanelFrame';
import { TextSetting } from './TextSetting';
import { VisibilitySetting } from './VisibilitySetting';
import { LikertSettings } from './LikertSettings';
import { isLikertStatic } from '../../utils/likertUtils';
import type { VisibilityTarget } from './VisibilitySetting';

export type ComponentSettingsPanelProps = {
  component: LayoutComponent;
  onDelete: () => void;
};

const alertSeverities = ['info', 'warning', 'success', 'danger'] as const;

/** Every setting the builder offers for the component, grouped in sections. */
export function ComponentSettingsPanel({
  component,
  onDelete,
}: ComponentSettingsPanelProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const { setOpenSettings } = useCanvasState();
  const { pageName, moveComponent, canMoveComponent, updateComponent } = usePageEditing();
  const isQuestion = isQuestionType(component.type);
  const move = (offset: number): void => moveComponent(component.id, offset);

  return (
    <SettingsPanelFrame
      kicker={getPageTitle(pageName, texts)}
      title={t(`app_builder.component_type.${component.type}`)}
      onClose={() => setOpenSettings(undefined)}
      actions={
        <>
          {canMoveComponent(component.id, -1) && (
            <StudioButton
              variant='tertiary'
              data-size='sm'
              icon={<ArrowUpIcon />}
              title={t('app_builder.move_component_up')}
              aria-label={t('app_builder.move_component_up')}
              onClick={() => move(-1)}
            />
          )}
          {canMoveComponent(component.id, 1) && (
            <StudioButton
              variant='tertiary'
              data-size='sm'
              icon={<ArrowDownIcon />}
              title={t('app_builder.move_component_down')}
              aria-label={t('app_builder.move_component_down')}
              onClick={() => move(1)}
            />
          )}
        </>
      }
      footer={
        <StudioButton
          variant='tertiary'
          data-color='danger'
          data-size='sm'
          icon={<TrashIcon />}
          onClick={onDelete}
        >
          {t('app_builder.delete_component')}
        </StudioButton>
      }
    >
      {isLikertStatic(component) ? (
        <LikertSettings component={component} />
      ) : (
        <>
          <SettingsSection title={t('app_builder.settings.content')}>
            <TextSetting
              component={component}
              property={getMainTextProperty(component)}
              label={t(getMainTextLabel(component))}
              isMultiline={!isQuestion && !isGroup(component)}
            />
            {component.type === ComponentType.Alert && (
              <StudioSelect
                label={t('app_builder.settings.severity')}
                value={component.severity ?? 'info'}
                onChange={(event) =>
                  updateComponent(component.id, (current) =>
                    setProperty(current, 'severity', event.target.value),
                  )
                }
              >
                {alertSeverities.map((severity) => (
                  <StudioSelect.Option key={severity} value={severity}>
                    {t(`app_builder.settings.severity.${severity}`)}
                  </StudioSelect.Option>
                ))}
              </StudioSelect>
            )}
            {(isQuestion || isGroup(component)) && (
              <TextSetting
                component={component}
                property='description'
                label={t('app_builder.settings.description')}
                description={t('app_builder.settings.description.description')}
              />
            )}
            {isQuestion && (
              <TextSetting
                component={component}
                property='help'
                label={t('app_builder.settings.help')}
                description={t('app_builder.settings.help.description')}
              />
            )}
          </SettingsSection>
          {isQuestion && <AnswerSection component={component} />}
          {isQuestion && <FillingSection component={component} />}
          {savesToDataModel(component.type) && <PrefillSection component={component} />}
        </>
      )}
      <VisibilitySetting
        target={getVisibilityTarget(component)}
        hidden={component.hidden}
        ownerId={component.id}
        onChange={(hidden) =>
          updateComponent(component.id, (current) => setProperty(current, 'hidden', hidden))
        }
      />
    </SettingsPanelFrame>
  );
}

function getMainTextLabel(component: LayoutComponent): string {
  if (isGroup(component)) return 'app_builder.settings.group_title';
  if (isQuestionType(component.type)) return 'app_builder.settings.label';
  return 'app_builder.settings.text';
}

function getVisibilityTarget(component: LayoutComponent): VisibilityTarget {
  if (isLikertStatic(component)) return 'table';
  if (isGroup(component)) return 'group';
  return isQuestionType(component.type) ? 'field' : 'text';
}
