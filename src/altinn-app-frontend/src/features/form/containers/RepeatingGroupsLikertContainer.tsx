import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { ITextResource } from 'src/types';
import { LayoutStyle } from 'src/types';
import * as React from 'react';
import { Grid, TableCell, Typography } from '@material-ui/core';
import { GenericComponent } from 'src/components/GenericComponent';
import {
  AltinnSpinner,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';
import { getTextResource } from 'src/utils/formComponentUtils';
import { useGetOptions } from 'src/components/hooks';
import { useAppSelector } from 'src/common/hooks';
import { getOptionLookupKey } from 'src/utils/options';
import type { IRadioButtonsContainerProps } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';
import useMediaQuery from '@material-ui/core/useMediaQuery';

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
    repeatingGroupDeepCopyComponents[0] as IRadioButtonsContainerProps;
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = apiOptions || options || [];
  const fetchingOptions = useAppSelector(
    (state) =>
      state.optionState.options[getOptionLookupKey(optionsId, mapping)]
        ?.loading,
  );

  const getText = (key: string | undefined) => {
    return key ? getTextResource(key, textResources) : undefined;
  };

  const title = getText(container.textResourceBindings?.title);
  const description = getText(container.textResourceBindings?.description);
  const titleId = `likert-title-${id}`;
  const descriptionId = `likert-description-${id}`;

  const Header = (
    <Grid
      item={true}
      xs={12}
    >
      {title && (
        <Typography
          component='h5'
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
          aria-labelledby={title && titleId}
          aria-describedby={description && descriptionId}
        >
          {repeatingGroupDeepCopyComponents.map((comp) => {
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
          aria-labelledby={title && titleId}
          aria-describedby={description && descriptionId}
        >
          <AltinnTableHeader
            id={`likert-table-header-${id}`}
            padding={'dense'}
          >
            <AltinnTableRow>
              <TableCell />
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
