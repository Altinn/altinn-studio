import React from 'react';

import { screen, within } from '@testing-library/react';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { resourcesAsMap } from 'src/features/textResources/resourcesAsMap';
import { RepeatingGroupsLikertContainer } from 'src/layout/Likert/RepeatingGroupsLikertContainer';
import { setupStore } from 'src/redux/store';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { IFormDataState } from 'src/features/formData';
import type { IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { IRawTextResource, ITextResourcesState } from 'src/features/textResources';
import type { IValidationState } from 'src/features/validation/validationSlice';
import type { IOption } from 'src/layout/common.generated';
import type { CompGroupExternal, CompGroupRepeatingLikertExternal } from 'src/layout/Group/config.generated';
import type { CompOrGroupExternal } from 'src/layout/layout';
import type { CompLikertExternal } from 'src/layout/Likert/config.generated';
import type { ILayoutValidations } from 'src/utils/validation/types';

export const defaultMockQuestions = [
  { Question: 'Hvordan trives du på skolen?', Answer: '' },
  { Question: 'Har du det bra?', Answer: '' },
  { Question: 'Hvor god er du i matte?', Answer: '' },
];

const groupBinding = 'Questions';
const answerBinding = 'Answer';
const questionBinding = 'Question';

export const generateMockFormData = (likertQuestions: IQuestion[]): Record<string, string> =>
  likertQuestions.reduce(
    (formData, likertQuestion, index) => ({
      ...formData,
      [`${groupBinding}[${index}].${answerBinding}`]: likertQuestion.Answer,
      [`${groupBinding}[${index}].${questionBinding}`]: likertQuestion.Question,
    }),
    {},
  );

export const defaultMockOptions: IOption[] = [
  {
    label: 'Bra',
    value: '1',
  },
  {
    label: 'Ok',
    value: '2',
  },
  {
    label: 'Dårlig',
    value: '3',
  },
];

export const questionsWithAnswers = ({ questions, selectedAnswers }) => {
  const questionsCopy = [...questions];

  selectedAnswers.forEach((answer) => {
    questionsCopy[answer.questionIndex].Answer = answer.answerValue;
  });

  return questionsCopy;
};

const createLikertContainer = (
  props: Partial<CompGroupRepeatingLikertExternal> | undefined,
): CompGroupRepeatingLikertExternal => ({
  id: 'likert-repeating-group-id',
  type: 'Group',
  children: ['field1'],
  maxCount: 99,
  dataModelBindings: {
    group: groupBinding,
  },
  edit: {
    mode: 'likert',
  },
  ...props,
});

const createRadioButton = (props: Partial<CompLikertExternal> | undefined): CompLikertExternal => ({
  id: 'field1',
  type: 'Likert',
  dataModelBindings: {
    simpleBinding: `${groupBinding}.${answerBinding}`,
  },
  textResourceBindings: {
    title: 'likert-questions',
  },
  optionsId: 'option-test',
  readOnly: false,
  required: false,
  ...props,
});

export const createFormDataUpdateAction = (index: number, optionValue: string): PayloadAction<IUpdateFormData> => ({
  payload: {
    componentId: `field1-${index}`,
    data: optionValue,
    field: `Questions[${index}].Answer`,
    skipValidation: false,
  },
  type: FormDataActions.update.type,
});

const createLayout = (
  container: CompGroupExternal,
  components: CompOrGroupExternal[],
  groupIndex: number,
): ILayoutState => ({
  error: null,
  layoutsets: null,
  layouts: {
    FormLayout: [container, ...components],
  },
  layoutSetId: null,
  uiConfig: {
    hiddenFields: [],
    repeatingGroups: {
      'likert-repeating-group-id': {
        index: groupIndex,
        editIndex: -1,
      },
    },
    currentView: 'FormLayout',
    focus: null,
    navigationConfig: {},
    tracks: {
      order: null,
      hidden: [],
      hiddenExpr: {},
    },
    pageTriggers: [],
    excludePageFromPdf: [],
    excludeComponentFromPdf: [],
  },
});

export const createFormError = (index: number): ILayoutValidations => ({
  [`field1-${index}`]: {
    simpleBinding: {
      errors: ['Feltet er påkrevd'],
      warnings: [],
    },
  },
});

const createFormValidationsForCurrentView = (validations: ILayoutValidations = {}): IValidationState => ({
  error: null,
  invalidDataTypes: [],
  validations: { FormLayout: validations },
});

const createTextResource = (questions: IQuestion[], extraResources: IRawTextResource[]): ITextResourcesState => ({
  resourceMap: resourcesAsMap([
    {
      id: 'likert-questions',
      value: '{0}',
      variables: [
        {
          key: `${groupBinding}[{0}].${questionBinding}`,
          dataSource: 'dataModel.default',
        },
      ],
    },
    ...questions.map((question, index) => ({
      id: `likert-questions-${index}`,
      value: question.Question,
    })),
    ...extraResources,
  ]),
  language: 'nb',
  error: null,
});

const { setScreenWidth } = mockMediaQuery(992);

interface IQuestion {
  Question: string;
  Answer: string;
}

interface IRenderProps {
  mobileView: boolean;
  mockQuestions: IQuestion[];
  mockOptions: IOption[];
  radioButtonProps: Partial<CompLikertExternal>;
  likertContainerProps: Partial<CompGroupRepeatingLikertExternal>;
  extraTextResources: IRawTextResource[];
  validations: ILayoutValidations;
}

export const render = ({
  mobileView = false,
  mockQuestions = defaultMockQuestions,
  mockOptions = defaultMockOptions,
  radioButtonProps,
  likertContainerProps,
  extraTextResources = [],
  validations,
}: Partial<IRenderProps> = {}) => {
  const mockRadioButton = createRadioButton(radioButtonProps);
  const mockLikertContainer = createLikertContainer(likertContainerProps);
  const components: CompOrGroupExternal[] = [mockRadioButton];
  const mockData: IFormDataState = {
    formData: generateMockFormData(mockQuestions),
    lastSavedFormData: {},
    error: null,
    submittingId: '',
    unsavedChanges: false,
    saving: false,
  };

  const preloadedState = getInitialStateMock({
    formLayout: createLayout(mockLikertContainer, components, mockQuestions.length - 1),
    formData: mockData,
    formValidations: createFormValidationsForCurrentView(validations),
    textResources: createTextResource(mockQuestions, extraTextResources),
  });

  const mockStore = setupStore(preloadedState).store;
  const mockStoreDispatch = jest.fn();
  mockStore.dispatch = mockStoreDispatch;
  setScreenWidth(mobileView ? 600 : 1200);
  renderWithProviders(
    <ContainerTester id={mockLikertContainer.id} />,
    {
      store: mockStore,
    },
    { fetchOptions: () => Promise.resolve(mockOptions) },
  );

  return { mockStoreDispatch };
};

export function ContainerTester(props: { id: string }) {
  const node = useResolvedNode(props.id);
  if (!node || !(node.isType('Group') && node.isRepGroupLikert())) {
    throw new Error(`Could not resolve node with id ${props.id}, or unexpected node type`);
  }

  return <RepeatingGroupsLikertContainer node={node} />;
}

export const validateTableLayout = async (questions: IQuestion[], options: IOption[]) => {
  screen.getByRole('table');

  for (const option of defaultMockOptions) {
    const columnHeader = await screen.findByRole('columnheader', {
      name: new RegExp(option.label),
    });
    expect(columnHeader).toBeInTheDocument();
  }

  await validateRadioLayout(questions, options);
};

export const validateRadioLayout = async (questions: IQuestion[], options: IOption[], mobileView = false) => {
  if (mobileView) {
    const radioGroups = await screen.findAllByRole('radiogroup');
    expect(radioGroups).toHaveLength(questions.length);
  } else {
    expect(await screen.findAllByRole('row')).toHaveLength(questions.length + 1);
  }

  for (const question of questions) {
    const row = await screen.findByRole(mobileView ? 'radiogroup' : 'row', {
      name: question.Question,
    });

    for (const option of options) {
      // Ideally we should use `getByRole` selector here, but the tests that use this function
      // generates a DOM of several hundred nodes, and `getByRole` is quite slow since it has to traverse
      // the entire tree. Doing that in a loop (within another loop) on hundreds of nodes is not a good idea.
      // ref: https://github.com/testing-library/dom-testing-library/issues/698
      const radio = within(row).getByDisplayValue(option.value);

      if (question.Answer && option.value === question.Answer) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  }
};
