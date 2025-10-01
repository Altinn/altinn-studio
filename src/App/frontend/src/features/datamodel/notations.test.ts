import { pointerToDotNotation } from 'src/features/datamodel/notations';

type TestCase = { input: string; output: string };

describe('notations', () => {
  describe('pointerToDotNotation', () => {
    const testCases: TestCase[] = [
      { input: '/path/to/property', output: 'path.to.property' },
      { input: '/path/list/7/property', output: 'path.list[7].property' },
      { input: '/path/list/7/group/nested-list/3/property', output: 'path.list[7].group.nested-list[3].property' },
      { input: '/path/to-dashed/property', output: 'path.to-dashed.property' },

      // https://github.com/Altinn/app-frontend-react/issues/1918
      { input: '/Oppgave/rapporteringsenhet/e-post', output: 'Oppgave.rapporteringsenhet.e-post' },
      {
        input: '/Oppgave/rapporteringsenhet/kontaktperson/epost_1',
        output: 'Oppgave.rapporteringsenhet.kontaktperson.epost_1',
      },
    ];

    test.each(testCases)('pointerToDotNotation($input) returns $output', ({ input, output }) => {
      expect(pointerToDotNotation(input)).toBe(output);
    });
  });
});
