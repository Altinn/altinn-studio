import { Grid, makeStyles, Typography } from '@material-ui/core';
import * as React from 'react';
import { shallowEqual } from 'react-redux';
import appTheme from 'altinn-shared/theme/altinnAppTheme';
import {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import {
  getDisplayFormDataForComponent,
  getFormDataForComponentInRepeatingGroup,
} from 'src/utils/formComponentUtils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { getLanguageFromKey } from 'altinn-shared/utils';
import GroupInputSummary from './GroupInputSummary';
import ErrorPaper from '../message/ErrorPaper';
import { EditButton } from './EditButton';
import { useAppSelector } from 'src/common/hooks';

export interface ISummaryGroupComponent {
  id: string;
  pageRef?: string;
  componentRef?: string;
  largeGroup?: boolean;
  index?: number;
  parentGroup?: string;
  changeText: string;
  onChangeClick: () => void;
}

export function getComponentForSummaryGroup(
  layout: ILayout,
  groupId: string,
): ILayoutGroup {
  return layout.find((component) => component.id === groupId) as ILayoutGroup;
}

const gridStyle = {
  paddingTop: '12px',
};

export function getHiddenFieldsForSummaryGroup(
  hiddenFields: string[],
  componentIds: string[],
) {
  const result = [];
  hiddenFields.forEach((fieldKey) => {
    const fieldKeyWithoutIndex = fieldKey.replace(/-\d{1,}$/, '');
    if (componentIds.find((id) => id === fieldKeyWithoutIndex)) {
      result.push(fieldKey);
    }
  });

  return result;
}

const useStyles = makeStyles({
  label: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
  link: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #008FD6',
    cursor: 'pointer',
    paddingLeft: 0,
  },
});

function SummaryGroupComponent(props: ISummaryGroupComponent) {
  const classes = useStyles();
  const { pageRef, componentRef } = props;

  const [title, setTitle] = React.useState<string>('');
  const [groupHasErrors, setGroupHasErrors] = React.useState<boolean>(false);
  const [groupChildComponents, setGroupChildComponents] = React.useState<
    string[]
  >([]);

  const groupComponent = useAppSelector(
    state =>
      getComponentForSummaryGroup(
        state.formLayout.layouts[pageRef],
        componentRef,
      ),
    shallowEqual,
  );
  const repeatingGroups = useAppSelector(state => state.formLayout.uiConfig.repeatingGroups);
  const layout = useAppSelector(state => state.formLayout.layouts[pageRef]);
  const formData = useAppSelector(state => state.formData.formData);
  const textResources = useAppSelector(state => state.textResources.resources);
  const language = useAppSelector(state => state.language.language);
  const options = useAppSelector(state => state.optionState.options);
  const validations = useAppSelector(state => state.formValidations.validations);
  const hiddenFields = useAppSelector(state =>
    getHiddenFieldsForSummaryGroup(
      state.formLayout.uiConfig.hiddenFields,
      groupComponent.edit?.multiPage
        ? groupComponent.children.map(
            (childId) => childId.split(':')[1] || childId,
          )
        : groupComponent.children,
    ),
  );

  React.useEffect(() => {
    if (textResources && groupComponent) {
      const titleKey = groupComponent.textResourceBindings?.title;
      setTitle(
        getTextFromAppOrDefault(titleKey, textResources, null, [], true),
      );
    }
  }, [textResources, groupComponent]);

  React.useEffect(() => {
    if (groupComponent && groupComponent.children) {
      setGroupChildComponents(
        groupComponent.edit?.multiPage
          ? groupComponent.children.map(
              (childId) => childId.split(':')[1] || childId,
            )
          : groupComponent.children,
      );
    }
  }, [groupComponent]);

  const getRepeatingGroup = (containerId: string) => {
    const id =
      props.index >= 0 && props.parentGroup
        ? `${containerId}-${props.index}`
        : containerId;
    if (repeatingGroups && repeatingGroups[id]) {
      return repeatingGroups[id];
    }

    return undefined;
  };

  const getRepeatingGroupMaxIndex = (containerId: string) => {
    const repeatingGroup = getRepeatingGroup(containerId);
    if (repeatingGroup && repeatingGroup.count >= 0) {
      return repeatingGroup.count;
    }
    return -1;
  };

  const repeatingGroupMaxIndex = getRepeatingGroupMaxIndex(componentRef);

  React.useEffect(() => {
    let groupErrors = false;
    if (!props.largeGroup) {
      for (let i = 0; i <= repeatingGroupMaxIndex; i++) {
        if (groupErrors) {
          break;
        }

        // eslint-disable-next-line no-loop-func
        groupChildComponents.forEach((componentId: string) => {
          const component: ILayoutComponent = layout.find(
            (c: ILayoutComponent) => c.id === componentId,
          ) as ILayoutComponent;
          const componentIdWithIndex = `${component.id}${
            props.index >= 0 ? `-${props.index}` : ''
          }-${i}`;

          if (
            validations[props.pageRef] &&
            validations[props.pageRef][componentIdWithIndex]
          ) {
            groupErrors = true;
          }
        });
      }
      setGroupHasErrors(groupErrors);
    }
  }, [
    validations,
    props.largeGroup,
    props.pageRef,
    groupChildComponents,
    repeatingGroupMaxIndex,
    layout,
    props.index,
  ]);

  const createRepeatingGroupSummaryComponents = () => {
    const componentArray = [];
    for (let i = 0; i <= repeatingGroupMaxIndex; ++i) {
      const childSummaryComponents = groupChildComponents.map(
        (componentId: string) => {
          const component: ILayoutComponent = layout.find(
            (c: ILayoutComponent) => c.id === componentId,
          ) as ILayoutComponent;
          const componentDeepCopy = JSON.parse(JSON.stringify(component));
          componentDeepCopy.id = `${componentDeepCopy.id}${
            props.index >= 0 ? `-${props.index}` : ''
          }-${i}`;

          Object.keys(component.dataModelBindings).forEach((key) => {
            let binding = component.dataModelBindings[key].replace(
              groupComponent.dataModelBindings.group,
              `${groupComponent.dataModelBindings.group}[${i}]`,
            );
            if (props.parentGroup) {
              const parentGroup = layout.find(
                (c) => c.id === props.parentGroup,
              );
              binding = binding.replace(
                parentGroup.dataModelBindings.group,
                `${parentGroup.dataModelBindings.group}[${props.index}]`,
              );
            }
            componentDeepCopy.dataModelBindings[key] = binding;
          });

          const formDataForComponent = getDisplayFormDataForComponent(
            formData,
            componentDeepCopy,
            textResources,
            options,
          );

          if (hiddenFields.find((field) => field === `${componentId}-${i}`)) {
            return null;
          }

          return (
            <GroupInputSummary
              key={componentId}
              formData={formDataForComponent}
              label={getTextFromAppOrDefault(
                component.textResourceBindings?.title,
                textResources,
                null,
                [],
                false,
              )}
            />
          );
        },
      );
      componentArray.push(
        <div key={i} style={{ paddingBottom: 24 }}>{childSummaryComponents}</div>,
      );
    }

    return componentArray;
  };

  const createRepeatingGroupSummaryForLargeGroups = () => {
    const componentArray = [];
    for (let i = 0; i <= repeatingGroupMaxIndex; i++) {
      const groupContainer: ILayoutGroup = {
        id: `${groupComponent.id}-${i}-summary`,
        type: 'Group',
        children: [],
        maxCount: 0,
        textResourceBindings: {
          title: groupComponent.textResourceBindings?.title,
        },
      };
      const childSummaryComponents = [];
      groupChildComponents.forEach((componentId: string) => {
        const component = layout.find(
          (c: ILayoutComponent) => c.id === componentId,
        );
        const isGroupComponent = component.type.toLowerCase() === 'group';
        const summaryType = 'Summary';
        const summaryId = `${component.id}-summary${
          isGroupComponent ? '-group' : ''
        }`;
        const dataModelBinding: any = {};
        Object.keys(component.dataModelBindings).forEach((key) => {
          dataModelBinding[key] = component.dataModelBindings[key].replace(
            groupComponent.dataModelBindings.group,
            `${groupComponent.dataModelBindings.group}[${i}]`,
          );
        });
        let formDataForComponent: any;
        if (!isGroupComponent) {
          formDataForComponent = getFormDataForComponentInRepeatingGroup(
            formData,
            component as ILayoutComponent,
            i,
            groupComponent.dataModelBindings.group,
            textResources,
            options,
          );
        }
        groupContainer.children.push(summaryId);

        const summaryComponent = {
          id: summaryId,
          type: summaryType,
          componentRef: component.id,
          pageRef: props.pageRef,
          dataModelBindings: {},
          textResourceBindings: {},
          readOnly: false,
          required: false,
          formData: formDataForComponent,
          index: i,
          parentGroup: isGroupComponent ? groupComponent.id : undefined,
        };

        if (!hiddenFields.find((field) => field === `${componentId}-${i}`)) {
          childSummaryComponents.push(summaryComponent);
        }
      });

      componentArray.push(
        <DisplayGroupContainer
          key={`${groupContainer.id}-summary`}
          components={childSummaryComponents}
          container={groupContainer}
          renderLayoutComponent={renderLayoutComponent}
        />,
      );
    }
    return componentArray;
  };

  const renderComponents: any = props.largeGroup
    ? createRepeatingGroupSummaryForLargeGroups()
    : createRepeatingGroupSummaryComponents();

  if (props.largeGroup && layout) {
    return <>{renderComponents}</>;
  }

  return (
    <>
      <Grid container={true}>
        <Grid item={true} xs={10}>
          <Typography
            variant='body1'
            className={`${classes.label} ${
              groupHasErrors ? ` ${classes.labelWithError}` : ''
            }`}
            component='span'
          >
            {title}
          </Typography>
        </Grid>
        <Grid item xs={2}>
          <EditButton
            onClick={props.onChangeClick}
            editText={props.changeText}
          />
        </Grid>
        <Grid item xs={12}>
          {renderComponents}
        </Grid>
      </Grid>
      {groupHasErrors && (
        <Grid container={true} style={gridStyle}>
          <ErrorPaper
            message={getLanguageFromKey('group.row_error', language)}
          />
          <Grid item={true} xs={12}>
            <button
              className={classes.link}
              onClick={props.onChangeClick}
              type='button'
            >
              {getTextFromAppOrDefault(
                'form_filler.summary_go_to_correct_page',
                textResources,
                language,
                [],
                true,
              )}
            </button>
          </Grid>
        </Grid>
      )}
    </>
  );
}

export default SummaryGroupComponent;
