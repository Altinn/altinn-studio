import { createStore } from 'zustand/index';
import type { InstanceDTO } from 'nextsrc/nextpoc/types/InstanceDTO';
interface InstanceStore {
  instance?: InstanceDTO;
  setInstance: (instance: InstanceDTO) => void;
}
export const instanceStore = createStore<InstanceStore>((set, getState) => ({
  instance: undefined,
  setInstance: (instance: InstanceDTO) => {
    set({
      ...getState(),
      instance,
    });
  },
}));
