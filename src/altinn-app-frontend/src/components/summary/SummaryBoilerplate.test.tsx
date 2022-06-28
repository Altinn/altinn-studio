import * as React from "react";
import { screen, render } from "@testing-library/react";

import SummaryBoilerplate from "./SummaryBoilerplate";

describe("SummaryBoilerplate", () => {
  const defaultProps = {
    onChangeClick: () => {
      return;
    },
    changeText: "some text on a button",
    label: <h3>label text</h3>,
  };
  test("should render the boilerplate with the default props", () => {
    render(<SummaryBoilerplate {...defaultProps} />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByRole("button").innerHTML).toContain(
      "some text on a button"
    );
  });

  test("should not render change-button", () => {
    render(
      <SummaryBoilerplate
        {...defaultProps}
        readOnlyComponent
      />
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("should add validation message", () => {
    render(
      <SummaryBoilerplate
        {...defaultProps}
        hasValidationMessages
      />
    );
    expect(screen.queryByTestId("has-validation-message")).not.toBeNull();
  });
});
