import { describe, expect, it } from 'vitest';
import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { altinnCustomTasks } from '../../../extensions/altinnCustomTasks';
import {
  fromEnvironmentConfigElements,
  toEnvironmentConfigElements,
} from './environmentConfigModdleUtils';

const createModdle = (): Moddle =>
  new BpmnModdle({ altinn: altinnCustomTasks }) as unknown as Moddle;

describe('environmentConfigModdleUtils', () => {
  it('preserves values and original environment names when reading and writing entries', () => {
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
});
