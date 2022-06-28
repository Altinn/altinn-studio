import type { ILayoutState } from "../src/features/form/layout/formLayoutSlice";
import { getUiConfigStateMock } from "./uiConfigStateMock";

export function getFormLayoutStateMock(
  customStates?: Partial<ILayoutState>
): ILayoutState {
  const mockFormLayoutState: ILayoutState = {
    layouts: {
      FormLayout: [
        {
          id: "field1",
          type: "Input",
          dataModelBindings: {
            simpleBinding: "Group.prop1",
          },
          textResourceBindings: {
            title: "Title",
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
        {
          id: "field2",
          type: "Input",
          dataModelBindings: {
            simpleBinding: "Group.prop2",
          },
          textResourceBindings: {
            title: "Title",
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
        {
          id: "field3",
          type: "Input",
          dataModelBindings: {
            simpleBinding: "Group.prop3",
          },
          textResourceBindings: {
            title: "Title",
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
      ],
    },
    error: null,
    uiConfig: getUiConfigStateMock(),
    layoutsets: null,
  };

  return {
    ...mockFormLayoutState,
    ...customStates,
  };
}
