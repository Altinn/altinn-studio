import React from "react";
import { screen } from "@testing-library/react";
import { getVariant, PanelVariant, Panel } from "./Panel";
import type { IPanelProps } from "./Panel";
import { renderWithProviders } from "src/../testUtils";
import { FormComponentContext } from "src/components";
import type { IFormComponentContext } from "src/components";
import { getInitialStateMock } from "src/../__mocks__/initialStateMock";
import type { IRuntimeState } from "src/types";

describe("Panel", () => {
  it("should show icon when showIcon is true", () => {
    render({ showIcon: true });
    expect(screen.getByTestId("panel-icon-info")).toBeInTheDocument();
  });

  it("should not show icon when showIcon is false", () => {
    render({ showIcon: false });
    expect(screen.queryByTestId("panel-icon-info")).not.toBeInTheDocument();
  });

  describe("getVariant", () => {
    it("should return correctly mapped variant", () => {
      expect(getVariant({ variant: "info" })).toBe(PanelVariant.Info);
      expect(getVariant({ variant: "success" })).toBe(PanelVariant.Success);
      expect(getVariant({ variant: "warning" })).toBe(PanelVariant.Warning);
    });

    it("should return PanelVariant.Info when no variant is passed", () => {
      expect(getVariant()).toBe(PanelVariant.Info);
    });
  });

  describe("FullWidthWrapper", () => {
    it("should render FullWidthWrapper if no grid or baseComponentId is supplied", () => {
      render({ variant: "info" }, {}, { grid: undefined });
      const fullWidthWrapper = screen.queryByTestId("fullWidthWrapper");
      expect(fullWidthWrapper).toBeInTheDocument();
    });

    it("should not render FullWidthWrapper if grid is supplied in context", () => {
      render({ variant: "info" }, {}, { grid: { md: 5 } });
      const fullWidthWrapper = screen.queryByTestId("fullWidthWrapper");
      expect(fullWidthWrapper).not.toBeInTheDocument();
    });

    it("should not render FullWidthWrapper if baseComponentId is supplied in context", () => {
      render({ variant: "info" }, {}, { baseComponentId: "some-id" });
      const fullWidthWrapper = screen.queryByTestId("fullWidthWrapper");
      expect(fullWidthWrapper).not.toBeInTheDocument();
    });
  });
});

const render = (
  props: Partial<IPanelProps> = {},
  suppliedState: Partial<IRuntimeState> = {},
  suppliedContext: Partial<IFormComponentContext> = {}
) => {
  const allProps = {
    title: "Panel Title",
    children: "Panel Content",
    variant: "info",
    showIcon: false,
    showPointer: false,
    ...props,
  };

  renderWithProviders(
    <FormComponentContext.Provider value={suppliedContext}>
      <Panel {...allProps} />
    </FormComponentContext.Provider>,
    {
      preloadedState: {
        ...getInitialStateMock(),
        ...suppliedState,
      },
    }
  );
};
