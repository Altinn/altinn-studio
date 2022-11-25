import React from 'react';
import type { ISelectTextFromRecources } from './render';
import { SelectTextFromRecources } from './render';
import { render as rtlRender, screen, within } from '@testing-library/react';

const textResources = [
  {
    id: '25795.OppgavegiverNavnPreutfyltdatadef25795.Label',
    value: 'Navn',
  },
];
const labelTextKey = 'modal_properties_label_helper';
const labelText = 'Søk etter ledetekst';

const render = (props: Partial<ISelectTextFromRecources> = {}) => {
  const allProps = {
    labelText: labelTextKey,
    onChangeFunction: jest.fn(),
    textResources: [],
    language: {
      'ux_editor.modal_properties_description_helper': 'Søk etter beskrivelse',
      [`ux_editor.${labelTextKey}`]: labelText,
    },
    selected: undefined,
    placeholder: undefined,
    description: undefined,
    ...props,
  } as ISelectTextFromRecources;

  return rtlRender(<SelectTextFromRecources {...allProps} />);
};

describe('utils/render', () => {
  describe('SelectTextFromRecources', () => {
    it('should render select with custom placeholder', () => {
      render({ textResources, placeholder: textResources[0].id });

      const labelContainer = screen.getByTestId('SelectTextFromRecources-label');

      expect(screen.getByText(textResources[0].value)).toBeInTheDocument();
      expect(within(labelContainer).getByText(labelText)).toBeInTheDocument();
    });

    it('should render labelText value as placeholder when no placeholder is defined', () => {
      render();

      const labelContainer = screen.getByTestId('SelectTextFromRecources-label');
      const allLabelTexts = screen.getAllByText(labelText);

      expect(allLabelTexts.length).toBe(2);
      expect(within(labelContainer).getByText(labelText)).toBeInTheDocument();
      expect(screen.queryByText(textResources[0].value)).not.toBeInTheDocument();
    });

    it('should render chilren into label container', () => {
      const children = 'Children content';
      render({ children });

      const labelContainer = screen.getByTestId('SelectTextFromRecources-label');

      expect(within(labelContainer).getByText(children)).toBeInTheDocument();
    });

    it('should render description text when description is passed', () => {
      render({ description: 'description text' });

      const descriptionContainer = screen.getByTestId('renderDescription');

      expect(within(descriptionContainer).getByText('description text')).toBeInTheDocument();
    });

    it('should not render description text when description is not passed', () => {
      render({ description: undefined });

      expect(screen.queryByTestId('renderDescription')).not.toBeInTheDocument();
    });
  });
});
