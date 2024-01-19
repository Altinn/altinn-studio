import React from 'react';

import { screen, within } from '@testing-library/react';
import type { AxiosResponse } from 'axios';

import {
  type BackendValidationIssue,
  BackendValidationSeverity,
  ValidationIssueSources,
} from 'src/features/validation';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/NodesContext';
import type { FDNewValue } from 'src/features/formData/FormDataWriteStateMachine';
import type { IRawTextResource, ITextResourceResult } from 'src/features/language/textResources';
import type { IOption } from 'src/layout/common.generated';
import type { CompLikertExternal } from 'src/layout/Likert/config.generated';
import type { CompLikertItemExternal } from 'src/layout/LikertItem/config.generated';

export const defaultMockQuestions = [
  { Question: 'Hvordan trives du på skolen?', Answer: '' },
  { Question: 'Har du det bra?', Answer: '' },
  { Question: 'Hvor god er du i matte?', Answer: '' },
];

const groupBinding = 'Questions';
const answerBinding = 'Answer';
const questionBinding = 'Question';

export const generateMockFormData = (likertQuestions: IQuestion[]) => ({
  [groupBinding]: Array.from({ length: likertQuestions.length }, (_, index) => ({
    [answerBinding]: likertQuestions[index].Answer,
    [questionBinding]: likertQuestions[index].Question,
  })),
});

export const generateValidations = (validations: { index: number; message: string }[]): BackendValidationIssue[] =>
  validations.map(
    ({ index, message }) =>
      ({
        customTextKey: message,
        field: `${groupBinding}[${index}].${answerBinding}`,
        severity: BackendValidationSeverity.Error,
        source: ValidationIssueSources.Custom,
        showImmediately: true,
      }) as unknown as BackendValidationIssue,
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

const createLikertLayout = (props: Partial<CompLikertExternal> | undefined): CompLikertExternal => ({
  id: 'likert-repeating-group-id',
  type: 'Likert',
  textResourceBindings: {
    questions: 'likert-questions',
  },
  dataModelBindings: {
    simpleBinding: `${groupBinding}.${answerBinding}`,
    questions: groupBinding,
  },
  optionsId: 'option-test',
  readOnly: false,
  required: false,
  ...props,
});

export const createFormDataUpdateProp = (index: number, optionValue: string): FDNewValue => ({
  path: `Questions[${index}].Answer`,
  newValue: optionValue,
});

const createTextResource = (questions: IQuestion[], extraResources: IRawTextResource[]): ITextResourceResult => ({
  resources: [
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
  ],
  language: 'nb',
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
  radioButtonProps: Partial<CompLikertItemExternal>;
  likertProps: Partial<CompLikertExternal>;
  extraTextResources: IRawTextResource[];
  validationIssues: BackendValidationIssue[];
}

export const render = async ({
  mobileView = false,
  mockQuestions = defaultMockQuestions,
  mockOptions = defaultMockOptions,
  likertProps,
  extraTextResources = [],
  validationIssues = [],
}: Partial<IRenderProps> = {}) => {
  const mockLikertLayout = createLikertLayout(likertProps);

  setScreenWidth(mobileView ? 600 : 1200);
  return await renderWithInstanceAndLayout({
    renderer: () => <ContainerTester id={mockLikertLayout.id} />,
    queries: {
      fetchOptions: async () => ({ data: mockOptions, headers: {} }) as AxiosResponse<IOption[], any>,
      fetchTextResources: async () => createTextResource(mockQuestions, extraTextResources),
      fetchFormData: async () => generateMockFormData(mockQuestions),
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [mockLikertLayout],
          },
        },
      }),
      fetchLayoutSettings: async () => ({
        pages: {
          order: ['FormLayout'],
        },
      }),
      fetchBackendValidations: async () => validationIssues,
    },
  });
};

export function ContainerTester(props: { id: string }) {
  const node = useResolvedNode(props.id);
  if (!node || !node.isType('Likert')) {
    throw new Error(`Could not resolve node with id ${props.id}, or unexpected node type`);
  }

  return <LikertComponent node={node} />;
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
