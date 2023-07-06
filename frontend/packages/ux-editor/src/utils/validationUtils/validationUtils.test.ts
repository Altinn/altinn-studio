import { validate } from './validationUtils';

test('should be validation error when required is empty', () => {
  const { error } = validate({ required: { message: 'Field is required' } }, '');
  expect(error).toBe('Field is required');
});

test('should not be validation error when required is provided with value', () => {
  const { error } = validate({ required: { message: 'Field is required' } }, 'My name');
  expect(error).toBeUndefined();
});

test('should be validation error when valueAsNumber is not a number', () => {
  const { error } = validate({ valueAsNumber: { message: 'Only numbers are allowed' } }, 'Letters');
  expect(error).toBe('Only numbers are allowed');
});

test('should not be validation error when valueAsNumber is a number', () => {
  const { error } = validate({ valueAsNumber: { message: 'Only numbers are allowed' } }, '404');
  expect(error).toBeUndefined();
});

test('valueAsNumber should allow empty string when required is not set', () => {
  const { error } = validate({ valueAsNumber: { message: 'Only numbers are allowed' } }, '');
  expect(error).toBeUndefined();
});

test('valueAsNumber should not allow empty string when required is set', () => {
  const { error } = validate(
    {
      required: { message: 'Field is required' },
      valueAsNumber: { message: 'Only numbers are allowed' },
    },
    ''
  );
  expect(error).toBe('Field is required');
});

test('should be validation error when valueAsURL is not a valid URL', () => {
  const { error } = validate({ valueAsUrl: { message: 'Invalid URL' } }, 'myInvalidURL');
  expect(error).toBe('Invalid URL');
});

test('should not be any validation error when valueAsURL has a valid url', () => {
  const { error } = validate({ valueAsUrl: { message: 'Invalid URL' } }, 'https://mydomain.com');

  expect(error).toBeUndefined();
});
