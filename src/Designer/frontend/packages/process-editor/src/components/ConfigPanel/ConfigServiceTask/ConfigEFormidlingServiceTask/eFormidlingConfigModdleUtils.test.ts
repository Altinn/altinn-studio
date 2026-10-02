import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { altinnCustomTasks } from '../../../../extensions/altinnCustomTasks';
import {
  fromEFormidlingDataTypesElements,
  toEFormidlingDataTypesElements,
} from './eFormidlingConfigModdleUtils';

const createModdle = (): Moddle =>
  new BpmnModdle({ altinn: altinnCustomTasks }) as unknown as Moddle;

describe('eFormidlingConfigModdleUtils', () => {
  it('preserves eFormidling data type lists when reading and writing nested elements', () => {
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

  it('excludes data type elements with no ID', () => {
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
