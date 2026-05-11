import { textMock } from '@studio/testing/mocks/i18nMock';
import { isSaveButtonDisabled, RenderDataModelOptions } from './AddSubformCardUtils';
import { render, screen } from '@testing-library/react';

describe('isSaveButtonDisabled', () => {
  const validationVariants = [
    {
      description: 'data model name is empty',
      subformError: '',
      dataModelError: '',
      newSubform: { subformName: 'fe', dataModelName: '' },
      isPendingNewSubformMutation: false,
      expectedResult: true,
    },
    {
      description: 'subform name is empty',
      subformError: '',
      dataModelError: '',
      newSubform: { subformName: '', dataModelName: 'hei' },
      isPendingNewSubformMutation: false,
      expectedResult: true,
    },
    {
      description: 'both fields are filled and no errors',
      subformError: '',
      dataModelError: '',
      newSubform: { subformName: 'fe', dataModelName: 'hei' },
      isPendingNewSubformMutation: false,
      expectedResult: false,
    },
    {
      description: 'subform error and empty data model name',
      subformError: 'error',
      dataModelError: '',
      newSubform: { subformName: 'fe', dataModelName: '' },
      isPendingNewSubformMutation: false,
      expectedResult: true,
    },
    {
      description: 'both errors',
      subformError: 'error',
      dataModelError: 'error',
      newSubform: { subformName: 'fe', dataModelName: 'hei' },
      isPendingNewSubformMutation: false,
      expectedResult: true,
    },
    {
      description: 'pending mutation',
      subformError: '',
      dataModelError: '',
      newSubform: { subformName: 'fe', dataModelName: 'hei' },
      isPendingNewSubformMutation: true,
      expectedResult: true,
    },
  ];

  it.each(validationVariants)(
    'should return $expectedResult when $description',
    ({ newSubform, subformError, dataModelError, isPendingNewSubformMutation, expectedResult }) => {
      expect(
        isSaveButtonDisabled({
          newSubform,
          subformError,
          dataModelError,
          isPendingNewSubformMutation,
        }),
      ).toBe(expectedResult);
    },
  );
});

describe('RenderDataModelOptions', () => {
  it('should render disabeled message "velg datamodelknytning" when dataModelIds is empty', () => {
    render(RenderDataModelOptions([]));
    expect(
      screen.getByRole('option', { name: textMock('ux_editor.task_card.select_data_model') }),
    ).toBeInTheDocument();
  });

  it('should render options when dataModelIds is provided', () => {
    const dataModelIds = ['model1', 'model2'];
    render(RenderDataModelOptions(dataModelIds));

    expect(screen.getByRole('option', { name: 'model1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'model2' })).toBeInTheDocument();
  });
});
