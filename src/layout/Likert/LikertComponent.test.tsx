import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { jest } from '@jest/globals';

import {
  createFormDataUpdateProp,
  defaultMockOptions,
  defaultMockQuestions,
  generateValidations,
  questionsWithAnswers,
  render,
  validateRadioLayout,
  validateTableLayout,
} from 'src/layout/Likert/LikertTestUtils';

describe('RepeatingGroupsLikertContainer', () => {
  describe('Desktop', () => {
    it('should render table using options and not optionsId', async () => {
      await render({
        radioButtonProps: {
          optionsId: undefined,
          options: defaultMockOptions,
        },
      });
      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render title, description and left column header', async () => {
      await render({
        likertProps: {
          textResourceBindings: {
            title: 'Test title',
            description: 'Test description',
            leftColumnHeader: 'Test left column header',
          },
        },
      });
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Test title')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Test title' })).toBeInTheDocument();
      });
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Test left column header')).toBeInTheDocument();
    });

    it('should render table with one selected row', async () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 1, answerValue: '2' }],
      });
      await render({ mockQuestions: questions });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render table with two selected rows', async () => {
      const selectedAnswers = [
        {
          questionIndex: 1,
          answerValue: '2',
        },
        {
          questionIndex: 2,
          answerValue: '1',
        },
      ];

      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers,
      });

      await render({ mockQuestions: questions });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render table with start binding', async () => {
      await render({
        likertProps: {
          filter: [{ key: 'start', value: '2' }],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions.slice(2), defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render table with end binding', async () => {
      await render({
        likertProps: {
          filter: [{ key: 'stop', value: '3' }],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions.slice(0, 3), defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render table with start and end binding', async () => {
      await render({
        likertProps: {
          filter: [
            { key: 'start', value: '1' },
            { key: 'stop', value: '3' },
          ],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions.slice(1, 3), defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
    });

    it('should render table view and click radiobuttons', async () => {
      const { formDataMethods } = await render();
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });

      const row1 = screen.getByRole('radiogroup', {
        name: /Spørsmål Hvordan trives du på skolen/i,
      });
      const btn1 = within(row1).getByRole('radio', {
        name: /Bra/i,
      });

      const row2 = screen.getByRole('radiogroup', {
        name: /Spørsmål Har du det bra/i,
      });

      const btn2 = within(row2).getByRole('radio', {
        name: /Dårlig/i,
      });

      expect(btn1).not.toBeChecked();
      expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
      await userEvent.click(btn1);
      await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(createFormDataUpdateProp(0, '1')));

      (formDataMethods.setLeafValue as jest.Mock).mockClear();
      expect(btn2).not.toBeChecked();
      expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
      await userEvent.click(btn2);
      await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(createFormDataUpdateProp(1, '3')));
    });

    it('should render standard view and use keyboard to navigate', async () => {
      const { formDataMethods } = await render();
      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });

      expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();

      await userEvent.tab();
      await userEvent.keyboard('[Space]');
      await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(createFormDataUpdateProp(0, '1')));
      expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
    });

    it('should support nested binding for question text in data model', async () => {
      const extraTextResources = defaultMockQuestions.map((question, i) => ({
        value: question.Question,
        id: `nested-question-binding-${i}`,
      }));
      const mockQuestions = defaultMockQuestions.map((question, i) => ({
        ...question,
        Question: `nested-question-binding-${i}`,
      }));
      await render({ mockQuestions, extraTextResources });
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
      await validateTableLayout(defaultMockQuestions, defaultMockOptions, { leftColumnHeader: 'Spørsmål' });
      const group = screen.getByRole('radiogroup', { name: 'Spørsmål Hvordan trives du på skolen?' });
      within(group).getByRole('radio', { name: 'Bra' });
      within(group).getByRole('radio', { name: 'Ok' });
      within(group).getByRole('radio', { name: 'Dårlig' });
    });

    it('should support nested binding for options label referencing text resources', async () => {
      const extraTextResources = defaultMockOptions.map((option, i) => ({
        value: option.label,
        id: `nested-option-binding-${i}`,
      }));
      const mockOptions = defaultMockOptions.map((option, i) => ({
        ...option,
        label: `nested-option-binding-${i}`,
      }));
      await render({ mockOptions, extraTextResources });
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
      await validateTableLayout(defaultMockQuestions, mockOptions, { leftColumnHeader: 'Spørsmål' });
      const group = screen.getByRole('radiogroup', { name: 'Spørsmål Hvordan trives du på skolen?' });
      within(group).getByRole('radio', { name: 'Bra' });
      within(group).getByRole('radio', { name: 'Ok' });
      within(group).getByRole('radio', { name: 'Dårlig' });
    });

    it('should render error message', async () => {
      await render({
        validationIssues: generateValidations([{ index: 0, message: 'Feltet er påkrevd' }]),
      });
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
      expect(screen.getByText(/feltet er påkrevd/i)).toBeInTheDocument();
    });

    it('should render 2 validations', async () => {
      await render({
        validationIssues: generateValidations([
          { index: 0, message: 'Feltet er påkrevd' },
          { index: 1, message: 'Feltet er påkrevd' },
        ]),
      });
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
      expect(screen.getAllByText(/feltet er påkrevd/i)).toHaveLength(2);
    });

    it('should display title and description', async () => {
      await render({
        likertProps: {
          textResourceBindings: {
            title: 'Likert test title',
            description: 'This is a test description',
          },
        },
      });
      await waitFor(() => {
        expect(screen.getByRole('table', { name: /Likert test title/i })).toHaveAccessibleDescription(
          'This is a test description',
        );
      });
    });
  });
  describe('Mobile', () => {
    it('should display title and description', async () => {
      await render({
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
      await render({
        likertProps: {
          textResourceBindings: {
            leftColumnHeader,
            questions: 'likert-questions',
          },
        },
        mobileView: true,
      });
      await validateRadioLayout(
        defaultMockQuestions.map((q) => ({ ...q, Question: `${leftColumnHeader} ${q.Question}` })),
        defaultMockOptions,
      );
    });

    it('should render mobile view and click radiobuttons', async () => {
      const { formDataMethods } = await render({ mobileView: true });
      await validateRadioLayout(defaultMockQuestions, defaultMockOptions);
      const rad1 = screen.getByRole('radiogroup', {
        name: /Hvordan trives du på skolen/i,
      });
      const btn1 = within(rad1).getByRole('radio', {
        name: /Bra/i,
      });
      expect(btn1).not.toBeChecked();

      expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();

      await userEvent.click(btn1);
      await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(createFormDataUpdateProp(0, '1')));
      expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
      (formDataMethods.setLeafValue as jest.Mock).mockClear();

      const rad2 = screen.getByRole('radiogroup', {
        name: /Har du det bra/i,
      });

      const btn2 = within(rad2).getByRole('radio', {
        name: /Dårlig/i,
      });

      expect(btn2).not.toBeChecked();
      expect(formDataMethods.setLeafValue).not.toHaveBeenCalledTimes(2);
      await userEvent.click(btn2);
      await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(createFormDataUpdateProp(1, '3')));
    });

    it('should render mobile view with selected values', async () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 2, answerValue: '2' }],
      });

      await render({ mockQuestions: questions, mobileView: true });
      await validateRadioLayout(questions, defaultMockOptions);

      // Validate that radio is selected
      const selectedRow = screen.getByRole('radiogroup', {
        name: questions[2].Question,
      });

      const selectedRadio = within(selectedRow).getByRole('radio', {
        name: /Ok/i,
      });
      expect(selectedRadio).toBeChecked();
    });

    it('should render error message', async () => {
      await render({
        validationIssues: generateValidations([{ index: 0, message: 'Feltet er påkrevd' }]),
        mobileView: true,
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert', { name: 'Laster innhold' })).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/feltet er påkrevd/i)).toBeInTheDocument();
      });
    });

    it('should render mobile layout with start and end binding', async () => {
      await render({
        mobileView: true,
        likertProps: {
          filter: [
            { key: 'start', value: '1' },
            { key: 'stop', value: '3' },
          ],
        },
      });

      await validateRadioLayout(defaultMockQuestions.slice(1, 3), defaultMockOptions);
    });
  });
});
