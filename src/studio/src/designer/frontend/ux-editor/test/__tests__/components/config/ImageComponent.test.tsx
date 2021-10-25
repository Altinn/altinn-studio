import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import Select from 'react-select';

import { ImageComponent as Component } from '../../../../components/config/ImageComponent';

const language = {
  ux_editor: {
    modal_properties_image_src_value_label: 'Source',
    modal_properties_image_placement_label: 'Placement',
    modal_properties_image_alt_text_label: 'Alt text',
    modal_properties_image_width_label: 'Width',
  },
};

const textResources = [
  { id: 'altTextImg', value: 'Alternative text' },
  { id: 'altTextImg2', value: 'Alternative text 2' },
];

describe('>>> ImageComponent/SourceRow', () => {
  it('should call handleComponentUpdate callback with image src value for nb when image source input is changed', () => {
    const handleUpdate = jest.fn();

    const componentData = {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      textResourceBindings: {},
      type: 'Image',
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    };

    const component = mount(<Component
      component={componentData}
      handleComponentUpdate={handleUpdate}
      language={language}
      textResources={textResources}
    />);

    const input = component.find('#image_nb_src input');

    input.simulate('change', {
      target: {
        value: 'placekitten.com/500/500',
      },
    });

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {
          nb: 'placekitten.com/500/500',
        },
        width: '100%',
        align: 'center',
      },
    });
  });

  it('should call handleComponentUpdate callback with image width value when image width input is changed', () => {
    const handleUpdate = jest.fn();

    const componentData = {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      textResourceBindings: {},
      type: 'Image',
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    };

    const component = mount(<Component
      component={componentData}
      handleComponentUpdate={handleUpdate}
      language={language}
      textResources={textResources}
    />);

    const input = component.find('#image_width input');

    input.simulate('change', {
      target: {
        value: '250px',
      },
    });

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {},
        width: '250px',
        align: 'center',
      },
    });
  });

  it('should call handleComponentUpdate callback with alignment when placement select is changed', () => {
    const handleUpdate = jest.fn();

    const componentData = {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      textResourceBindings: {},
      type: 'Image',
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    };

    const component = mount(<Component
      component={componentData}
      handleComponentUpdate={handleUpdate}
      language={language}
      textResources={textResources}
    />);

    const select = component.find('[data-testid="image-placement-select"]').find(Select);

    select.props().onChange({ value: 'flex-start' });

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {},
        width: '100%',
        align: 'flex-start',
      },
    });

    select.props().onChange();

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {},
        width: '100%',
        align: null,
      },
    });
  });

  it('should call handleComponentUpdate callback with alt text resource when alt text select is changed', () => {
    const handleUpdate = jest.fn();

    const componentData = {
      id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
      textResourceBindings: {
        altTextImg: 'originalAltTest',
      },
      type: 'Image',
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
    };

    const component = mount(<Component
      component={componentData}
      handleComponentUpdate={handleUpdate}
      language={language}
      textResources={textResources}
    />);

    const select = component.find('[data-testid="image-alt-text-select"]').find(Select);

    select.props().onChange({ value: 'altTest' });

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
      textResourceBindings: {
        altTextImg: 'altTest',
      },
    });

    select.props().onChange();

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        src: {},
        width: '100%',
        align: 'center',
      },
      textResourceBindings: {
        altTextImg: null,
      },
    });
  });
});
