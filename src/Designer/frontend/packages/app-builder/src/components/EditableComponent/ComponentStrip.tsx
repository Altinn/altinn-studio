import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph, StudioToggleGroup } from '@designer/components';
import { ArrowDownIcon, ArrowUpIcon, CogIcon, EyeIcon, TrashIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useRuleFields } from '../../hooks/useRuleFields';
import type { LayoutComponent } from '../../types';
import { setBindingField } from '../../utils/bindingUtils';
import {
  getHiddenProperty,
  getRequiredProperty,
  setRequiredValue,
} from '../../utils/componentUtils';
import { getWidth, setProperty, setWidth } from '../../utils/layoutUtils';
import type { ComponentWidth } from '../../utils/layoutUtils';
import { isQuestionType } from '../../utils/newComponentUtils';
import { createDefaultRule, toHiddenExpression, toRequiredExpression } from '../../utils/ruleUtils';
import { BindingLine } from '../BindingLine/BindingLine';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { RuleBox } from '../RuleBox/RuleBox';
import classes from './EditableComponent.module.css';

export type ComponentStripProps = {
  component: LayoutComponent;
  onDelete: () => void;
};

/** The tools of the selected component, at its bottom edge. */
export function ComponentStrip({ component, onDelete }: ComponentStripProps): ReactElement {
  const { t } = useTranslation();
  const { dataModel } = useAppBuilder();
  const { updateComponent } = usePageEditing();
  const requiredProperty = getRequiredProperty(component);
  const hiddenProperty = getHiddenProperty(component);
  const hasAdvancedRule =
    requiredProperty.kind === 'advanced' || hiddenProperty.kind === 'advanced';
  const hasBinding = isQuestionType(component.type);

  const update = (change: (current: LayoutComponent) => LayoutComponent): void =>
    updateComponent(component.id, change);

  return (
    <div className={classes.strip} data-size='sm'>
      {hasBinding && (
        <BindingLine
          component={component}
          onChangeField={(field) =>
            update((current) => setBindingField(current, field, dataModel?.dataType))
          }
        />
      )}
      {requiredProperty.kind === 'rule' && (
        <RuleBox
          kind='required'
          rule={requiredProperty.rule}
          ownerId={component.id}
          onChange={(rule) =>
            update((current) => setRequiredValue(current, toRequiredExpression(rule)))
          }
          onDelete={() => update((current) => setRequiredValue(current, false))}
        />
      )}
      {hiddenProperty.kind === 'rule' && (
        <RuleBox
          kind='show'
          rule={hiddenProperty.rule}
          ownerId={component.id}
          onChange={(rule) =>
            update((current) => setProperty(current, 'hidden', toHiddenExpression(rule)))
          }
          onDelete={() => update((current) => setProperty(current, 'hidden', undefined))}
        />
      )}
      {hasAdvancedRule && (
        <StudioParagraph data-size='xs' className={classes.advancedRule}>
          {t('app_builder.rule.advanced')}
        </StudioParagraph>
      )}
      <ComponentToolbar component={component} onDelete={onDelete} />
    </div>
  );
}

type ComponentToolbarProps = ComponentStripProps;

function ComponentToolbar({ component, onDelete }: ComponentToolbarProps): ReactElement {
  const { t } = useTranslation();
  const { openSettings, setOpenSettings } = useCanvasState();
  const { moveComponent, canMoveComponent, updateComponent } = usePageEditing();
  const ruleFields = useRuleFields(component.id);
  const defaultRule = createDefaultRule(ruleFields);
  const hasShowRule = getHiddenProperty(component).kind !== 'always';
  const isSettingsOpen = openSettings === 'component';

  const move = (offset: number): void => moveComponent(component.id, offset);

  return (
    <div className={classes.toolbar} role='toolbar' aria-label={t('app_builder.component_toolbar')}>
      {isQuestionType(component.type) && (
        <StudioToggleGroup
          data-size='sm'
          value={getWidth(component)}
          onChange={(width) =>
            updateComponent(component.id, (current) => setWidth(current, width as ComponentWidth))
          }
        >
          <StudioToggleGroup.Item value='full'>
            {t('app_builder.width.full')}
          </StudioToggleGroup.Item>
          <StudioToggleGroup.Item value='half'>
            {t('app_builder.width.half')}
          </StudioToggleGroup.Item>
        </StudioToggleGroup>
      )}
      {!hasShowRule && defaultRule && (
        <>
          {isQuestionType(component.type) && <span className={classes.separator} aria-hidden />}
          <StudioButton
            variant='tertiary'
            data-size='sm'
            icon={<EyeIcon />}
            onClick={() =>
              updateComponent(component.id, (current) =>
                setProperty(current, 'hidden', toHiddenExpression(defaultRule)),
              )
            }
          >
            {t('app_builder.rule.add')}
          </StudioButton>
        </>
      )}
      <div className={classes.toolbarEnd}>
        {canMoveComponent(component.id, -1) && (
          <IconButton
            label={t('app_builder.move_component_up')}
            icon={<ArrowUpIcon />}
            onClick={() => move(-1)}
          />
        )}
        {canMoveComponent(component.id, 1) && (
          <IconButton
            label={t('app_builder.move_component_down')}
            icon={<ArrowDownIcon />}
            onClick={() => move(1)}
          />
        )}
        <StudioButton
          variant={isSettingsOpen ? 'secondary' : 'tertiary'}
          data-size='sm'
          icon={<CogIcon />}
          title={t('app_builder.more_settings')}
          aria-label={t('app_builder.more_settings')}
          aria-expanded={isSettingsOpen}
          onClick={() => setOpenSettings(isSettingsOpen ? undefined : 'component')}
        />
        <span className={classes.separator} aria-hidden />
        <StudioButton
          variant='tertiary'
          data-size='sm'
          data-color='danger'
          icon={<TrashIcon />}
          title={t('app_builder.delete_component')}
          aria-label={t('app_builder.delete_component')}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}

type IconButtonProps = {
  label: string;
  icon: ReactElement;
  onClick: () => void;
};

function IconButton({ label, icon, onClick }: IconButtonProps): ReactElement {
  return (
    <StudioButton
      variant='tertiary'
      data-size='sm'
      icon={icon}
      title={label}
      aria-label={label}
      onClick={onClick}
    />
  );
}
