import type { IDataSources, ITextResource } from "altinn-shared/types";
import type { IFormData } from "src/features/form/data/formDataReducer";
import type { IOptionSource, IRepeatingGroups } from "src/types";
import { getOptionLookupKey, setupSourceOptions } from "./options";

describe("utils > options", () => {
  describe("getOptionLookupKey", () => {
    it("should return id if no mapping is present", () => {
      const result = getOptionLookupKey("mockId");
      const expected = "mockId";
      expect(result).toEqual(expected);
    });

    it("should return stringified object consisting of id and mapping if mapping if present", () => {
      const result = getOptionLookupKey("mockId", {
        someDataField: "someUrlParam",
      });
      const expected =
        '{"id":"mockId","mapping":{"someDataField":"someUrlParam"}}';
      expect(result).toEqual(expected);
    });
  });

  describe("setupSourceOptions", () => {
    it("should setup correct set of options", () => {
      const source: IOptionSource = {
        group: "someGroup",
        label: "dropdown.label",
        value: "someGroup[{0}].fieldUsedAsValue",
      };
      const relevantTextResource: ITextResource = {
        id: "dropdown.label",
        value: "{0}",
        unparsedValue: "{0}",
        variables: [
          {
            key: "someGroup[{0}].fieldUsedAsLabel",
            dataSource: "dataModel.default",
          },
        ],
      };
      const relevantFormData: IFormData = {
        "someGroup[0].fieldUsedAsValue": "Value 1",
        "someGroup[0].fieldUsedAsLabel": "Label 1",
        "someGroup[1].fieldUsedAsValue": "Value 2",
        "someGroup[1].fieldUsedAsLabel": "Label 2",
        "someGroup[2].fieldUsedAsValue": "Value 3",
        "someGroup[2].fieldUsedAsLabel": "Label 3",
      };
      const repeatingGroups: IRepeatingGroups = {
        someGroup: {
          index: 2,
          dataModelBinding: "someGroup",
        },
      };

      const dataSources: IDataSources = {
        dataModel: relevantFormData,
      };

      const options = setupSourceOptions({
        source,
        relevantTextResource,
        relevantFormData,
        repeatingGroups,
        dataSources,
      });

      expect(options.length).toBe(3);

      expect(options[0].label).toBe("Label 1");
      expect(options[0].value).toBe("Value 1");

      expect(options[1].label).toBe("Label 2");
      expect(options[1].value).toBe("Value 2");

      expect(options[2].label).toBe("Label 3");
      expect(options[2].value).toBe("Value 3");
    });
  });
});
