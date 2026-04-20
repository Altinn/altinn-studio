package ui_test

import (
	"bytes"
	"io"
	"slices"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func TestTableLinesAlignsWideCharacters(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	table := ui.NewTable(
		ui.NewColumn("Name"),
		ui.NewColumn("Status"),
	)
	table.TextRow("\u754c", "ok")
	table.TextRow("abcd", "no")

	got := table.Lines()
	want := []string{
		"Name  Status",
		"\u754c    ok",
		"abcd  no",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("Lines() = %#v, want %#v", got, want)
	}
}

func TestTableLinesAlignsANSIEscapedCells(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	table := ui.NewTable(
		ui.NewColumn("Key"),
		ui.NewColumn("Value"),
	)
	table.TextRow("\x1b[31mred\x1b[0m", "1")
	table.TextRow("plain", "22")

	got := table.Lines()
	want := []string{
		"Key    Value",
		"\x1b[31mred\x1b[0m    1",
		"plain  22",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("Lines() = %#v, want %#v", got, want)
	}
}

func TestTableLinesSupportsSectionsSpacersAndCustomGaps(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	table := ui.NewTable(
		ui.NewColumn("").WithWidth(1),
		ui.NewColumn("").WithMinWidth(4),
		ui.NewColumn(""),
	).Indent(2).Gaps(1, 3)
	table.Section("System")
	table.Row(ui.Status(true), ui.Text("OS"), ui.Text("linux"))
	table.Spacer()
	table.Row(ui.Empty(), ui.Text("TTY"), ui.Text("yes"))

	got := table.Lines()
	want := []string{
		"System",
		"  ✓ OS     linux",
		"",
		"    TTY    yes",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("Lines() = %#v, want %#v", got, want)
	}
}

func TestTableLinesUsesSectionLocalWidthsWithoutHeaders(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	table := ui.NewTable(
		ui.NewColumn("").WithWidth(1),
		ui.NewColumn("").WithMinWidth(4),
		ui.NewColumn(""),
	).Indent(2).Gaps(1, 2)
	table.Section("Short")
	table.Row(ui.Empty(), ui.Text("A"), ui.Text("1"))
	table.Spacer()
	table.Section("Long")
	table.Row(ui.Empty(), ui.Text("Very long key"), ui.Text("2"))

	got := table.Lines()
	want := []string{
		"Short",
		"    A     1",
		"",
		"Long",
		"    Very long key  2",
	}
	if !slices.Equal(got, want) {
		t.Fatalf("Lines() = %#v, want %#v", got, want)
	}
}

func TestTableRowPanicsWhenCellCountDoesNotMatchColumns(t *testing.T) {
	table := ui.NewTable(ui.NewColumn(""), ui.NewColumn(""))

	defer func() {
		if recover() == nil {
			t.Fatal("Row() did not panic")
		}
	}()

	table.Row(ui.Text("one"))
}

func TestOutputRenderTableUsesPlatformLineBreak(t *testing.T) {
	t.Setenv("NO_COLOR", "1")

	var out bytes.Buffer
	output := ui.NewOutput(&out, io.Discard, false)
	table := ui.NewTable(ui.NewColumn("Name"))
	table.TextRow("localtest")

	output.RenderTable(table)

	got := out.String()
	want := "Name" + osutil.LineBreak + "localtest" + osutil.LineBreak
	if got != want {
		t.Fatalf("RenderTable() wrote %q, want %q", got, want)
	}
}
