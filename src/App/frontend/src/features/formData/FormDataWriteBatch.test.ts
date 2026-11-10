import { createBatchedFormDataSetter } from 'src/features/formData/FormDataWriteBatch';
import type { FDBatchedValue } from 'src/features/formData/FormDataWriteBatch';

const change = (field: string, newValue: string): FDBatchedValue => ({
  reference: { dataType: 'pets', field },
  newValue,
});

describe('batched form-data writes', () => {
  it('writes many fields once, then starts a fresh batch', async () => {
    const write = vi.fn();
    const setValue = createBatchedFormDataSetter(write);
    const changes = Array.from({ length: 1000 }, (_, i) => change(`Pets[${i}].SpeciesLabel`, 'Ku'));
    changes.forEach(setValue);
    expect(write).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(changes);
    setValue(change('Pets[0].SpeciesLabel', 'Katt'));
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[1][0]).toEqual([change('Pets[0].SpeciesLabel', 'Katt')]);
  });

  it('preserves competing writes in call order, even when the same object is reused', async () => {
    const write = vi.fn();
    const setValue = createBatchedFormDataSetter(write);
    const first = change('Pets[0].SpeciesLabel', 'Ku');
    const second = change('Pets[0].SpeciesLabel', 'Katt');
    setValue(first);
    setValue(second);
    setValue(first);
    await Promise.resolve();
    expect(write).toHaveBeenCalledWith([first, second, first]);
  });

  it('cancels a stale effect write without canceling other effects or its replacement', async () => {
    const write = vi.fn();
    const setValue = createBatchedFormDataSetter(write);
    const cancel = setValue(change('Pets[0].SpeciesLabel', 'Ku'));
    const other = change('Pets[1].SpeciesLabel', 'Hund');
    setValue(other);
    cancel();
    const replacement = change('Pets[0].SpeciesLabel', 'Katt');
    setValue(replacement);
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith([other, replacement]);
  });

  it('does not write when every effect is canceled', async () => {
    const write = vi.fn();
    const setValue = createBatchedFormDataSetter(write);
    const cancel = setValue(change('Pets[0].SpeciesLabel', 'Ku'));
    cancel();
    await Promise.resolve();
    expect(write).not.toHaveBeenCalled();
    const next = change('Pets[0].SpeciesLabel', 'Katt');
    setValue(next);
    await Promise.resolve();
    expect(write).toHaveBeenCalledWith([next]);
  });

  it('does not cancel a newer write when cleanup runs after the previous batch flushed', async () => {
    const write = vi.fn();
    const setValue = createBatchedFormDataSetter(write);
    const cancel = setValue(change('Pets[0].SpeciesLabel', 'Ku'));
    await Promise.resolve();
    const next = change('Pets[0].SpeciesLabel', 'Katt');
    setValue(next);
    cancel();
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[1][0]).toEqual([next]);
  });
});
