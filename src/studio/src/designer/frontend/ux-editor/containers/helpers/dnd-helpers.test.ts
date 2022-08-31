import { getContainerPosition } from './dnd-helpers';
import { XYCoord } from 'react-dnd';
import { ContainerPos } from './dnd-types';

test('getContainerPosition returns correct positions', () => {
  const boundingBox: DOMRect = {
    bottom: 406.6875,
    height: 111.921875,
    left: 353,
    right: 1085,
    top: 294.765625,
    width: 732,
    x: 353,
    y: 294.765625,
    toJSON: () => '',
  };
  const scenarios: [number, string][] = [
    [300, ContainerPos.Top],
    [290, undefined],
    [400, ContainerPos.Bottom],
    [500, undefined],
  ];
  scenarios.forEach((scenario) => {
    const [y, expected] = scenario;
    const xyCord: XYCoord = { x: 500, y };
    const result = getContainerPosition(boundingBox, xyCord);
    expect(result).toBe(expected);
  });
});
