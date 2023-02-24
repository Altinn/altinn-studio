import React from 'react';

import { Grid, TableCell, Typography } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/components/hooks';
import { AltinnTableBody } from 'src/components/molecules/AltinnTableBody';
import { AltinnTableHeader } from 'src/components/molecules/AltinnTableHeader';
import { AltinnTableRow } from 'src/components/molecules/AltinnTableRow';
import { AltinnTable } from 'src/components/organisms/AltinnTable';
import { GenericComponent } from 'src/layout/GenericComponent';
import { LayoutStyle } from 'src/types';
import { getTextResource } from 'src/utils/formComponentUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { getOptionLookupKey } from 'src/utils/options';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup } from 'src/layout/layout';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';
import type { ITextResource } from 'src/types';

type RepeatingGroupsLikertContainerProps = {
  id: string;
  repeatingGroupDeepCopyComponents: ExprUnresolved<ComponentInGroup>[];
  textResources: ITextResource[];
  container: ExprUnresolved<ILayoutGroup>;
};

export const RepeatingGroupsLikertContainer = ({
  id,
  repeatingGroupDeepCopyComponents,
  textResources,
  container,
}: RepeatingGroupsLikertContainerProps) => {
  const { optionsId, mapping, source, options } =
    repeatingGroupDeepCopyComponents[0] as unknown as IRadioButtonsContainerProps;
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = apiOptions || options || [];
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const fetchingOptions = useAppSelector((state) => lookupKey && state.optionState.options[lookupKey]?.loading);

  const node = useResolvedNode(container);

  const getText = (key: string | undefined) => {
    return key ? getTextResource(key, textResources) : undefined;
  };

  const title = getText(node?.item.textResourceBindings?.title);
  const description = getText(node?.item.textResourceBindings?.description);
  const leftColumnHeader = getText(node?.item.textResourceBindings?.leftColumnHeader);

  const titleId = `likert-title-${id}`;
  const descriptionId = `likert-description-${id}`;

  const Header = (
    <Grid
      item={true}
      xs={12}
    >
      {title && (
        <Typography
          component='div'
          variant='h3'
          style={{ width: '100%' }}
          id={titleId}
        >
          {title}
        </Typography>
      )}
      {description && (
        <Typography
          variant='body1'
          gutterBottom
          id={descriptionId}
        >
          {description}
        </Typography>
      )}
    </Grid>
  );

  if (mobileView) {
    return (
      <Grid
        item
        container
      >
        {Header}
        <div
          role='group'
          aria-labelledby={(title && titleId) || undefined}
          aria-describedby={(description && descriptionId) || undefined}
        >
          {repeatingGroupDeepCopyComponents.map((comp) => {
            if (comp.type === 'Group') {
              console.warn('Unexpected group inside likert container', comp);
              return;
            }

            return (
              <GenericComponent
                key={comp.id}
                {...comp}
              />
            );
          })}
        </div>
      </Grid>
    );
  }

  return (
    <>
      {Header}
      {fetchingOptions ? (
        <AltinnSpinner />
      ) : (
        <AltinnTable
          id={id}
          tableLayout='auto'
          wordBreak='normal'
          aria-labelledby={(title && titleId) || undefined}
          aria-describedby={(description && descriptionId) || undefined}
        >
          <AltinnTableHeader
            id={`likert-table-header-${id}`}
            padding={'dense'}
          >
            <AltinnTableRow>
              {leftColumnHeader ? <TableCell>{leftColumnHeader}</TableCell> : <td />}
              {calculatedOptions.map((option, index) => {
                const colLabelId = `${id}-likert-columnheader-${index}`;
                return (
                  <TableCell
                    key={option.value}
                    id={colLabelId}
                    align='center'
                  >
                    {getTextResource(option.label, textResources)}
                  </TableCell>
                );
              })}
            </AltinnTableRow>
          </AltinnTableHeader>
          <AltinnTableBody
            id={`likert-table-body-${id}`}
            padding={'dense'}
          >
            {repeatingGroupDeepCopyComponents.map((comp) => {
              if (comp.type === 'Group') {
                console.warn('Unexpected group inside likert container', comp);
                return;
              }

              return (
                <GenericComponent
                  key={comp.id}
                  {...comp}
                  layout={LayoutStyle.Table}
                  groupContainerId={id}
                />
              );
            })}
          </AltinnTableBody>
        </AltinnTable>
      )}
    </>
  );
};
