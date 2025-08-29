import { FormLayoutSettings } from '@altinn/ux-editor/classes/FormLayoutSettings';
import { formLayoutSettingsMock } from '@altinn/ux-editor/testing/mocks';
import type { ILayoutSettings } from 'app-shared/types/global';

describe('FormLayoutSettings', () => {
  describe('getPdfLayoutName', () => {
    it('Should get pdfLayoutName as undefined from class when not set in object', () => {
      const layoutSettings = setupFormLayoutSettings({
        pages: { ...formLayoutSettingsMock.pages, pdfLayoutName: undefined },
      });
      const pdfLayoutName = layoutSettings.getPdfLayoutName();
      expect(pdfLayoutName).toBeUndefined();
    });

    it('Should get pdfLayoutName as defined from class when set in object', () => {
      const pdfLayoutNameMock = 'pdfLayoutNameMock';
      const layoutSettings = setupFormLayoutSettings({
        pages: { ...formLayoutSettingsMock.pages, pdfLayoutName: pdfLayoutNameMock },
      });
      const pdfLayoutName = layoutSettings.getPdfLayoutName();
      expect(pdfLayoutName).toBe(pdfLayoutNameMock);
    });
  });
  describe('setPdfLayoutName', () => {
    it('Should set pdfLayoutName to new value when updated', () => {
      const pdfLayoutNameMock = 'pdfLayoutNameMock';
      const layoutSettings = setupFormLayoutSettings({
        pages: { ...formLayoutSettingsMock.pages, pdfLayoutName: undefined },
      });
      layoutSettings.setPdfLayoutName(pdfLayoutNameMock);
      expect(layoutSettings.getPdfLayoutName()).toBe(pdfLayoutNameMock);
    });
  });

  describe('deletePageFromOrder', () => {
    it('Should delete page from order in groups', () => {
      const layoutSettings = setupFormLayoutSettings({
        pages: { groups: [{ order: ['side1', 'side2'] }, { order: ['side3', 'side4'] }] },
      });

      layoutSettings.deletePageFromOrder('side4');

      const expectedStructure = {
        pages: { groups: [{ order: ['side1', 'side2'] }, { order: ['side3'] }] },
      };
      expect(layoutSettings.getLayoutSettings()).toEqual(expectedStructure);
    });
  });

  describe('addPageToOrder', () => {
    it('Should add page to order in groups', () => {
      const layoutSettings = setupFormLayoutSettings({
        pages: { groups: [{ order: ['side1', 'side2'] }, { order: ['side3', 'side4'] }] },
      });

      layoutSettings.addPageToOrder('newPage');

      const expectedStructure = {
        pages: {
          groups: [{ order: ['side1', 'side2', 'newPage'] }, { order: ['side3', 'side4'] }],
        },
      };
      expect(layoutSettings.getLayoutSettings()).toEqual(expectedStructure);
    });
  });
});

const setupFormLayoutSettings = ({
  ...props
}: ILayoutSettings = formLayoutSettingsMock): FormLayoutSettings => {
  return new FormLayoutSettings({ ...props });
};
