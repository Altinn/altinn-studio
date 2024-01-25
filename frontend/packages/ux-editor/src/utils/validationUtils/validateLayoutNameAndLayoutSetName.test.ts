import { validateLayoutNameAndLayoutSetName } from './validateLayoutNameAndLayoutSetName';

const validNames = ['validName', 'validname', 'validName1', 'valid-name'];
const invalidNames = ['invalidName;', '&)(/&%$#', 'invalid name'];

test('that regex validates a valid name', () => {
  validNames.map((name) => {
    const validatedName = validateLayoutNameAndLayoutSetName(name);
    expect(validatedName).toBe(true);
  });
});

test('that regex invalidates an invalid name', () => {
  invalidNames.map((name) => {
    const validatedName = validateLayoutNameAndLayoutSetName(name);
    expect(validatedName).toBe(false);
  });
});
