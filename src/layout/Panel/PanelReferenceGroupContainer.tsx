import React, { useState } from 'react';

import { Panel } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { EditIconButton } from 'src/components/EditIconButton';
import { FullWidthGroupWrapper } from 'src/components/form/FullWidthGroupWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import { SuccessIconButton } from 'src/components/SuccessIconButton';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { CustomIcon } from 'src/layout/Panel/CustomPanelIcon';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { getTextResource } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export interface IPanelGroupContainerProps {
  id: string;
}

export function PanelReferenceGroupContainer({ id }: IPanelGroupContainerProps) {
  const dispatch = useAppDispatch();
  const GetHiddenSelector = makeGetHidden();
  const node = useResolvedNode(id) as LayoutNodeFromType<'Group'>;
  const container = node.item.panel ? node.item : undefined;
  const [open, setOpen] = useState<boolean>(!container?.panel?.groupReference);
  const language = useAppSelector((state) => state.language.language);
  const hidden = useAppSelector((state) => GetHiddenSelector(state, { id }));
  const textResourceBindings = node?.item.textResourceBindings;

  const title = useAppSelector(
    (state) =>
      textResourceBindings?.title && getTextResource(textResourceBindings.title, state.textResources.resources),
  );
  const body = useAppSelector(
    (state) => textResourceBindings?.body && getTextResource(textResourceBindings.body, state.textResources.resources),
  );
  const addLabel = useAppSelector(
    (state) =>
      textResourceBindings?.add_label && getTextResource(textResourceBindings.add_label, state.textResources.resources),
  );
  const { iconUrl, iconAlt } = container?.panel || {};
  const fullWidth = !container?.baseComponentId;
  const repGroupReference = container?.panel?.groupReference;
  const referencedGroupNode = repGroupReference ? node?.top.findById(repGroupReference.group) : undefined;

  const handleSave = () => {
    setOpen(false);
    if (referencedGroupNode) {
      // Adds a new row to the referenced group, making the one we made here visible
      dispatch(
        FormLayoutActions.repGroupAddRow({
          groupId: referencedGroupNode.item.id,
        }),
      );
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  if (hidden || !language || !container || !node) {
    return null;
  }

  return (
    <Grid
      item={true}
      data-componentid={node.item.id}
    >
      <ConditionalWrapper
        condition={fullWidth}
        wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
      >
        <ConditionalWrapper
          condition={!fullWidth && open}
          wrapper={(child) => <FullWidthGroupWrapper>{child}</FullWidthGroupWrapper>}
        >
          <>
            {referencedGroupNode && !open && (
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
                showIcon={container.panel?.showIcon}
                variant={getVariant({ variant: container.panel?.variant })}
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

                  {/*  // TODO: Add test case for filling out a new row in panel, not saving it, and midway through*/}
                  {/*  // adding a new row to the references group. This would show you the not-yet-completed data,*/}
                  {/*  // breaking the illusion. We should fix this by either:*/}
                  {/*  // 1. Keeping the row data in limbo until we save (why do we suddenly have a real save button?*/}
                  {/*  //    we don't have that anywhere else?)*/}
                  {/*  // 2. Actually add a real row to the group when you start filling out stuff.*/}
                  {referencedGroupNode ? (
                    <>
                      {node.children().map((child) => (
                        <GenericComponent
                          key={child.item.id}
                          node={child}
                        />
                      ))}
                      <Grid item>
                        <SuccessIconButton
                          id={`save-reference-button-${container.id}`}
                          label={getLanguageFromKey('general.save', language)}
                          onClick={handleSave}
                        />
                      </Grid>
                    </>
                  ) : (
                    node.children().map((child) => (
                      <GenericComponent
                        key={node.item.id}
                        node={child}
                      />
                    ))
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
