import React, { useState } from 'react';

import { Panel } from '@altinn/altinn-design-system';
import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { EditIconButton } from 'src/components/EditIconButton';
import { FullWidthGroupWrapper } from 'src/components/form/FullWidthGroupWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { getVariant } from 'src/components/form/Panel';
import { Lang } from 'src/features/language/Lang';
import { GenericComponent } from 'src/layout/GenericComponent';
import { CustomIcon } from 'src/layout/Panel/CustomPanelIcon';
import type { CompGroupNonRepeatingPanelInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';

export interface IPanelGroupContainerProps {
  node: LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal>;
}

export function PanelReferenceGroupContainer({ node }: IPanelGroupContainerProps) {
  const container = node.item.panel ? node.item : undefined;
  const [open, setOpen] = useState<boolean>(!container?.panel?.groupReference);
  const hidden = node.isHidden();
  const textResourceBindings = node?.item.textResourceBindings;

  const { iconUrl, iconAlt } = container?.panel || {};
  const fullWidth = !container?.baseComponentId;
  const repGroupReference = container?.panel?.groupReference;
  const referencedGroupNode = repGroupReference ? node?.top.findById(repGroupReference.group) : undefined;

  const handleSave = () => {
    setOpen(false);
    if (referencedGroupNode) {
      // Adds a new row to the referenced group, making the one we made here visible
      // TODO: This code will be removed, so there's no need to implement this
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  if (hidden || !container) {
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
                  label={<Lang id={textResourceBindings?.add_label} />}
                  onClick={handleOpen}
                />
              </Grid>
            )}
            {open && (
              <Panel
                title={<Lang id={textResourceBindings?.title} />}
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
                    <Lang id={textResourceBindings?.description} />
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
                        <Button
                          id={`save-reference-button-${container.id}`}
                          onClick={handleSave}
                          size='small'
                        >
                          <Lang id={'general.save'} />
                        </Button>
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
