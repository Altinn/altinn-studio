import React, { useState } from 'react';

import { Panel } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthGroupWrapper } from 'src/features/form/components/FullWidthGroupWrapper';
import { FullWidthWrapper } from 'src/features/form/components/FullWidthWrapper';
import { getVariant } from 'src/features/form/components/Panel';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { getTextResource } from 'src/utils/formComponentUtils';
import { createRepeatingGroupComponentsForIndex } from 'src/utils/formLayout';
import { getLayoutComponentById } from 'src/utils/layout';
import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';

import { EditIconButton } from 'altinn-shared/components/EditIconButton';
import { SuccessIconButton } from 'altinn-shared/components/SuccessIconButton';
import { getLanguageFromKey } from 'altinn-shared/utils';

export interface IPanelGroupContainerProps {
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
}

interface ICustomIconProps {
  iconUrl: string;
  iconAlt: string;
  size?: string;
}

function CustomIcon({ iconUrl, iconAlt, size }: ICustomIconProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <img
        src={iconUrl}
        alt={iconAlt}
        data-testid='custom-icon'
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

export function PanelGroupContainer({
  container,
  components,
}: IPanelGroupContainerProps) {
  const dispatch = useAppDispatch();
  const GetHiddenSelector = makeGetHidden();
  const [open, setOpen] = useState<boolean>(!container.panel?.groupReference);
  const layout = useAppSelector(
    (state) => state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const hiddenFields = useAppSelector(
    (state) => state.formLayout.uiConfig.hiddenFields,
  );
  const hidden = useAppSelector((state) =>
    GetHiddenSelector(state, { id: container.id }),
  );
  const title = useAppSelector((state) =>
    getTextResource(
      container.textResourceBindings?.title,
      state.textResources.resources,
    ),
  );
  const body = useAppSelector((state) =>
    getTextResource(
      container.textResourceBindings?.body,
      state.textResources.resources,
    ),
  );
  const addLabel = useAppSelector((state) =>
    getTextResource(
      container.textResourceBindings?.add_label,
      state.textResources.resources,
    ),
  );
  const repeatingGroups = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups,
  );
  const { iconUrl, iconAlt } = container.panel;
  const fullWidth = !container.baseComponentId;
  const repGroupReference = container.panel?.groupReference;
  const referencedGroup: ILayoutGroup = repGroupReference
    ? (getLayoutComponentById(repGroupReference.group, layouts) as ILayoutGroup)
    : undefined;
  const referencedGroupIndex = referencedGroup
    ? repeatingGroups[referencedGroup.id].index
    : -1;

  const handleSave = () => {
    setOpen(false);
    dispatch(
      FormLayoutActions.updateRepeatingGroups({
        layoutElementId: referencedGroup.id,
      }),
    );
  };

  const handleOpen = () => {
    setOpen(true);
  };

  if (hidden) {
    return null;
  }

  return (
    <Grid item={true}>
      <ConditionalWrapper
        condition={fullWidth}
        wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
      >
        <ConditionalWrapper
          condition={!fullWidth && open}
          wrapper={(child) => (
            <FullWidthGroupWrapper>{child}</FullWidthGroupWrapper>
          )}
        >
          <>
            {referencedGroup && !open && (
              <Grid item>
                <EditIconButton
                  id={`add-reference-button-${container.id}`}
                  label={addLabel}
                  onClick={handleOpen}
                />
              </Grid>
            )}
            {open && (
              <Panel
                title={title}
                renderIcon={
                  iconUrl
                    ? ({ size }) => (
                        <CustomIcon
                          iconUrl={iconUrl}
                          iconAlt={iconAlt}
                          size={size}
                        />
                      )
                    : undefined
                }
                variant={getVariant({ variant: container.panel.variant })}
                showPointer={!!repGroupReference}
              >
                <Grid
                  container={true}
                  item={true}
                  spacing={3}
                  alignItems='flex-start'
                  data-testid='panel-group-container'
                >
                  <Grid
                    item
                    xs={12}
                  >
                    {body}
                  </Grid>

                  {referencedGroup &&
                    createRepeatingGroupComponentsForIndex({
                      container: referencedGroup,
                      renderComponents:
                        components ||
                        referencedGroup.children.map((id) =>
                          getLayoutComponentById(id, layouts),
                        ),
                      textResources,
                      index: referencedGroupIndex + 1,
                      hiddenFields,
                    }).map((component) => {
                      return renderLayoutComponent(component, layout);
                    })}

                  {!referencedGroup &&
                    components.map((component) => {
                      return renderLayoutComponent(component, layout);
                    })}

                  {referencedGroup && (
                    <Grid item>
                      <SuccessIconButton
                        id={`save-reference-button-${container.id}`}
                        label={getLanguageFromKey('general.save', language)}
                        onClick={handleSave}
                      />
                    </Grid>
                  )}
                </Grid>
              </Panel>
            )}
          </>
        </ConditionalWrapper>
      </ConditionalWrapper>
    </Grid>
  );
}
