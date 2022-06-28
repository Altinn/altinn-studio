import React from "react";
import { screen } from "@testing-library/react";
import { PrintButtonComponent } from "src/components/base/PrintButtonComponent";
import { renderWithProviders } from "../../../testUtils";
import { getInitialStateMock } from "../../../__mocks__/initialStateMock";

const render = (preloaded = {}) => {
  const preloadedState = {
    ...getInitialStateMock(),
    ...preloaded,
  };

  renderWithProviders(<PrintButtonComponent />, {
    preloadedState,
  });
};

describe("PrintButton", () => {
  it("should display the resource binding key if the text resource is not defined", () => {
    render();

    expect(screen.getByText("Print / Lagre PDF")).toBeInTheDocument();
  });

  it("should display the resource if the resource is defined", () => {
    render({
      textResources: {
        resources: [{ id: "general.print_button_text", value: "Skriv ut" }],
      },
    });

    expect(screen.getByText("Skriv ut")).toBeInTheDocument();
  });
});
