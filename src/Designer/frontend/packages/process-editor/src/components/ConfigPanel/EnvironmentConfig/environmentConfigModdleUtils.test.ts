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

describe('environmentConfigModdleUtils', () => {
  it('round-trips environment config entries, keeping the raw env attribute', () => {
    const moddle = createModdle();
    const entries = [
      { value: 'global' },
      { env: 'tt02', value: 'staging' },
      { env: 'at21', value: 'unknown' },
    ];

    const elements = toEnvironmentConfigElements(entries, moddle);

    expect(elements.map((element) => element.$type)).toEqual([
      'altinn:EnvironmentConfig',
      'altinn:EnvironmentConfig',
      'altinn:EnvironmentConfig',
    ]);
    expect(fromEnvironmentConfigElements(elements)).toEqual(entries);
  });

  it('reads a missing value as an empty string', () => {
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

    const elements = toEFormidlingDataTypesElements(entries, moddle);

    expect(elements[0].values.map((value: ModdleElement) => value.$type)).toEqual([
      'altinn:DataType',
      'altinn:DataType',
    ]);
    expect(fromEFormidlingDataTypesElements(elements)).toEqual(entries);
  });

  it('leaves out a data type element with no id in it', () => {
    const moddle = createModdle();
    const element = moddle.create('altinn:EFormidlingDataTypes', {
      values: [
        moddle.create('altinn:DataType', { dataType: 'model' }),
        moddle.create('altinn:DataType', {}),
      ],
    }) as ModdleElement;

    expect(fromEFormidlingDataTypesElements([element])).toEqual([{ value: ['model'] }]);
  });
});
