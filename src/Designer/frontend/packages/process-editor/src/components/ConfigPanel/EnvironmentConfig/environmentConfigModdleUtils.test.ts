import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { altinnCustomTasks } from '../../../extensions/altinnCustomTasks';
import {
  fromEFormidlingDataTypesElements,
  fromEnvironmentConfigElements,
  toEFormidlingDataTypesElements,
  toEnvironmentConfigElements,
} from './environmentConfigModdleUtils';

const createModdle = (): Moddle =>
  new BpmnModdle({ altinn: altinnCustomTasks }) as unknown as Moddle;

describe('environment config moddle conversions', () => {
  it('round-trips environment config entries, keeping the raw env attribute', () => {
    const moddle = createModdle();
    const entries = [
      { value: 'global' },
      { env: 'tt02', value: 'staging' },
      { env: 'at21', value: 'unknown' },
    ];

    const elements = toEnvironmentConfigElements(entries, moddle, []);

    expect(elements.map((element) => element.$type)).toEqual([
      'altinn:EnvironmentConfig',
      'altinn:EnvironmentConfig',
      'altinn:EnvironmentConfig',
    ]);
    expect(fromEnvironmentConfigElements(elements)).toEqual(entries);
  });

  it('reads a missing value as an empty string rather than undefined', () => {
    const moddle = createModdle();
    const element = moddle.create('altinn:EnvironmentConfig', { env: 'tt02' }) as ModdleElement;

    expect(fromEnvironmentConfigElements([element])).toEqual([{ env: 'tt02', value: '' }]);
  });

  it('round-trips eFormidling data type lists through the nested dataType elements', () => {
    const moddle = createModdle();
    const entries = [
      { value: ['ref-data-as-pdf', 'model'] },
      { env: 'production', value: ['ref-data-as-pdf'] },
    ];

    const elements = toEFormidlingDataTypesElements(entries, moddle, []);

    expect(elements[0].values.map((value: ModdleElement) => value.$type)).toEqual([
      'altinn:DataType',
      'altinn:DataType',
    ]);
    expect(fromEFormidlingDataTypesElements(elements)).toEqual(entries);
  });

  it('reads a data type element with no id in it as an empty id rather than dropping it', () => {
    const moddle = createModdle();
    const element = moddle.create('altinn:EFormidlingDataTypes', {
      values: [
        moddle.create('altinn:DataType', { dataType: 'model' }),
        moddle.create('altinn:DataType', {}),
      ],
    }) as ModdleElement;

    expect(fromEFormidlingDataTypesElements([element])).toEqual([{ value: ['model', ''] }]);
  });

  it('hands back the element an unchanged entry came from, so nothing it carries is rebuilt away', () => {
    const moddle = createModdle();
    const existingElements = toEnvironmentConfigElements(
      [{ value: 'global' }, { env: 'tt02', value: 'staging' }],
      moddle,
      [],
    );

    const elements = toEnvironmentConfigElements(
      [{ value: 'global' }, { env: 'tt02', value: 'edited' }],
      moddle,
      existingElements,
    );

    // Object identity is the whole mechanism. That it is what keeps an undeclared attribute alive
    // is proved through real XML in `extensions/altinnCustomTasks.test.ts`, where it can fail.
    expect(elements[0]).toBe(existingElements[0]);
    expect(elements[1]).not.toBe(existingElements[1]);
    expect(fromEnvironmentConfigElements(elements)).toEqual([
      { value: 'global' },
      { env: 'tt02', value: 'edited' },
    ]);
  });

  it('reuses a repeated entry only once, so two rows never share one element', () => {
    const moddle = createModdle();
    const existingElements = toEnvironmentConfigElements(
      [{ env: 'tt02', value: 'same' }],
      moddle,
      [],
    );

    const elements = toEnvironmentConfigElements(
      [
        { env: 'tt02', value: 'same' },
        { env: 'tt02', value: 'same' },
      ],
      moddle,
      existingElements,
    );

    expect(elements[0]).toBe(existingElements[0]);
    expect(elements[1]).not.toBe(existingElements[0]);
  });

  it('hands back the data type element an unchanged entry came from', () => {
    const moddle = createModdle();
    const existingElements = toEFormidlingDataTypesElements(
      [{ value: ['model'] }, { env: 'tt02', value: ['ref-data-as-pdf'] }],
      moddle,
      [],
    );

    const elements = toEFormidlingDataTypesElements(
      [{ value: ['model'] }, { env: 'tt02', value: ['ref-data-as-pdf', 'model'] }],
      moddle,
      existingElements,
    );

    expect(elements[0]).toBe(existingElements[0]);
    expect(elements[1]).not.toBe(existingElements[1]);
  });
});
