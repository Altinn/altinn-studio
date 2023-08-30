import { DataSource, ExpressionFunction, SubExpression } from '../types/Expressions';
import { convertSubExpression } from './expressionsUtils';

describe('expressionsUtils', () => {
  describe('convertSubExpression', () => {
    it('converts first part of external subexpression in array format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.value).toBe(extSubExpression[1]);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in array format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = ['component', 'test-comp'];
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Component);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression[1]);
    });
    it('converts first part of external subexpression in string format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.String);
      expect(convertedSubExpression.value).toBe(extSubExpression);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in string format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = 'test-string';
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.String);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression);
    });
    it('converts first part of external subexpression in number format to internal subexpression where dataSource and dataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.value).toBe(extSubExpression);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression in number format to internal subexpression where compDataSource and compDataSourceValue are set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = 1024;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Number);
      expect(convertedSubExpression.comparableValue).toBe(extSubExpression);
    });
    it('converts first part of external subexpression as null to internal subexpression where dataSource is set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = null;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, false);

      expect(convertedSubExpression.dataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.value).toBe(null);
      expect(convertedSubExpression.comparableDataSource).toBe(undefined);
      expect(convertedSubExpression.comparableValue).toBe(undefined);
    });
    it('converts comparable part of external subexpression as null to internal subexpression where compDataSource is set', () => {
      const baseInternalSubExpression: SubExpression = {
        id: 'some-id',
        function: ExpressionFunction.Equals,
      }
      const extSubExpression: any = null;
      const convertedSubExpression: SubExpression = convertSubExpression(baseInternalSubExpression, extSubExpression, true);

      expect(convertedSubExpression.dataSource).toBe(undefined);
      expect(convertedSubExpression.value).toBe(undefined);
      expect(convertedSubExpression.comparableDataSource).toBe(DataSource.Null);
      expect(convertedSubExpression.comparableValue).toBe(null);
    });
  });
  describe('convertInternalExpressionToExternal', () => {
    it('converts internal expression', () => {

    });
    it('converts internal expression of 3 subexpressions to array of 4 elements', () => {

    });
    it('converts internal valid parsed complex expression to arrays', () => {

    });
    it('converts internal un-parsable complex expression to plain string', () => {

    });
  });
});
