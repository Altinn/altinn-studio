import { StudioButton } from '@studio/components-legacy';
import type {
  Summary2OverrideConfig,
  Summary2TargetConfig,
} from 'app-shared/types/ComponentSpecificConfig';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2OverrideEntry } from './Summary2OverrideEntry';
import { PlusIcon } from '@studio/icons';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useAppContext, useComponentTitle } from '../../../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { getComponentOptions, getTargetLayoutSetName } from '../Summary2Target/targetUtils';

export type Summary2OverrideProps = {
  overrides: Summary2OverrideConfig[];
  target: Summary2TargetConfig;
  onChange: (overrides: Summary2OverrideConfig[]) => void;
};

export const Summary2Override = ({ overrides, target, onChange }: Summary2OverrideProps) => {
  const { t } = useTranslation();
  const [openOverrides, setOpenOverrides] = React.useState([]);

  const componentOptions = useTargetComponentOptions(target);

  const addOverride = (): void => {
    const updatedOverrides = [...(overrides || [])];
    setOpenOverrides([...openOverrides, updatedOverrides.length]);
    updatedOverrides.push({ componentId: '' });
    onChange(updatedOverrides);
  };

  const onChangeOverride =
    (index: number): ((override: any) => void) =>
    (override: any) => {
      const updatedOverrides = [...overrides];
      updatedOverrides[index] = override;
      onChange(updatedOverrides);
    };

  const onDeleteOverride =
    (index: number): (() => void) =>
    () => {
      const updatedOverrides = [...overrides];
      updatedOverrides.splice(index, 1);
      setOpenOverrides((prev) => {
        return prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
      });
      onChange(updatedOverrides);
    };

  return (
    <>
      {overrides?.length > 0 && (
        <div style={{ marginBottom: 'var(--fds-spacing-4)' }}>
          {overrides.map((override, index) => (
            <Summary2OverrideEntry
              index={index + 1}
              open={openOverrides.includes(index)}
              setOpen={(open) =>
                open
                  ? setOpenOverrides([...openOverrides, index])
                  : setOpenOverrides(openOverrides.filter((i) => i !== index))
              }
              componentOptions={componentOptions}
              key={`${index}${override.componentId}`}
              override={override}
              onChange={onChangeOverride(index)}
              onDelete={onDeleteOverride(index)}
            ></Summary2OverrideEntry>
          ))}
        </div>
      )}
      <StudioButton icon={<PlusIcon />} size='sm' variant='secondary' onClick={addOverride}>
        {t('ux_editor.component_properties.summary.add_override')}
      </StudioButton>
    </>
  );
};

const useTargetComponentOptions = (target: Summary2TargetConfig): any[] => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const layoutSetName = getTargetLayoutSetName({
    target,
    layoutSets,
    selectedFormLayoutSetName: useAppContext().selectedFormLayoutSetName,
  });
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, layoutSetName);
  const getComponentTitle = useComponentTitle();

  if (!formLayoutsData) return [];
  if (target?.type === 'page' && target.id) {
    const formPage = formLayoutsData[target.id];
    if (!formPage) return [];
    return getComponentOptions({
      formLayoutsData: [formPage],
      getComponentTitle,
    });
  }
  const components = getComponentOptions({ formLayoutsData, getComponentTitle });
  if (target?.type === 'component') {
    return components.filter(({ id }) => id === target.id);
  }
  return components;
};
