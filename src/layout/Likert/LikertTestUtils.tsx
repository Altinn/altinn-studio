import React from 'react';

import { v4 as uuidv4 } from 'uuid';
import type { AxiosResponse } from 'axios';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawTextResource, ITextResourceResult } from 'src/features/language/textResources';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompLikertExternal } from 'src/layout/Likert/config.generated';
import type { CompLikertItemExternal } from 'src/layout/LikertItem/config.generated';

const groupBinding = 'Questions';
const answerBinding = 'Answer';
const questionBinding = 'Question';

const generateMockFormData = (likertQuestions: IQuestion[]) => ({
  [groupBinding]: Array.from({ length: likertQuestions.length }, (_, index) => ({
    [ALTINN_ROW_ID]: uuidv4(),
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
        dataElementId: defaultMockDataElementId,
        severity: BackendValidationSeverity.Error,
        source: 'custom',
        showImmediately: true,
      }) as unknown as BackendValidationIssue,
  );

export const defaultMockOptions: IRawOption[] = [
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

const createLikertLayout = (props: Partial<CompLikertExternal> | undefined): CompLikertExternal => ({
  id: 'likert-repeating-group-id',
  type: 'Likert',
  textResourceBindings: {
    questions: 'likert-questions',
  },
  dataModelBindings: {
    answer: { dataType: defaultDataTypeMock, field: `${groupBinding}.${answerBinding}` },
    questions: { dataType: defaultDataTypeMock, field: groupBinding },
  },
  optionsId: 'option-test',
  readOnly: false,
  required: false,
  ...props,
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
  Answer: IRawOption['value'];
}

interface IRenderProps {
  mobileView?: boolean;
  mockQuestions: IQuestion[];
  mockOptions?: IRawOption[];
  radioButtonProps?: Partial<CompLikertItemExternal>;
  likertProps?: Partial<CompLikertExternal>;
  extraTextResources?: IRawTextResource[];
  validationIssues?: BackendValidationIssue[];
}

export const render = async ({
  mobileView = false,
  mockQuestions,
  mockOptions = defaultMockOptions,
  likertProps,
  extraTextResources = [],
  validationIssues = [],
}: IRenderProps) => {
  const mockLikertLayout = createLikertLayout(likertProps);

  setScreenWidth(mobileView ? 600 : 1200);
  return await renderWithInstanceAndLayout({
    renderer: () => <ContainerTester id={mockLikertLayout.id} />,
    queries: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchOptions: async () => ({ data: mockOptions, headers: {} }) as AxiosResponse<IRawOption[], any>,
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
  return (
    <LikertComponent
      baseComponentId={props.id}
      containerDivRef={{ current: null }}
    />
  );
}
