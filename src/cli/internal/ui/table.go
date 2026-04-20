package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Align controls horizontal cell alignment.
type Align int

const (
	// AlignLeft pads cells on the right.
	AlignLeft Align = iota
	// AlignRight pads cells on the left.
	AlignRight
)

// CellStyle identifies semantic cell styling.
type CellStyle int

const (
	// CellStyleDefault renders text without additional styling.
	CellStyleDefault CellStyle = iota
	// CellStyleDim renders text with the dim terminal color.
	CellStyleDim
	// CellStyleSuccess renders text with the success terminal color.
	CellStyleSuccess
	// CellStyleError renders text with the error terminal color.
	CellStyleError
	// CellStyleWarning renders text with the warning terminal color.
	CellStyleWarning
	// CellStyleInfo renders text with the info terminal color.
	CellStyleInfo
	// CellStyleBold renders text in bold.
	CellStyleBold
)

// Column describes a table column.
type Column struct {
	Header   string
	MinWidth int
	Width    int
	Align    Align
	Style    CellStyle
}

// Cell describes one rendered table cell.
type Cell struct {
	Text  string
	Style CellStyle
}

// Table stores static table rows and renders them after widths are known.
type Table struct {
	columns []Column
	rows    []tableRow
	gaps    []int
	gap     int
	indent  int
}

type tableRow struct {
	text  string
	cells []Cell
	kind  tableRowKind
}

type tableRowKind int

const (
	tableRowData tableRowKind = iota
	tableRowSection
	tableRowSpacer
)

// NewTable creates a table with the given columns.
func NewTable(columns ...Column) *Table {
	return &Table{
		columns: columns,
		rows:    []tableRow{},
		gaps:    nil,
		gap:     2,
		indent:  0,
	}
}

// RenderTable renders a table to stdout.
func (o *Output) RenderTable(table *Table) {
	for _, line := range table.Lines() {
		err := o.write(o.out, line, true)
		if err != nil {
			o.logWriteErr(err)
		}
	}
}

// NewColumn creates a left-aligned column with the given header.
func NewColumn(header string) Column {
	return Column{
		Header:   header,
		MinWidth: 0,
		Width:    0,
		Align:    AlignLeft,
		Style:    CellStyleDefault,
	}
}

// WithMinWidth sets a minimum column width.
func (c Column) WithMinWidth(width int) Column {
	c.MinWidth = width
	return c
}

// WithWidth sets a preferred column width.
func (c Column) WithWidth(width int) Column {
	c.Width = width
	return c
}

// WithAlign sets column alignment.
func (c Column) WithAlign(align Align) Column {
	c.Align = align
	return c
}

// WithStyle sets default styling for cells in this column.
func (c Column) WithStyle(style CellStyle) Column {
	c.Style = style
	return c
}

// Text creates an unstyled cell.
func Text(text string) Cell {
	return Cell{Text: text, Style: CellStyleDefault}
}

// Empty creates an empty cell.
func Empty() Cell {
	return Text("")
}

// Dim creates a dimmed cell.
func Dim(text string) Cell {
	return Cell{Text: text, Style: CellStyleDim}
}

// SuccessText creates a success-styled cell.
func SuccessText(text string) Cell {
	return Cell{Text: text, Style: CellStyleSuccess}
}

// ErrorText creates an error-styled cell.
func ErrorText(text string) Cell {
	return Cell{Text: text, Style: CellStyleError}
}

// Status creates a success or error status icon cell.
func Status(ok bool) Cell {
	if ok {
		return SuccessText("✓")
	}
	return ErrorText("✗")
}

// Indent sets the number of spaces before data rows.
func (t *Table) Indent(indent int) *Table {
	t.indent = max(indent, 0)
	return t
}

// Gap sets the default number of spaces between columns.
func (t *Table) Gap(gap int) *Table {
	t.gap = max(gap, 0)
	return t
}

// Gaps sets per-column gaps. The first value is the gap after column 0.
func (t *Table) Gaps(gaps ...int) *Table {
	t.gaps = gaps
	return t
}

// Row appends one data row.
func (t *Table) Row(cells ...Cell) {
	if len(cells) != len(t.columns) {
		panic("ui.Table.Row: cell count does not match column count")
	}
	t.rows = append(t.rows, tableRow{text: "", cells: cells, kind: tableRowData})
}

// TextRow appends one unstyled data row.
func (t *Table) TextRow(values ...string) {
	cells := make([]Cell, len(values))
	for i, value := range values {
		cells[i] = Text(value)
	}
	t.Row(cells...)
}

// Section appends a section header row.
func (t *Table) Section(title string) {
	t.rows = append(t.rows, tableRow{text: title, cells: nil, kind: tableRowSection})
}

// Spacer appends an empty row.
func (t *Table) Spacer() {
	t.rows = append(t.rows, tableRow{text: "", cells: nil, kind: tableRowSpacer})
}

// Lines renders table lines.
func (t *Table) Lines() []string {
	if t == nil {
		return nil
	}
	if len(t.columns) == 0 {
		return nil
	}

	lines := make([]string, 0, len(t.rows)+1)
	if t.hasHeader() {
		widths := t.columnWidths(t.rows)
		lines = append(lines, t.renderHeader(widths))
		for _, row := range t.rows {
			lines = append(lines, t.renderRow(row, widths)...)
		}
		return lines
	}

	groupStart := 0
	for i, row := range t.rows {
		if row.kind == tableRowData {
			continue
		}
		widths := t.columnWidths(t.rows[groupStart:i])
		for _, groupedRow := range t.rows[groupStart:i] {
			lines = append(lines, t.renderRow(groupedRow, widths)...)
		}
		lines = append(lines, t.renderRow(row, nil)...)
		groupStart = i + 1
	}
	widths := t.columnWidths(t.rows[groupStart:])
	for _, row := range t.rows[groupStart:] {
		lines = append(lines, t.renderRow(row, widths)...)
	}
	return lines
}

func (t *Table) renderRow(row tableRow, widths []int) []string {
	switch row.kind {
	case tableRowData:
		return []string{t.renderDataRow(row.cells, widths)}
	case tableRowSection:
		return []string{renderStyled(row.text, CellStyleBold)}
	case tableRowSpacer:
		return []string{""}
	default:
		return nil
	}
}

func (t *Table) columnWidths(rows []tableRow) []int {
	widths := make([]int, len(t.columns))
	for i, column := range t.columns {
		widths[i] = max(column.MinWidth, column.Width)
		if headerWidth := displayWidth(column.Header); headerWidth > widths[i] {
			widths[i] = headerWidth
		}
	}

	for _, row := range rows {
		if row.kind != tableRowData {
			continue
		}
		for i, cell := range row.cells {
			cellWidth := displayWidth(renderStyled(cell.Text, styleForCell(cell, t.columns[i])))
			if cellWidth > widths[i] {
				widths[i] = cellWidth
			}
		}
	}
	return widths
}

func (t *Table) hasHeader() bool {
	for _, column := range t.columns {
		if column.Header != "" {
			return true
		}
	}
	return false
}

func (t *Table) renderHeader(widths []int) string {
	cells := make([]Cell, len(t.columns))
	for i, column := range t.columns {
		cells[i] = Cell{Text: column.Header, Style: CellStyleDefault}
	}
	return t.renderDataRow(cells, widths)
}

func (t *Table) renderDataRow(cells []Cell, widths []int) string {
	var builder strings.Builder
	if t.indent > 0 {
		builder.WriteString(strings.Repeat(" ", t.indent))
	}

	for i, cell := range cells {
		if i > 0 {
			builder.WriteString(strings.Repeat(" ", t.gapAfter(i-1)))
		}
		column := t.columns[i]
		rendered := renderStyled(cell.Text, styleForCell(cell, column))
		if i == len(cells)-1 && column.Align == AlignLeft {
			builder.WriteString(rendered)
			continue
		}
		builder.WriteString(padCell(rendered, widths[i], column.Align))
	}
	return builder.String()
}

func (t *Table) gapAfter(columnIndex int) int {
	if columnIndex < len(t.gaps) {
		return max(t.gaps[columnIndex], 0)
	}
	return t.gap
}

func styleForCell(cell Cell, column Column) CellStyle {
	if cell.Style != CellStyleDefault {
		return cell.Style
	}
	return column.Style
}

func padCell(text string, width int, align Align) string {
	padding := width - displayWidth(text)
	if padding <= 0 {
		return text
	}
	spaces := strings.Repeat(" ", padding)
	if align == AlignRight {
		return spaces + text
	}
	return text + spaces
}

func renderStyled(text string, style CellStyle) string {
	if !Colors() {
		return text
	}

	switch style {
	case CellStyleDefault:
		return text
	case CellStyleDim:
		return dimStyle().Render(text)
	case CellStyleSuccess:
		return successStyle().Render(text)
	case CellStyleError:
		return errorStyle().Render(text)
	case CellStyleWarning:
		return warningStyle().Render(text)
	case CellStyleInfo:
		return infoStyle().Render(text)
	case CellStyleBold:
		return lipgloss.NewStyle().Bold(true).Render(text)
	default:
		return text
	}
}

func displayWidth(text string) int {
	return lipgloss.Width(text)
}
