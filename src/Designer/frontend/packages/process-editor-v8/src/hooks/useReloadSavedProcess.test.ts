import { renderHook } from '@testing-library/react';
import { useReloadSavedProcess } from './useReloadSavedProcess';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

jest.mock('../contexts/BpmnContext', () => ({ useBpmnContext: jest.fn() }));
jest.mock('../contexts/BpmnApiContext', () => ({ useBpmnApiContext: jest.fn() }));

const savedXml = '<saved></saved>';
const taskId = 'Task_1';
const taskElement = { id: taskId };

const setBpmnDetails = jest.fn();
const select = jest.fn();
const importXML = jest.fn();
const getSavedBpmn = jest.fn();
const isReloadingRef = { current: false };
const modeler = {
  importXML,
  get: (name: string) =>
    name === 'elementRegistry'
      ? { get: (id: string) => (id === taskId ? taskElement : undefined) }
      : { select },
};

describe('useReloadSavedProcess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isReloadingRef.current = false;
    importXML.mockResolvedValue({ warnings: [] });
    getSavedBpmn.mockResolvedValue(savedXml);
    (useBpmnContext as jest.Mock).mockReturnValue({
      modelerRef: { current: modeler },
      setBpmnDetails,
      isReloadingRef,
    });
    (useBpmnApiContext as jest.Mock).mockReturnValue({ getSavedBpmn });
  });

  it('imports the saved process, clears the selection details and selects the given element', async () => {
    await renderUseReloadSavedProcess()(taskId);

    expect(importXML).toHaveBeenCalledWith(savedXml);
    expect(setBpmnDetails).toHaveBeenCalledWith(null);
    expect(select).toHaveBeenCalledWith(taskElement);
  });

  it('marks the editor as reloading only while the saved process is imported', async () => {
    const reloadingDuringFetch: boolean[] = [];
    const reloadingDuringImport: boolean[] = [];
    getSavedBpmn.mockImplementation(async () => {
      reloadingDuringFetch.push(isReloadingRef.current);
      return savedXml;
    });
    importXML.mockImplementation(async () => {
      reloadingDuringImport.push(isReloadingRef.current);
      return { warnings: [] };
    });

    await renderUseReloadSavedProcess()();

    expect(reloadingDuringFetch).toEqual([false]);
    expect(reloadingDuringImport).toEqual([true]);
    expect(isReloadingRef.current).toBe(false);
  });

  it('does not select anything when the element is not in the saved process', async () => {
    await renderUseReloadSavedProcess()('NotInTheProcess');
    expect(select).not.toHaveBeenCalled();
  });

  it('keeps the editor as it is when the saved process cannot be fetched', async () => {
    getSavedBpmn.mockRejectedValue(new Error('Network error'));

    await renderUseReloadSavedProcess()(taskId);

    expect(importXML).not.toHaveBeenCalled();
    expect(setBpmnDetails).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('stops reloading and selects nothing when the import fails', async () => {
    importXML.mockRejectedValue(new Error('Import failed'));

    await renderUseReloadSavedProcess()(taskId);

    expect(isReloadingRef.current).toBe(false);
    expect(select).not.toHaveBeenCalled();
  });
});

const renderUseReloadSavedProcess = () => renderHook(() => useReloadSavedProcess()).result.current;
