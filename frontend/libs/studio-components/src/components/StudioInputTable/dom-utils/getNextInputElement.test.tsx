import type { ReactElement } from 'react';
import React from 'react';
import type { CellCoords } from '../types/CellCoords';
import { render, screen } from '@testing-library/react';
import { getNextInputElement } from './getNextInputElement';

type TestCase = {
  queryCoords: CellCoords;
  expectedResult: CellCoords;
};

describe('getNextInputElement', () => {
  describe.each(['ArrowDown', 'Enter'])('With %s key', (key) => {
    it('Returns the input element directly below the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const testCases: TestCase[] = [
        { queryCoords: { row: 0, column: 0 }, expectedResult: { row: 1, column: 0 } },
        { queryCoords: { row: 0, column: 1 }, expectedResult: { row: 1, column: 1 } },
        { queryCoords: { row: 0, column: 2 }, expectedResult: { row: 1, column: 2 } },
        { queryCoords: { row: 1, column: 0 }, expectedResult: { row: 2, column: 0 } },
        { queryCoords: { row: 1, column: 1 }, expectedResult: { row: 2, column: 1 } },
        { queryCoords: { row: 1, column: 2 }, expectedResult: { row: 2, column: 2 } },
      ];
      testCases.forEach(({ queryCoords, expectedResult }) => {
        const input = getInputByCoords(queryCoords);
        const result = getNextInputElement(input, key);
        expect(result).toBe(getInputByCoords(expectedResult));
      });
    });

    it('Returns null when there is no input element below the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const input = getInputByCoords({ row: 2, column: 0 });
      const result = getNextInputElement(input, key);
      expect(result).toBeNull();
    });

    it('Returns the input element below the given element when there are empty cells in between', () => {
      render(<DiverseTable />);
      const input = getInputByCoords({ row: 1, column: 1 });
      const expectedResult = getInputByCoords({ row: 4, column: 1 });
      const result = getNextInputElement(input, key);
      expect(result).toBe(expectedResult);
    });

    it('Returns the first input element in the cell below the given element when there are several interactive elements in the cell', () => {
      render(<TableWithSeveralInteractiveElementsPerCell />);
      const input = getInputByCoords({ row: 0, column: 0 });
      const expectedResult = getInputByCoords({ row: 1, column: 0 });
      const result = getNextInputElement(input, key);
      expect(result).toBe(expectedResult);
    });
  });

  describe('With ArrowUp key', () => {
    it('Returns the input element directly above the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const testCases: TestCase[] = [
        { queryCoords: { row: 1, column: 0 }, expectedResult: { row: 0, column: 0 } },
        { queryCoords: { row: 1, column: 1 }, expectedResult: { row: 0, column: 1 } },
        { queryCoords: { row: 1, column: 2 }, expectedResult: { row: 0, column: 2 } },
        { queryCoords: { row: 2, column: 0 }, expectedResult: { row: 1, column: 0 } },
        { queryCoords: { row: 2, column: 1 }, expectedResult: { row: 1, column: 1 } },
        { queryCoords: { row: 2, column: 2 }, expectedResult: { row: 1, column: 2 } },
      ];
      testCases.forEach(({ queryCoords, expectedResult }) => {
        const input = getInputByCoords(queryCoords);
        const result = getNextInputElement(input, 'ArrowUp');
        expect(result).toBe(getInputByCoords(expectedResult));
      });
    });

    it('Returns null when there is no input element above the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const input = getInputByCoords({ row: 0, column: 0 });
      const result = getNextInputElement(input, 'ArrowUp');
      expect(result).toBeNull();
    });

    it('Returns the input element above the given element when there are empty cells in between', () => {
      render(<DiverseTable />);
      const input = getInputByCoords({ row: 4, column: 1 });
      const expectedResult = getInputByCoords({ row: 1, column: 1 });
      const result = getNextInputElement(input, 'ArrowUp');
      expect(result).toBe(expectedResult);
    });

    it('Returns the first input element in the cell above the given element when there are several interactive elements in the cell', () => {
      render(<TableWithSeveralInteractiveElementsPerCell />);
      const input = getInputByCoords({ row: 1, column: 0 });
      const expectedResult = getInputByCoords({ row: 0, column: 0 });
      const result = getNextInputElement(input, 'ArrowUp');
      expect(result).toBe(expectedResult);
    });
  });

  describe('With ArrowRight key', () => {
    it('Returns the input element directly to the right of the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const testCases: TestCase[] = [
        { queryCoords: { row: 0, column: 0 }, expectedResult: { row: 0, column: 1 } },
        { queryCoords: { row: 0, column: 1 }, expectedResult: { row: 0, column: 2 } },
        { queryCoords: { row: 1, column: 0 }, expectedResult: { row: 1, column: 1 } },
        { queryCoords: { row: 1, column: 1 }, expectedResult: { row: 1, column: 2 } },
        { queryCoords: { row: 2, column: 0 }, expectedResult: { row: 2, column: 1 } },
        { queryCoords: { row: 2, column: 1 }, expectedResult: { row: 2, column: 2 } },
      ];
      testCases.forEach(({ queryCoords, expectedResult }) => {
        const input = getInputByCoords(queryCoords);
        const result = getNextInputElement(input, 'ArrowRight');
        expect(result).toBe(getInputByCoords(expectedResult));
      });
    });

    it('Returns null when there is no input element to the right of the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const input = getInputByCoords({ row: 0, column: 2 });
      const result = getNextInputElement(input, 'ArrowRight');
      expect(result).toBeNull();
    });

    it('Returns the input element to the right of the given element when there are empty cells in between', () => {
      render(<DiverseTable />);
      const input = getInputByCoords({ row: 2, column: 0 });
      const expectedResult = getInputByCoords({ row: 2, column: 3 });
      const result = getNextInputElement(input, 'ArrowRight');
      expect(result).toBe(expectedResult);
    });

    it('Returns the first input element in the cell to the right of the given element when there are several interactive elements in the cell', () => {
      render(<TableWithSeveralInteractiveElementsPerCell />);
      const input = getInputByCoords({ row: 0, column: 0 });
      const expectedResult = getInputByCoords({ row: 0, column: 1 });
      const result = getNextInputElement(input, 'ArrowRight');
      expect(result).toBe(expectedResult);
    });
  });

  describe('With ArrowLeft key', () => {
    it('Returns the input element directly to the left of the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const testCases: TestCase[] = [
        { queryCoords: { row: 0, column: 1 }, expectedResult: { row: 0, column: 0 } },
        { queryCoords: { row: 0, column: 2 }, expectedResult: { row: 0, column: 1 } },
        { queryCoords: { row: 1, column: 1 }, expectedResult: { row: 1, column: 0 } },
        { queryCoords: { row: 1, column: 2 }, expectedResult: { row: 1, column: 1 } },
        { queryCoords: { row: 2, column: 1 }, expectedResult: { row: 2, column: 0 } },
        { queryCoords: { row: 2, column: 2 }, expectedResult: { row: 2, column: 1 } },
      ];
      testCases.forEach(({ queryCoords, expectedResult }) => {
        const input = getInputByCoords(queryCoords);
        const result = getNextInputElement(input, 'ArrowLeft');
        expect(result).toBe(getInputByCoords(expectedResult));
      });
    });

    it('Returns null when there is no input element to the left of the given element', () => {
      render(<TableWithTextfieldsOnly />);
      const input = getInputByCoords({ row: 0, column: 0 });
      const result = getNextInputElement(input, 'ArrowLeft');
      expect(result).toBeNull();
    });

    it('Returns the input element to the left of the given element when there are empty cells in between', () => {
      render(<DiverseTable />);
      const input = getInputByCoords({ row: 2, column: 3 });
      const expectedResult = getInputByCoords({ row: 2, column: 0 });
      const result = getNextInputElement(input, 'ArrowLeft');
      expect(result).toBe(expectedResult);
    });

    it('Returns the first input element in the cell to the left of the given element when there are several interactive elements in the cell', () => {
      render(<TableWithSeveralInteractiveElementsPerCell />);
      const input = getInputByCoords({ row: 0, column: 1 });
      const expectedResult = getInputByCoords({ row: 0, column: 0 });
      const result = getNextInputElement(input, 'ArrowLeft');
      expect(result).toBe(expectedResult);
    });
  });

  it('Works with different input elements', () => {
    render(<TableWithDifferentInputElements />);
    const input00 = getInputByCoords({ row: 0, column: 0 });
    const input01 = getInputByCoords({ row: 0, column: 1 });
    const input10 = getInputByCoords({ row: 1, column: 0 });
    const input11 = getInputByCoords({ row: 1, column: 1 });
    expect(getNextInputElement(input00, 'ArrowRight')).toBe(input01);
    expect(getNextInputElement(input01, 'ArrowDown')).toBe(input11);
    expect(getNextInputElement(input11, 'ArrowLeft')).toBe(input10);
    expect(getNextInputElement(input10, 'ArrowUp')).toBe(input00);
  });
});

function TableWithTextfieldsOnly(): ReactElement {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 0 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 1 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 2 })} />
          </td>
        </tr>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 0 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 1 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 2 })} />
          </td>
        </tr>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 2, column: 0 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 2, column: 1 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 2, column: 2 })} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function DiverseTable(): ReactElement {
  return (
    <table>
      <thead>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
          <th>Header 3</th>
          <th>Header 4</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 1 })} />
          </td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 2, column: 0 })} />
          </td>
          <td></td>
          <td></td>
          <td>
            <input data-testid={generateInputId({ row: 2, column: 3 })} />
          </td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td></td>
          <td>
            <input data-testid={generateInputId({ row: 4, column: 1 })} />
          </td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  );
}

function TableWithDifferentInputElements(): ReactElement {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 0 })} type='text' />
          </td>
          <td>
            <textarea data-testid={generateInputId({ row: 0, column: 1 })} />
          </td>
        </tr>
        <tr>
          <td>
            <button data-testid={generateInputId({ row: 1, column: 0 })} />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 1 })} type='checkbox' />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function TableWithSeveralInteractiveElementsPerCell(): ReactElement {
  return (
    <table>
      <tbody>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 0 })} type='text' />
            <button />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 0, column: 1 })} type='text' />
            <button />
          </td>
        </tr>
        <tr>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 0 })} type='text' />
            <button />
          </td>
          <td>
            <input data-testid={generateInputId({ row: 1, column: 1 })} type='text' />
            <button />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function generateInputId(coords: CellCoords): string {
  return `input-${coords.row}-${coords.column}`;
}

function getInputByCoords(coords: CellCoords): HTMLElement {
  return screen.getByTestId(generateInputId(coords));
}
