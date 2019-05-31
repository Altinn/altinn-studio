import 'jest';
import { renderSelectTextFromResources } from '../../src/utils/render';

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
        id: 'ServiceName',
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
    mockOnChangeFunction = (e: any): void => {
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
      mockPlaceholder,
    );
    expect(typeof render).toBe('object');
    expect(render.props.children[1].props.placeholder).toEqual('Navn');
  });
  it('+++ should render select with default placeholder', () => {
    const render = renderSelectTextFromResources(
      mockLabelText,
      mockOnChangeFunction,
      mockTextResources,
      mockLanguage,
      null,
    );
    expect(typeof render).toBe('object');
    expect(render.props.children[0].props.children).toEqual('Søk etter ledetekst');
    expect(render.props.children[1].props.placeholder).toEqual('Søk etter ledetekst');
  });
});
