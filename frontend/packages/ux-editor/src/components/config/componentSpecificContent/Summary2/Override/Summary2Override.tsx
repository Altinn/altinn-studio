import { StudioButton } from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2OverrideEntry } from './Summary2OverrideEntry';
import { PlusIcon } from '@studio/icons';

export type Summary2OverrideProps = {
  overrides: Summary2OverrideConfig[];
  onChange: (overrides: Summary2OverrideConfig[]) => void;
};

export const Summary2Override = ({ overrides, onChange }: Summary2OverrideProps) => {
  const { t } = useTranslation();
  const [openOverrides, setOpenOverrides] = React.useState([]);

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
              key={`${index}${override.componentId}`}
              override={override}
              onChange={onChangeOverride(index)}
              onDelete={onDeleteOverride(index)}
            ></Summary2OverrideEntry>
          ))}
        </div>
      )}
      <StudioButton
        icon={<PlusIcon />}
        size='sm'
        variant='secondary'
        onClick={addOverride}
        disabled={overrides?.some((override) => !override.componentId)}
      >
        {t('ux_editor.component_properties.summary.add_override')}
      </StudioButton>
    </>
  );
};
