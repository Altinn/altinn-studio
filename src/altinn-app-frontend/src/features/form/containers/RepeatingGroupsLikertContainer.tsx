import * as React from 'react';

import { Grid, TableCell, Typography } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { useAppSelector } from 'src/common/hooks';
import { GenericComponent } from 'src/components/GenericComponent';
import { useGetOptions } from 'src/components/hooks';
import { LayoutStyle } from 'src/types';
import { getTextResource } from 'src/utils/formComponentUtils';
import { getOptionLookupKey } from 'src/utils/options';
import type { IRadioButtonsContainerProps } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';
import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { ITextResource } from 'src/types';

import {
  AltinnSpinner,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';

type RepeatingGroupsLikertContainerProps = {
  id: string;
  repeatingGroupDeepCopyComponents: ILayoutComponent[];
  textResources: ITextResource[];
  container: ILayoutGroup;
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
  const fetchingOptions = useAppSelector(
    (state) => lookupKey && state.optionState.options[lookupKey]?.loading,
  );

  const getText = (key: string | undefined) => {
    return key ? getTextResource(key, textResources) : undefined;
  };

  const title = getText(container.textResourceBindings?.title);
  const description = getText(container.textResourceBindings?.description);
  const leftColumnHeader = getText(
    container.textResourceBindings?.leftColumnHeader,
  );
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
            return (
              <GenericComponent
                key={comp.id}
                {...(comp as ILayoutComponent)}
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
              <TableCell>{leftColumnHeader}</TableCell>
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
