import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultMockOptions, generateValidations, render } from 'src/layout/Likert/LikertTestUtils';
import type { IRawOption } from 'src/layout/common.generated';

const defaultMockQuestions = [
  { Question: 'Hvordan trives du på skolen?', Answer: '' },
  { Question: 'Har du det bra?', Answer: '' },
  { Question: 'Hvor god er du i matte?', Answer: '' },
];

describe('Likert', () => {
  describe('Desktop', () => {
    it('should render table with all questions and options with options', async () => {
      const mockQuestions = [
        { Question: 'Hvordan trives du på skolen?', Answer: '' },
        { Question: 'Har du det bra?', Answer: '' },
        { Question: 'Hvor god er du i matte?', Answer: '' },
      ];
      await render({ mockQuestions, mockOptions: defaultMockOptions });

      screen.getByRole('table');

      defaultMockQuestions.forEach((question) => {
        const row = screen.getByRole('row', {
          name: new RegExp(question.Question),
        });

        defaultMockOptions.forEach((option) => {
          expect(within(row).getByRole('radio', { name: new RegExp(option.label) })).toBeInTheDocument();
        });
      });
    });

    it('should render all questions with correct options using options and not optionsId', async () => {
      const options = defaultMockOptions;
      const questions = defaultMockQuestions;

      await render({
        mockQuestions: questions,
        radioButtonProps: {
          optionsId: undefined,
          options,
        },
      });
      screen.getByRole('table');

      for (const option of options) {
        const allAlternatives = await screen.findAllByRole('radio', {
          name: new RegExp(option.label),
        });
        for (const alternative of allAlternatives) {
          expect(alternative).toBeInTheDocument();
        }
      }

      const radioGroups = await screen.findAllByRole('row');
      expect(radioGroups).toHaveLength(questions.length + 1);

      for (const question of questions) {
        const row = await screen.findByRole('row', {
          name: new RegExp(question.Question),
        });

        for (const option of options) {
          // Ideally we should use `getByRole` selector here, but the tests that use this function
          // generates a DOM of several hundred nodes, and `getByRole` is quite slow since it has to traverse
          // the entire tree. Doing that in a loop (within another loop) on hundreds of nodes is not a good idea.
          // ref: https://github.com/testing-library/dom-testing-library/issues/698
          const radio = within(row).getByDisplayValue(String(option.value));

          if (question.Answer && option.value === question.Answer) {
            expect(radio).toBeChecked();
          } else {
            expect(radio).not.toBeChecked();
          }
        }
      }
    });

    it('should render title, description and left column header', async () => {
      await render({
        mockQuestions: defaultMockQuestions,
        likertProps: {
          textResourceBindings: {
            title: 'Test title',
            description: 'Test description',
            leftColumnHeader: 'Test left column header',
          },
        },
      });

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

      const table = screen.getByRole('table', { name: /Test title/i });
      expect(table).toBeInTheDocument();
      expect(table).toHaveAccessibleDescription(/Test description/i);
      expect(screen.getByText('Test left column header')).toBeInTheDocument();
    });

    it('should render table with one selected row', async () => {
      const answer = defaultMockOptions[1];
      const mockQuestions = [
        { Question: 'Hvordan trives du på skolen?', Answer: '' },
        { Question: 'Har du det bra?', Answer: answer.value },
        { Question: 'Hvor god er du i matte?', Answer: '' },
      ];

      await render({ mockQuestions });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      const row = screen.getByRole('row', {
        name: /Har du det bra?/i,
      });

      const checkedRadio = within(row).getByRole('radio', { name: new RegExp(answer.label) });
      const unCheckedRadio = within(row).getByRole('radio', { name: new RegExp(defaultMockOptions[0].label) });

      expect(checkedRadio).toBeChecked();
      expect(unCheckedRadio).not.toBeChecked();
    });

    it('should have multiple selected rows', async () => {
      const mockQuestions = [
        { Question: 'Hvordan trives du på skolen?', Answer: defaultMockOptions[0] },
        { Question: 'Har du det bra?', Answer: defaultMockOptions[1] },
        { Question: 'Hvor god er du i matte?', Answer: defaultMockOptions[2] },
      ];

      await render({ mockQuestions: mockQuestions.map((q) => ({ ...q, Answer: q.Answer.value })) });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      mockQuestions.forEach((mockQuestion) => {
        const row = screen.getByRole('row', {
          name: new RegExp(mockQuestion.Question),
        });

        const checkedRadio = within(row).getByRole('radio', { name: new RegExp(mockQuestion.Answer.label) });
        expect(checkedRadio).toBeChecked();
      });
    });

    it('should correctly filter out questions when start binding is set', async () => {
      const mockQuestions = defaultMockQuestions;

      await render({
        mockQuestions,
        likertProps: {
          filter: [{ key: 'start', value: '2' }],
        },
      });

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[0].Question),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[1].Question),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[2].Question),
        }),
      ).toBeInTheDocument();
    });

    it('should correctly filter out questions when end binding is set', async () => {
      const mockQuestions = defaultMockQuestions;

      await render({
        mockQuestions,
        mockOptions: defaultMockOptions,
        likertProps: {
          filter: [{ key: 'stop', value: '2' }],
        },
      });

      expect(
        screen.getByRole('row', {
          name: new RegExp(mockQuestions[0].Question),
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('row', {
          name: new RegExp(mockQuestions[1].Question),
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[2].Question),
        }),
      ).not.toBeInTheDocument();
    });

    it('should correctly filter out questions with start and end binding', async () => {
      const mockQuestions = defaultMockQuestions;
      await render({
        mockQuestions,
        mockOptions: defaultMockOptions,
        likertProps: {
          filter: [
            { key: 'start', value: '1' },
            { key: 'stop', value: '2' },
          ],
        },
      });

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[0].Question),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole('row', {
          name: new RegExp(mockQuestions[1].Question),
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('row', {
          name: new RegExp(mockQuestions[2].Question),
        }),
      ).not.toBeInTheDocument();
    });

    it('should correctly set clicked radiobuttons', async () => {
      const mockQuestions = defaultMockQuestions;

      await render({ mockQuestions, mockOptions: defaultMockOptions });

      const row1 = screen.getByRole('row', {
        name: new RegExp(mockQuestions[0].Question),
      });

      const cellsRow1 = within(row1).getAllByRole('radio');
      expect(cellsRow1).toHaveLength(defaultMockOptions.length);
      cellsRow1.forEach((cell) => {
        expect(cell).not.toBeChecked();
      });

      const cell1 = within(row1).getByRole('radio', {
        name: new RegExp(defaultMockOptions[0].label),
      });

      const user = userEvent.setup();
      await user.click(cell1);

      expect(cell1).toBeChecked();
    });

    it('should render standard view and use keyboard to navigate', async () => {
      const mockQuestions = [
        { Question: 'Hvordan trives du på skolen?', Answer: '' },
        { Question: 'Har du det bra?', Answer: '' },
        { Question: 'Hvor god er du i matte?', Answer: '' },
      ];
      await render({ mockQuestions, mockOptions: defaultMockOptions });

      const row1 = screen.getByRole('row', {
        name: new RegExp(mockQuestions[0].Question),
      });

      const cell1 = within(row1).getByRole('radio', {
        name: new RegExp(defaultMockOptions[0].label),
      });

      expect(cell1).not.toBeChecked();

      const user = userEvent.setup();

      await user.tab();
      await user.keyboard('[Space]');

      expect(cell1).toBeChecked();
    });

    it('should support nested binding for question text in data model', async () => {
      const extraTextResources = [
        { value: 'Hvordan trives du på skolen?', id: 'nested-question-binding-0' },
        { value: 'Har du det bra?', id: 'nested-question-binding-1' },
        { value: 'Hvor god er du i matte?', id: 'nested-question-binding-2' },
      ];

      const mockQuestions = [
        { Question: `nested-question-binding-0`, Answer: '' },
        { Question: `nested-question-binding-1`, Answer: '' },
        { Question: `nested-question-binding-2`, Answer: '' },
      ];

      await render({ mockQuestions, extraTextResources });

      extraTextResources.forEach((textResource) => {
        screen.getByRole('row', { name: new RegExp(textResource.value) });
      });
    });

    it('should support nested binding for options label referencing text resources', async () => {
      const extraTextResources = [
        {
          value: 'Bra',
          id: `nested-option-binding-0`,
        },
        {
          value: 'Ok',
          id: `nested-option-binding-1`,
        },
        {
          value: 'Dårlig',
          id: `nested-option-binding-2`,
        },
      ];
      const mockOptions: IRawOption[] = [
        {
          label: 'nested-option-binding-0',
          value: '1',
        },
        {
          label: 'nested-option-binding-1',
          value: '2',
        },
        {
          label: 'nested-option-binding-2',
          value: '3',
        },
      ];

      const mockQuestions = [{ Question: 'Hvordan trives du på skolen?', Answer: '' }];

      await render({ mockQuestions: defaultMockQuestions, mockOptions, extraTextResources });

      const row = screen.getByRole('row', { name: new RegExp(mockQuestions[0].Question) });
      extraTextResources.forEach((textResource) => {
        within(row).getByRole('radio', { name: new RegExp(textResource.value) });
      });
    });

    it('should render error message', async () => {
      await render({
        mockQuestions: defaultMockQuestions,
        validationIssues: generateValidations([{ index: 0, message: 'Feltet er påkrevd' }]),
      });
      expect(screen.getByText(/feltet er påkrevd/i)).toBeInTheDocument();
    });

    it('should render 2 validations', async () => {
      await render({
        mockQuestions: defaultMockQuestions,
        validationIssues: generateValidations([
          { index: 0, message: 'Feltet er påkrevd' },
          { index: 1, message: 'Feltet er påkrevd' },
        ]),
      });

      expect(screen.getAllByText(/feltet er påkrevd/i)).toHaveLength(2);
    });
  });

  describe('Mobile', () => {
    it('should display title and description', async () => {
      await render({
        mockQuestions: defaultMockQuestions,
        likertProps: {
          textResourceBindings: {
            title: 'Likert test title',
            description: 'This is a test description',
          },
        },
        mobileView: true,
      });

      expect(screen.getByRole('group', { name: /Likert test title/i })).toHaveAccessibleDescription(
        'This is a test description',
      );
    });

    it('should prefix leftColumnHeader to each radio group legend', async () => {
      const leftColumnHeader = 'Hvor fornøyd eller misfornøyd er du med:';
      const mockQuestions = defaultMockQuestions;

      await render({
        mockQuestions,
        likertProps: {
          textResourceBindings: {
            leftColumnHeader,
            questions: 'likert-questions',
          },
        },
        mobileView: true,
      });

      mockQuestions.forEach((question) => {
        const radioGroup = screen.getByRole('radiogroup', {
          name: new RegExp(`${leftColumnHeader} ${question.Question}`),
        });
        expect(radioGroup).toBeInTheDocument;
      });
    });

    it('should correctly set clicked radiobuttons', async () => {
      const mockQuestions = [{ Question: 'Hvordan trives du på skolen?', Answer: '' }];
      await render({ mockQuestions, mockOptions: defaultMockOptions, mobileView: true });

      const rad1 = screen.getByRole('radiogroup', {
        name: /Hvordan trives du på skolen/i,
      });
      const btn1 = within(rad1).getByRole('radio', {
        name: /Bra/i,
      });
      const btn2 = within(rad1).getByRole('radio', {
        name: /Ok/i,
      });

      expect(btn1).not.toBeChecked();
      expect(btn2).not.toBeChecked();

      const user = userEvent.setup();

      await user.click(btn1);

      expect(btn1).toBeChecked();
      expect(btn2).not.toBeChecked();

      await user.click(btn2);

      expect(btn1).not.toBeChecked();
      expect(btn2).toBeChecked();
    });

    it('should render mobile view with selected values', async () => {
      const answer = defaultMockOptions[1];
      const mockQuestions = [
        { Question: 'Hvordan trives du på skolen?', Answer: '' },
        { Question: 'Har du det bra?', Answer: answer.value },
        { Question: 'Hvor god er du i matte?', Answer: '' },
      ];

      await render({ mockQuestions, mobileView: true });

      const radiogroup = screen.getByRole('radiogroup', {
        name: /Har du det bra?/i,
      });

      const checkedRadio = within(radiogroup).getByRole('radio', { name: answer.label });
      const unCheckedRadio = within(radiogroup).getByRole('radio', { name: new RegExp(defaultMockOptions[0].label) });

      expect(checkedRadio).toBeChecked();
      expect(unCheckedRadio).not.toBeChecked();
    });

    it('should render error message', async () => {
      await render({
        mockQuestions: defaultMockQuestions,
        validationIssues: generateValidations([{ index: 0, message: 'Feltet er påkrevd' }]),
        mobileView: true,
      });

      expect(screen.queryByRole('alert', { name: 'Laster innhold' })).not.toBeInTheDocument();
      expect(screen.getByText(/feltet er påkrevd/i)).toBeInTheDocument();
    });

    it('should correctly filter out questions when start and end binding are set in mobile view', async () => {
      const mockQuestions = defaultMockQuestions;

      await render({
        mockQuestions,
        mobileView: true,
        likertProps: {
          filter: [
            { key: 'start', value: '1' },
            { key: 'stop', value: '2' },
          ],
        },
      });

      expect(
        screen.queryByRole('radiogroup', {
          name: new RegExp(mockQuestions[0].Question),
        }),
      ).not.toBeInTheDocument();

      expect(
        screen.getByRole('radiogroup', {
          name: new RegExp(mockQuestions[1].Question),
        }),
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('radiogroup', {
          name: new RegExp(mockQuestions[2].Question),
        }),
      ).not.toBeInTheDocument();
    });
  });
});
