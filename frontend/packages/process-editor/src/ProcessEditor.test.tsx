import React from "react";
import { render, screen } from "@testing-library/react";
import { ProcessEditor } from "./ProcessEditor";
import { textMock } from "../../../testing/mocks/i18nMock";

describe("ProcessEditor", () => {
  it("should render loading while bpmnXml is undefined", () => {
    render(<ProcessEditor bpmnXml={undefined} onSave={() => {}} />);
    expect(
      screen.getByTitle(textMock("process_editor.loading"))
    ).toBeInTheDocument();
  });

  it('should render "NoBpmnFoundAlert" when bpmnXml is null', () => {
    render(<ProcessEditor bpmnXml={null} onSave={() => {}} />);
    expect(
      screen.getByRole("heading", {
        name: textMock("process_editor.fetch_bpmn_error_title"),
        level: 2,
      })
    ).toBeInTheDocument();
  });

  it('should render "canvas" when bpmnXml is provided and default render is view-mode', () => {
    render(
      <ProcessEditor
        bpmnXml={`<?xml version="1.0" encoding="UTF-8"?></xml>`}
        onSave={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: textMock("process_editor.edit_mode") })
    ).toBeInTheDocument();
  });
});
