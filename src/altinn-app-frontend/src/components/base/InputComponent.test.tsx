import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import type { IComponentProps } from "src/components";
import type { IInputProps } from "./InputComponent";

import { InputComponent } from "./InputComponent";

describe("InputComponent.tsx", () => {
  const mockId = "mock-id";
  const mockFormData = null;
  const mockHandleDataChange = jest.fn();
  const mockIsValid = true;
  const mockReadOnly = false;
  const mockRequired = false;

  it("should correct value with no form data provided", () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);

    expect(inputComponent).toHaveValue("");
  });

  it("should have correct value with specified form data", () => {
    const customProps: Partial<IComponentProps> = {
      formData: { simpleBinding: "it123" },
    };
    renderInputComponent(customProps);
    const inputComponent: any = screen.getByTestId(mockId);

    expect(inputComponent.value).toEqual("it123");
  });

  it("should have correct form data after change", () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);

    fireEvent.change(inputComponent, { target: { value: "it" } });

    expect(inputComponent).toHaveValue("it");
  });

  it("should call supplied dataChanged function after data change", () => {
    const handleDataChange = jest.fn();
    renderInputComponent({ handleDataChange });
    const inputComponent = screen.getByTestId(mockId);

    fireEvent.blur(inputComponent, { target: { value: "it123" } });
    expect(inputComponent).toHaveValue("it123");
    expect(handleDataChange).toHaveBeenCalled();
  });

  it("should render input with formatted number when this is specified", () => {
    renderInputComponent({
      formatting: {
        number: {
          thousandSeparator: true,
          prefix: "$",
        },
      },
      formData: { simpleBinding: "1234" },
    });
    const inputComponent = screen.getByTestId(`${mockId}-formatted-number`);
    expect(inputComponent).toHaveValue();
  });

  it("should show aria-describedby if textResourceBindings.description is present", () => {
    renderInputComponent({
      textResourceBindings: {
        description: "description",
      },
    });

    const inputComponent = screen.getByTestId(mockId);
    expect(inputComponent).toHaveAttribute(
      "aria-describedby",
      "description-mock-id"
    );
  });

  it("should not show aria-describedby if textResourceBindings.description is not present", () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);
    expect(inputComponent).not.toHaveAttribute("aria-describedby");
  });

  function renderInputComponent(props: Partial<IInputProps> = {}) {
    const defaultProps: IInputProps = {
      id: mockId,
      formData: mockFormData,
      handleDataChange: mockHandleDataChange,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
      required: mockRequired,
    } as unknown as IInputProps;

    render(
      <InputComponent
        {...defaultProps}
        {...props}
      />
    );
  }
});
