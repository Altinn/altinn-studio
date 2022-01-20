import 'jest';
import { mount } from 'enzyme';
import { renderSelectTextFromResources } from '../../../utils/render';

describe('>>> utils/render', () => {
  let mockLabelText: string;
  let mockOnChangeFunction: (e: any, returnValue?: string) => void;
  let mockTextResources: any[];
  let mockLanguage: any;
  let mockPlaceholder: string;
  beforeEach(() => {
    mockLabelText = 'modal_properties_label_helper';
    mockTextResources = [
      {
        id: 'appName',
        value: 'fiskesløying',
      },
      {
        id: '25795.OppgavegiverNavnPreutfyltdatadef25795.Label',
        value: 'Navn',
      },
    ];
    mockLanguage = {
      ux_editor: {
        modal_properties_description_helper: 'Søk etter beskrivelse',
        modal_properties_label_helper: 'Søk etter ledetekst',
      },
    };
    mockOnChangeFunction = (): void => {
      // do someting
    };
    mockPlaceholder = '25795.OppgavegiverNavnPreutfyltdatadef25795.Label';
  });
  it('+++ should render select with placeholder', () => {
    const render = renderSelectTextFromResources(
      mockLabelText,
      mockOnChangeFunction,
      mockTextResources,
      mockLanguage,
      undefined,
      mockPlaceholder,
    );
    expect(typeof render).toBe('object');
    const wrapper = mount(render);
    expect(wrapper.children()
      .last().children().last()
      .props().placeholder).toEqual('Navn');
  });
  it('+++ should render select with default placeholder', () => {
    const render = renderSelectTextFromResources(
      mockLabelText,
      mockOnChangeFunction,
      mockTextResources,
      mockLanguage,
    );
    expect(typeof render).toBe('object');
    const wrapper = mount(render);
    expect(
      wrapper.children()
        .first().children().first()
        .children()
        .text(),
    ).toEqual('Søk etter ledetekst');
    expect(wrapper.children()
      .last().children().last()
      .props().placeholder).toEqual('Søk etter ledetekst');
  });
});
