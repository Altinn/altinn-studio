import { updateKey } from 'app-shared/pure/utils';

test('that we adds the key', () => {
  const result = updateKey(
    {
      some: 'obj',
    },
    'new',
    'key'
  );
  expect(result).toStrictEqual({ some: 'obj', new: 'key' });
});
