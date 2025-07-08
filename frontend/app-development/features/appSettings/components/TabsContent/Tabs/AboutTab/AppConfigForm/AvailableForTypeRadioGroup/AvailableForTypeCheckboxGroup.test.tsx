import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AvailableForTypeCheckboxGroup } from './AvailableForTypeCheckboxGroup';
import type { AvailableForTypeCheckboxGroupProps } from './AvailableForTypeCheckboxGroup';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LabelAndValue } from 'app-development/features/appSettings/types/LabelAndValue';
import { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { getAvailableForTypeOptions } from '../../utils/appConfigAvailableForTypeUtils';

describe('AvailableForTypeRadioGroup', () => {
  afterEach(jest.clearAllMocks);

  it('renders the checkbox group heading and tag', () => {
    renderAvailableForTypeCheckboxGroup();

    expect(
      getText(textMock('app_settings.about_tab_available_for_type_field_label')),
    ).toBeInTheDocument();
    expect(
      getText(textMock('app_settings.about_tab_available_for_type_field_description')),
    ).toBeInTheDocument();
    expect(getText(textMock('general.required'))).toBeInTheDocument();
  });

  it('renders all status options', () => {
    renderAvailableForTypeCheckboxGroup();

    const options: LabelAndValue[] = getAvailableForTypeOptions(textMock);
    options.forEach((option: LabelAndValue) => {
      expect(getLabelText(option.label)).toBeInTheDocument();
    });
  });

  it('does not select any option when initialValues is undefined', () => {
    renderAvailableForTypeCheckboxGroup({ initialValues: undefined });
    const options: LabelAndValue[] = getAvailableForTypeOptions(textMock);
    options.forEach((option: LabelAndValue) => {
      expect(getLabelText(option.label)).not.toBeChecked();
    });
  });

  it('preselects the correct option based on initialValues', () => {
    renderAvailableForTypeCheckboxGroup({ initialValues: ['Company', 'PrivatePerson'] });

    expect(screen.getByLabelText(privatePersonText)).toBeChecked();
    expect(screen.getByLabelText(legalEntityEnterpriseText)).not.toBeChecked();
    expect(screen.getByLabelText(companyText)).toBeChecked();
    expect(screen.getByLabelText(bankruptcyEstateText)).not.toBeChecked();
    expect(screen.getByLabelText(selfRegisteredUserText)).not.toBeChecked();
  });

  it('calls onChangeAvailableForType when an option is clicked', async () => {
    const onChangeAvailableForType = jest.fn();
    renderAvailableForTypeCheckboxGroup({ onChangeAvailableForType });

    const user = userEvent.setup();
    await user.click(getLabelText(companyText));

    expect(onChangeAvailableForType).toHaveBeenCalledTimes(1);
    expect(onChangeAvailableForType).toHaveBeenCalledWith(['Company'], []);
  });

  it('renders error message when errors are present', () => {
    renderAvailableForTypeCheckboxGroup({ errors });
    expect(
      getText(textMock('app_settings.about_tab_error_available_for_type')),
    ).toBeInTheDocument();
  });
});

const defaultProps: AvailableForTypeCheckboxGroupProps = {
  initialValues: [],
  onChangeAvailableForType: jest.fn(),
  errors: [],
  id: 'availableForTypeCheckboxGroup',
};

function renderAvailableForTypeCheckboxGroup(
  props: Partial<AvailableForTypeCheckboxGroupProps> = {},
) {
  return render(<AvailableForTypeCheckboxGroup {...defaultProps} {...props} />);
}

const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getLabelText = (name: string): HTMLLabelElement => screen.getByLabelText(name);

const privatePersonText: string = textMock('app_settings.about_tab_available_for_type_private');
const legalEntityEnterpriseText: string = textMock(
  'app_settings.about_tab_available_for_type_legal',
);
const companyText: string = textMock('app_settings.about_tab_available_for_type_company');
const bankruptcyEstateText: string = textMock(
  'app_settings.about_tab_available_for_type_bankruptcy',
);
const selfRegisteredUserText: string = textMock(
  'app_settings.about_tab_available_for_type_self_registered',
);

const error: AppConfigFormError = {
  field: 'status',
  error: textMock('app_settings.about_tab_status_field_error'),
};
const errors: AppConfigFormError[] = [error];
