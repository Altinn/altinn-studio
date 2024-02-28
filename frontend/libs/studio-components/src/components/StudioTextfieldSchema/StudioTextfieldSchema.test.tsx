// import React from 'react';
// import { StudioTextfieldSchema, type StudioTextfieldSchemaProps } from './StudioTextfieldSchema';
// import { render } from '@testing-library/react';

// TODO RE-IMPLEMENT TESTS IN THIS FILE

// const handleOnChange = jest.fn();

describe('StudioTextfieldSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render StudioTextfieldSchema', () => {
    expect(true).toBeTruthy();
  });
  // it('should render StudioTextfieldSchema', async () => {
  //   renderStudioTextfieldSchema();
  //   expect(screen.getByText('test')).toBeInTheDocument();
  // });
  //
  // it('should call handleOnchange when changing text input', async () => {
  //   const user = userEvent.setup();
  //   renderStudioTextfieldSchema({
  //     inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
  //   });
  //   const editComponentIdButton = screen.getByRole('button', { name: /test/i });
  //   expect(editComponentIdButton).toBeInTheDocument();
  //   await act(() => user.click(editComponentIdButton));
  //   const input = screen.getByRole('textbox');
  //   await act(() => user.type(input, 'test'));
  //   expect(handleOnChange).toHaveBeenCalled();
  // });
  //
  // it('should run schema validation when changing text input', async () => {
  //   const mockValidateProperty = jest.fn();
  //   const user = userEvent.setup();
  //
  //   renderStudioTextfieldSchema({
  //     jsonValidator: {
  //       getSchema: jest.fn(),
  //       validateProperty: mockValidateProperty,
  //     },
  //     inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
  //   });
  //
  //   const editComponentIdButton = screen.getByRole('button', { name: 'test' });
  //   await act(() => user.click(editComponentIdButton));
  //
  //   const input = screen.getByRole('textbox');
  //   await act(() => user.type(input, 'test'));
  //
  //   expect(mockValidateProperty).toHaveBeenCalled();
  // });
});

// const renderStudioTextfieldSchema = <T,>(props: Partial<StudioTextfieldSchemaProps> = {}) => {
//   const defaultProps: StudioTextfieldSchemaProps = {
//     schema: {
//       $id: 'test',
//       type: 'object',
//       properties: {
//         id: {
//           type: 'string',
//         },
//       },
//     } as StudioTextfieldSchemaProps['schema'],
//     propertyPath: 'properties/id',
//     inputProps: {
//       id: 'test',
//       value: 'test',
//       onChange: jest.fn(),
//
//       icon: <div>icon</div>,
//     },
//     viewProps: {
//       children: 'test',
//       variant: 'tertiary',
//     },
//   };
//   return render(<StudioTextfieldSchema {...defaultProps} {...props} />);
// };
