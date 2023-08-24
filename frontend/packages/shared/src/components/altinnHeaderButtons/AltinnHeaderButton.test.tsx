import React from "react";
import {
  render as rtlRender,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AltinnHeaderButton,
  AltinnHeaderButtonProps,
} from "./AltinnHeaderButton";
import { textMock } from "../../../../../testing/mocks/i18nMock";

describe("AltinnHeaderbuttons", () => {
  it("should render nothing if action is undefined", () => {
    render({ action: undefined });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("should render the button for the provided action", () => {
    render({
      action: {
        buttonVariant: "filled",
        headerButtonsClasses: undefined,
        menuKey: "menu-1",
        title: "Button1",
        handleClick: jest.fn(),
      },
    });
    expect(
      screen.getByRole("button", { name: textMock("Button1") })
    ).toBeInTheDocument();
  });

  it("should trigger the handleClick function when a button is clicked", async () => {
    const user = userEvent.setup();

    const handleClick = jest.fn();
    render({
      action: {
        buttonVariant: "filled",
        headerButtonsClasses: undefined,
        menuKey: "menu-1",
        title: "Button1",
        handleClick,
      },
    });

    const button = screen.getByRole("button", { name: textMock("Button1") });
    await act(() => user.click(button));
    await waitFor(() => expect(handleClick).toHaveBeenCalledTimes(1));
  });

  it("should render information icon if action is in beta", () => {
    render({
      action: {
        buttonVariant: "filled",
        headerButtonsClasses: undefined,
        menuKey: "menu-1",
        title: "Button1",
        handleClick: jest.fn(),
        inBeta: true,
      },
    });
    expect(
      screen.getByRole("img", { name: "information" })
    ).toBeInTheDocument();
  });

  it("should render popover with beta message when hovering over information icon", async () => {
    const user = userEvent.setup();

    render({
      action: {
        buttonVariant: "filled",
        headerButtonsClasses: undefined,
        menuKey: "menu-1",
        title: "Button1",
        handleClick: jest.fn(),
        inBeta: true,
      },
    });
    const button = screen.getByRole("img", { name: "information" });
    await act(() => user.hover(button));

    await screen.findByText(textMock("top_menu.preview_is_beta_message"));
  });
});

const render = (props?: Partial<AltinnHeaderButtonProps>) => {
  const defaultProps: AltinnHeaderButtonProps = {
    action: {
      buttonVariant: "filled",
      headerButtonsClasses: undefined,
      menuKey: "menu-1",
      title: "Button1",
      handleClick: jest.fn(),
    },
  };
  rtlRender(<AltinnHeaderButton {...defaultProps} {...props} />, {
    wrapper: undefined,
  });
};
