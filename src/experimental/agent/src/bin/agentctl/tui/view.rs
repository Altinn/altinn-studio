use ratatui::{
    Frame,
    layout::{Constraint, Layout, Margin, Position, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Cell, Clear, List, ListItem, ListState, Padding, Paragraph, Row, Table, TableState, Wrap},
};

use super::MANIFEST_FILE;
use super::app::{
    App, CONFIRM_DELETE_HINTS, CREATE_AGENT_HINTS, CreateField, ForwardField, HELP, HELP_HINTS, HelpSection, Hint,
    Modal, MouseAction, NEW_SESSION_HINTS, PORT_FORWARD_HINTS, Row as TreeRow, RowTarget, RowView, SELECTION_HINTS,
    SessionField, Tone, TreeRowId, View, harness_label,
};

/// Background of the selected row; without color it is drawn reversed instead.
const SELECTION: Color = Color::Rgb(52, 58, 70);
/// Narrowest tree that still shows the detail and age columns.
const WIDE_TREE: u16 = 70;
/// Narrowest terminal that shows the side panel beside the tree.
const SIDE_PANEL: u16 = 110;
/// Narrowest and widest name column of a wide tree.
const NAME_WIDTH: (usize, usize) = (12, 32);
/// Width of every form but create-Agent, whose pickers also show manifest paths.
const FORM_WIDTH: u16 = 64;
const CREATE_AGENT_FORM_WIDTH: u16 = 96;
/// Width of the help overlay: two columns inside its border and padding.
const HELP_WIDTH: u16 = 76;
/// Width of a help column, and of the key labels in it.
const HELP_COLUMN_WIDTH: usize = 36;
const HELP_KEY_WIDTH: usize = 8;
/// Label column shared by every form row.
const FORM_LABEL_WIDTH: usize = 12;
/// A picker's value between its arrows.
const PICKER_VALUE_WIDTH: usize = 18;
/// A picker's arrows, value and position, before its detail.
const PICKER_WIDTH: usize = PICKER_VALUE_WIDTH + 12;
const ERROR_HINTS: [Hint; 2] = [
    Hint::key("esc", "dismiss", crossterm::event::KeyCode::Esc),
    Hint::key("q", "quit", crossterm::event::KeyCode::Char('q')),
];
/// Lines the selection's hints may wrap onto before the footer cuts them short.
const SELECTION_HINT_LINES: usize = 2;
/// Separates hints on a line.
const HINT_SEPARATOR: &str = " · ";
/// Ends a hint line that could not fit every hint.
const HINT_OVERFLOW: &str = "…";

#[derive(Default)]
pub(crate) struct ViewState {
    /// First tree row below the column header, pinned Agent aside.
    tree_offset: usize,
    forwards: ListState,
    /// Draw without color; glyphs and modifiers still tell states apart.
    no_color: bool,
}

impl ViewState {
    /// Honors `NO_COLOR` when it is set to anything but an empty string.
    pub(crate) fn for_environment() -> Self {
        Self {
            no_color: std::env::var_os("NO_COLOR").is_some_and(|value| !value.is_empty()),
            ..Self::default()
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum WheelTarget {
    Tree,
    Forwards,
    Detail,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum HitTarget {
    Row(RowTarget),
    Action(MouseAction),
}

#[derive(Default)]
pub(crate) struct HitMap {
    frame: Rect,
    clicks: Vec<(Rect, HitTarget)>,
    wheels: Vec<(Rect, WheelTarget)>,
}

impl HitMap {
    fn new(frame: Rect) -> Self {
        Self {
            frame,
            ..Self::default()
        }
    }

    fn clear(&mut self) {
        self.clicks.clear();
        self.wheels.clear();
    }

    fn click(&mut self, area: Rect, target: HitTarget) {
        let area = area.intersection(self.frame);
        if !area.is_empty() {
            self.clicks.push((area, target));
        }
    }

    fn wheel(&mut self, area: Rect, target: WheelTarget) {
        let area = area.intersection(self.frame);
        if !area.is_empty() {
            self.wheels.push((area, target));
        }
    }

    pub(crate) fn click_at(&self, column: u16, row: u16) -> Option<HitTarget> {
        let position = Position::new(column, row);
        self.frame.contains(position).then_some(())?;
        self.clicks
            .iter()
            .rev()
            .find_map(|(area, target)| area.contains(position).then(|| target.clone()))
    }

    pub(crate) fn clickable_at(&self, column: u16, row: u16) -> bool {
        self.click_at(column, row).is_some()
    }

    pub(crate) fn wheel_at(&self, column: u16, row: u16) -> Option<WheelTarget> {
        let position = Position::new(column, row);
        self.frame.contains(position).then_some(())?;
        self.wheels
            .iter()
            .rev()
            .find_map(|(area, target)| area.contains(position).then_some(*target))
    }
}

/// Whether a terminal this wide shows the panel beside the tree.
pub(crate) const fn shows_side_panel(width: u16) -> bool {
    width >= SIDE_PANEL
}

pub(crate) fn render(frame: &mut Frame, app: &App, state: &mut ViewState) -> HitMap {
    let mut hit_map = HitMap::new(frame.area());
    let [header, body, footer] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Min(0),
        Constraint::Length(footer_height(app, frame.area().width)),
    ])
    .areas(frame.area());
    render_header(frame, header, app, &mut hit_map);
    if let Some(detail) = &app.detail {
        render_detail(frame, body, detail, &mut hit_map);
    } else if let Some(error) = &app.error {
        render_error(frame, body, error, &mut hit_map);
    } else if app.view == View::Forwards {
        render_forwards(frame, body, app, state, &mut hit_map);
    } else if shows_side_panel(body.width) {
        // The panel keeps its width whatever is selected, so the tree's
        // columns stay put while the selection moves.
        let [tree, panel] = Layout::horizontal([Constraint::Percentage(60), Constraint::Percentage(40)])
            .spacing(1)
            .areas(body);
        render_tree(frame, tree, app, state, &mut hit_map);
        match (&app.selection, &app.transcript) {
            (Some(TreeRowId::Session { .. }), Some(transcript)) => render_transcript(frame, panel, transcript),
            (Some(TreeRowId::Agent(agent)), _) => {
                render_agent_panel(frame, panel, agent, &app.agent_panel_lines(agent));
            }
            _ => frame.render_widget(Block::bordered().border_style(Style::new().fg(Color::DarkGray)), panel),
        }
    } else {
        render_tree(frame, body, app, state, &mut hit_map);
    }
    match &app.modal {
        Some(Modal::Filter | Modal::Prompt(_)) => {
            hit_map.clear();
            render_footer(frame, footer, app, &mut hit_map);
        }
        // A form carries its own hints, so the footer stays empty below it.
        Some(modal) => {
            hit_map.clear();
            render_modal(frame, body, modal, &mut hit_map);
        }
        None => render_footer(frame, footer, app, &mut hit_map),
    }
    if state.no_color {
        let area = frame.area();
        let buffer = frame.buffer_mut();
        for y in area.top()..area.bottom() {
            for x in area.left()..area.right() {
                buffer[(x, y)].set_fg(Color::Reset).set_bg(Color::Reset);
            }
        }
    }
    hit_map
}

fn render_header(frame: &mut Frame, area: Rect, app: &App, hit_map: &mut HitMap) {
    let counts = app.triage_counts();
    let mut needs_you = Style::new().fg(Color::Yellow);
    if counts.needs_you > 0 {
        needs_you = needs_you.add_modifier(Modifier::BOLD);
    }
    let mut spans = vec![
        Span::styled(
            " agentctl ",
            Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED),
        ),
        Span::raw(" "),
    ];
    if let Some(error) = &app.connection_error {
        spans.push(Span::styled(
            format!("reconnecting: {error} · "),
            Style::new().fg(Color::Red),
        ));
    }
    let needs_you = Span::styled(format!("{} need you", counts.needs_you), needs_you);
    let x = area
        .x
        .saturating_add(u16::try_from(Line::from(spans.clone()).width()).unwrap_or(u16::MAX));
    let width = u16::try_from(needs_you.width()).unwrap_or(u16::MAX);
    hit_map.click(
        Rect::new(x, area.y, width, 1),
        HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Tab,
            crossterm::event::KeyModifiers::NONE,
        )),
    );
    spans.push(needs_you);
    // Before the counts, so a narrow header cuts those rather than the outcome
    // of a change, which is gone after a few seconds.
    if let Some((notice, _)) = &app.notice {
        spans.push(Span::styled(format!(" · {notice}"), Style::new().fg(Color::Cyan)));
    }
    for (count, label, color) in [
        (counts.working, "working", Color::Green),
        (counts.starting, "starting", Color::Cyan),
        (counts.idle, "idle", Color::DarkGray),
        (counts.failed, "failed", Color::Red),
        (counts.provisioning, "provisioning", Color::Cyan),
        (counts.archived, "archived", Color::DarkGray),
    ] {
        if count > 0 {
            spans.push(Span::styled(format!(" · {count} {label}"), Style::new().fg(color)));
        }
    }
    if !app.filter.is_empty() {
        spans.push(Span::styled(
            format!(" · filter: {}", app.filter),
            Style::new().fg(Color::Cyan),
        ));
    }
    if app.creating > 0 {
        spans.push(Span::styled(" · creating forward…", Style::new().fg(Color::Cyan)));
    }
    if app.prompting > 0 {
        spans.push(Span::styled(" · sending prompt…", Style::new().fg(Color::Cyan)));
    }
    if app.discovering {
        spans.push(Span::styled(" · scanning manifests…", Style::new().fg(Color::Cyan)));
    }
    frame.render_widget(Line::from(spans), area);
}

fn render_tree(frame: &mut Frame, area: Rect, app: &App, state: &mut ViewState, hit_map: &mut HitMap) {
    let rows = app.render_rows();
    if rows.is_empty() {
        let placeholder = match (app.loaded, app.filter.is_empty()) {
            (false, _) => "loading…",
            (true, true) => "(no agents)",
            (true, false) => "(nothing matches the filter)",
        };
        frame.render_widget(
            Paragraph::new(placeholder).style(Style::new().fg(Color::DarkGray)),
            area,
        );
        return;
    }
    let wide = area.width >= WIDE_TREE;
    let mut header = vec![
        Cell::default(),
        Cell::from("NAME"),
        Cell::from("STATE"),
        Cell::from(Line::from("FOR").right_aligned()),
    ];
    // A wide tree sizes names to fit, within bounds, and gives the rest to the detail.
    let name_width = rows
        .iter()
        .map(|row| name_cell(row).width())
        .max()
        .unwrap_or_default()
        .clamp(NAME_WIDTH.0, NAME_WIDTH.1);
    let mut widths = vec![
        Constraint::Length(1),
        if wide {
            Constraint::Length(u16::try_from(name_width).unwrap_or(u16::MAX))
        } else {
            Constraint::Fill(1)
        },
        Constraint::Length(12),
        Constraint::Length(4),
    ];
    if wide {
        header.extend([Cell::from("DETAIL"), Cell::from(Line::from("AGE").right_aligned())]);
        widths.extend([Constraint::Fill(1), Constraint::Length(4)]);
    }
    // Every column but the detail, and a space between each pair.
    let detail_width = usize::from(area.width).saturating_sub(1 + name_width + 12 + 4 + 4 + 5);
    // Rows fit below the column header.
    let height = usize::from(area.height.saturating_sub(1));
    let (offset, pinned) = tree_viewport(app, state.tree_offset, height);
    state.tree_offset = offset;
    let capacity = height.saturating_sub(usize::from(pinned.is_some()));
    let visible = pinned
        .into_iter()
        .chain(offset..rows.len().min(offset.saturating_add(capacity)))
        .collect::<Vec<_>>();
    let table_rows = visible.iter().map(|&index| {
        let row = tree_row(&rows[index], wide.then_some(detail_width));
        if pinned == Some(index) {
            row.style(Style::new().add_modifier(Modifier::DIM))
        } else {
            row
        }
    });
    let table = Table::new(table_rows, widths)
        .header(Row::new(header).style(Style::new().fg(Color::DarkGray)))
        .row_highlight_style(selection(state));
    let selected = app.selected_index();
    let mut table_state =
        TableState::default().with_selected(visible.iter().position(|index| Some(*index) == selected));
    frame.render_stateful_widget(table, area, &mut table_state);
    let body = Rect::new(
        area.x,
        area.y.saturating_add(1),
        area.width,
        area.height.saturating_sub(1),
    );
    hit_map.wheel(body, WheelTarget::Tree);
    for (line, index) in visible.into_iter().enumerate() {
        let Some(target) = app.tree_id_at(index) else {
            continue;
        };
        let y = body.y.saturating_add(u16::try_from(line).unwrap_or(u16::MAX));
        hit_map.click(
            Rect::new(body.x, y, body.width, 1),
            HitTarget::Row(RowTarget::Tree(target.clone())),
        );
        if let TreeRowId::Agent(agent) = target {
            hit_map.click(
                Rect::new(body.x, y, body.width.min(4), 1),
                HitTarget::Action(MouseAction::FoldTree(agent)),
            );
        }
    }
}

/// Chooses the first row shown so the selection stays in view, and pins the
/// Agent above it when the view starts among that Agent's Sessions.
fn tree_viewport(app: &App, offset: usize, height: usize) -> (usize, Option<usize>) {
    let selected = app.selected_index().unwrap_or_default();
    let mut offset = offset.min(selected).min(app.rows.len().saturating_sub(height));
    loop {
        let pinned = match app.rows.get(offset) {
            Some(TreeRow::Session { group, .. }) => app.rows[..offset]
                .iter()
                .rposition(|row| *row == TreeRow::Agent(*group)),
            _ => None,
        };
        let capacity = height.saturating_sub(usize::from(pinned.is_some())).max(1);
        if selected < offset.saturating_add(capacity) {
            return (offset, pinned);
        }
        offset = selected + 1 - capacity;
    }
}

/// The selected Session's recent turns, wrapped to the panel, the newest at the bottom.
fn render_transcript(frame: &mut Frame, area: Rect, transcript: &super::app::Transcript) {
    let block = Block::bordered()
        .title(format!(" {} · recent turns ", transcript.session.as_str()))
        .border_style(Style::new().fg(Color::DarkGray));
    let inner = block.inner(area);
    let mut lines = crate::format::turn_lines(&transcript.turns);
    if let Some(error) = &transcript.error {
        lines.push(format!("Turns unavailable: {error}"));
    } else if lines.is_empty() {
        lines.push(
            if transcript.loading {
                "Loading…"
            } else {
                "No turns yet."
            }
            .to_owned(),
        );
    }
    let rows = lines
        .iter()
        .flat_map(|line| wrap(line, usize::from(inner.width)))
        .collect::<Vec<_>>();
    let visible = rows[rows.len().saturating_sub(usize::from(inner.height))..]
        .iter()
        .map(|row| {
            let style = if row.starts_with("===") {
                Style::new().fg(Color::DarkGray)
            } else if row.starts_with("[user]") {
                Style::new().fg(Color::Cyan)
            } else {
                Style::new()
            };
            Line::from(Span::styled(row.clone(), style))
        })
        .collect::<Vec<_>>();
    frame.render_widget(Paragraph::new(visible).block(block), area);
}

/// Splits a line into rows of at most `width` cells.
fn wrap(line: &str, width: usize) -> Vec<String> {
    let mut rows = vec![String::new()];
    let mut used = 0;
    for character in line.chars() {
        let cells = Line::from(character.to_string()).width();
        if used + cells > width.max(1) {
            rows.push(String::new());
            used = 0;
        }
        if let Some(row) = rows.last_mut() {
            row.push(character);
        }
        used += cells;
    }
    rows
}

/// A tree row's name cell: Sessions are indented under their Agent.
fn name_cell(row: &RowView) -> Line<'static> {
    let tone = Style::new().fg(tone_color(row.tone));
    let (indent, name) = if row.agent {
        ("", tone.add_modifier(Modifier::BOLD))
    } else {
        ("  ", Style::new())
    };
    Line::from(vec![
        Span::raw(indent),
        Span::styled(row.marker, tone),
        Span::raw(" "),
        Span::styled(row.name.clone(), name),
    ])
}

/// One tree row, with the detail and age columns when the detail has a
/// width. Every state has a glyph as well as a color.
fn tree_row(row: &RowView, detail_width: Option<usize>) -> Row<'static> {
    let tone = Style::new().fg(tone_color(row.tone));
    let mut state = tone;
    if row.attention && !row.agent {
        state = state.add_modifier(Modifier::BOLD);
    }
    let mut cells = vec![
        Cell::from(Span::styled(
            if row.attention { "▐" } else { "" },
            Style::new().fg(Color::Yellow),
        )),
        Cell::from(name_cell(row)),
        Cell::from(Span::styled(row.state, state)),
        Cell::from(Line::from(Span::styled(row.since.clone(), tone)).right_aligned()),
    ];
    if let Some(width) = detail_width {
        let style = if row.agent {
            tone
        } else {
            Style::new().fg(Color::DarkGray)
        };
        let detail = if row.detail_keeps_end {
            tail_ellipsized(&row.detail, width)
        } else {
            row.detail.clone()
        };
        cells.extend([
            Cell::from(Span::styled(detail, style)),
            Cell::from(Line::from(Span::styled(row.age.clone(), Style::new().fg(Color::DarkGray))).right_aligned()),
        ]);
    }
    Row::new(cells)
}

fn render_forwards(frame: &mut Frame, area: Rect, app: &App, state: &mut ViewState, hit_map: &mut HitMap) {
    let block = Block::bordered().title(" port-forwards ");
    let inner = block.inner(area);
    if app.forwards.is_empty() {
        frame.render_widget(
            Paragraph::new("(no port forwards — press f on an agent to create one)")
                .style(Style::new().fg(Color::DarkGray))
                .block(block),
            area,
        );
        return;
    }
    let items = app
        .forwards
        .iter()
        .map(|entry| {
            let mut spans = vec![
                Span::styled("⇄ ", Style::new().fg(Color::Cyan)),
                Span::raw(format!("{} → {}", entry.local, entry.guest_port)),
                Span::styled(format!("  {}", entry.agent), Style::new().fg(Color::DarkGray)),
            ];
            match &entry.status {
                Some(status) => spans.push(Span::styled(format!("  {status}"), Style::new().fg(Color::Red))),
                None => spans.push(Span::styled("  active", Style::new().fg(Color::Green))),
            }
            ListItem::new(Line::from(spans))
        })
        .collect::<Vec<_>>();
    let list = List::new(items).block(block).highlight_style(selection(state));
    state.forwards.select(Some(app.forward_selected));
    frame.render_stateful_widget(list, area, &mut state.forwards);
    hit_map.wheel(inner, WheelTarget::Forwards);
    for visible in 0..usize::from(inner.height) {
        let index = state.forwards.offset().saturating_add(visible);
        let Some(entry) = app.forwards.get(index) else {
            break;
        };
        let y = inner.y.saturating_add(u16::try_from(visible).unwrap_or(u16::MAX));
        hit_map.click(
            Rect::new(inner.x, y, inner.width, 1),
            HitTarget::Row(RowTarget::Forward(entry.id)),
        );
    }
}

/// A detail view, with long lines wrapped to its width so a failure message
/// is read in full.
fn render_detail(frame: &mut Frame, area: Rect, detail: &super::app::Detail, hit_map: &mut HitMap) {
    let block = Block::bordered().title(format!(" {} — q back · ↑/↓ scroll ", detail.title));
    let inner = block.inner(area);
    let rows = wrapped(&detail.lines, inner.width);
    let limit = rows.len().saturating_sub(usize::from(inner.height));
    detail.scroll_limit.set(Some(limit));
    let scroll = detail.scroll.min(limit);
    let visible = rows.into_iter().skip(scroll).map(Line::from).collect::<Vec<_>>();
    frame.render_widget(Paragraph::new(visible).block(block), area);
    hit_map.wheel(inner, WheelTarget::Detail);
}

/// The selected Agent's status beside the tree, wrapped to the panel.
fn render_agent_panel(frame: &mut Frame, area: Rect, agent: &str, lines: &[String]) {
    let block = Block::bordered()
        .title(format!(" {agent} · status "))
        .border_style(Style::new().fg(Color::DarkGray));
    let inner = block.inner(area);
    let rows = wrapped(lines, inner.width)
        .into_iter()
        .map(Line::from)
        .collect::<Vec<_>>();
    frame.render_widget(Paragraph::new(rows).block(block), area);
}

/// Lines split at their line breaks and wrapped to `width` cells.
fn wrapped(lines: &[String], width: u16) -> Vec<String> {
    lines
        .iter()
        .flat_map(|line| line.split('\n'))
        .flat_map(|line| wrap(line, usize::from(width)))
        .collect()
}

fn render_error(frame: &mut Frame, area: Rect, error: &str, hit_map: &mut HitMap) {
    let paragraph = Paragraph::new(error)
        .style(Style::new().fg(Color::Red))
        .wrap(Wrap { trim: false });
    frame.render_widget(paragraph, area);
    let last_error_row = (area.y..area.bottom())
        .rev()
        .find(|&y| (area.x..area.right()).any(|x| !frame.buffer_mut()[(x, y)].symbol().trim().is_empty()))
        .unwrap_or(area.y);
    let hint_y = last_error_row.saturating_add(2);
    if hint_y < area.bottom() {
        let hints = Rect::new(area.x, hint_y, area.width, 1);
        render_hints(frame, hints, &ERROR_HINTS, Color::Red, Color::Red, hit_map, |_| true);
    }
}

/// Footer rows: the contextual hints on as many lines as they need at this
/// width, then the global hints. Below the tree that is the widest selection's
/// hints, so moving the selection or opening a prompt never moves the tree.
fn footer_height(app: &App, width: u16) -> u16 {
    let own = [app.hints()];
    let contextual: &[&[Hint]] = if app.detail.is_some() || app.view == View::Forwards {
        &own
    } else {
        &SELECTION_HINTS
    };
    let lines = contextual
        .iter()
        .map(|hints| hint_lines(hints, width).len())
        .max()
        .unwrap_or(1)
        .clamp(1, SELECTION_HINT_LINES);
    u16::try_from(lines + 1).unwrap_or(u16::MAX)
}

/// Keys that apply wherever the tree is shown, the help first so a line cut
/// short still shows where the rest are.
const fn global_hints(app: &App) -> [Hint; 6] {
    use crossterm::event::KeyCode;
    let archived = if app.show_archived {
        "hide archived"
    } else {
        "show archived"
    };
    [
        Hint::key("?", "help", KeyCode::Char('?')),
        Hint::key("tab", "needs you", KeyCode::Tab),
        Hint::key("/", "filter", KeyCode::Char('/')),
        Hint::key("A", archived, KeyCode::Char('A')),
        Hint::key("F", "forwards", KeyCode::Char('F')),
        Hint::key("q", "quit", KeyCode::Char('q')),
    ]
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App, hit_map: &mut HitMap) {
    let [contextual, global] = Layout::vertical([Constraint::Min(0), Constraint::Length(1)]).areas(area);
    let input = match &app.modal {
        Some(Modal::Filter) => Some(("/".to_owned(), app.filter.as_str(), None)),
        Some(Modal::Prompt(form)) => Some((
            format!("{} › ", form.session.as_str()),
            form.input.as_str(),
            form.error.as_deref(),
        )),
        _ => None,
    };
    if let Some((prompt, text, error)) = input {
        let width = usize::from(global.width).saturating_sub(Line::from(prompt.as_str()).width() + 1);
        frame.render_widget(
            Line::from(vec![
                Span::styled(prompt, Style::new().fg(Color::Cyan)),
                Span::raw(tail_ellipsized(text, width)),
                Span::styled("▏", Style::new().fg(Color::Cyan)),
            ]),
            global,
        );
        match error {
            Some(error) => {
                let line = Rect::new(contextual.x, contextual.bottom().saturating_sub(1), contextual.width, 1);
                frame.render_widget(Span::styled(error.to_owned(), Style::new().fg(Color::Red)), line);
            }
            None => render_hints(
                frame,
                contextual,
                app.hints(),
                Color::Cyan,
                Color::DarkGray,
                hit_map,
                |_| true,
            ),
        }
        return;
    }
    render_hints(
        frame,
        contextual,
        app.hints(),
        Color::Cyan,
        Color::DarkGray,
        hit_map,
        |_| app.error.is_none(),
    );
    // A detail view's own hints replace the tree's, whose keys do not apply there.
    if app.detail.is_some() {
        return;
    }
    render_hints(
        frame,
        global,
        &global_hints(app),
        Color::DarkGray,
        Color::DarkGray,
        hit_map,
        |hint| {
            if app.modal.is_some() || app.detail.is_some() || app.view == View::Forwards {
                false
            } else if app.error.is_some() {
                hint.label == "q"
            } else {
                true
            }
        },
    );
}

/// Draws hints on the bottom lines of `area`, wrapping between hints. Hints
/// that do not fit give way to an ellipsis, so a cut line reads as cut.
fn render_hints(
    frame: &mut Frame,
    area: Rect,
    hints: &[Hint],
    key_color: Color,
    description_color: Color,
    hit_map: &mut HitMap,
    clickable: impl Fn(&Hint) -> bool,
) {
    let mut lines = hint_lines(hints, area.width);
    let overflow = lines.len() > usize::from(area.height);
    lines.truncate(usize::from(area.height));
    if overflow && let Some(last) = lines.last_mut() {
        let reserved = separator_width().saturating_add(text_width(HINT_OVERFLOW));
        while let [kept @ .., _] = *last
            && hints_width(last).saturating_add(reserved) > area.width
        {
            *last = kept;
        }
    }
    let top = area
        .bottom()
        .saturating_sub(u16::try_from(lines.len()).unwrap_or(u16::MAX));
    let last_line = lines.len().saturating_sub(1);
    for (row, (line, y)) in lines.iter().zip(top..).enumerate() {
        let mut spans = Vec::new();
        let mut x = area.x;
        for (index, hint) in line.iter().enumerate() {
            if index > 0 {
                spans.push(Span::styled(HINT_SEPARATOR, Style::new().fg(description_color)));
                x = x.saturating_add(separator_width());
            }
            spans.push(Span::styled(hint.label, Style::new().fg(key_color)));
            spans.push(Span::raw(" "));
            spans.push(Span::styled(hint.description, Style::new().fg(description_color)));
            let width = hint_width(hint);
            if clickable(hint)
                && let Some((code, modifiers)) = hint.key
            {
                hit_map.click(
                    Rect::new(x, y, width.min(area.right().saturating_sub(x)), 1),
                    HitTarget::Action(MouseAction::Key(code, modifiers)),
                );
            }
            x = x.saturating_add(width);
        }
        if overflow && row == last_line {
            if !line.is_empty() {
                spans.push(Span::styled(HINT_SEPARATOR, Style::new().fg(description_color)));
            }
            spans.push(Span::styled(HINT_OVERFLOW, Style::new().fg(description_color)));
        }
        frame.render_widget(Line::from(spans), Rect::new(area.x, y, area.width, 1));
    }
}

/// Splits hints into lines no wider than `width`, keeping each hint whole.
fn hint_lines(hints: &[Hint], width: u16) -> Vec<&[Hint]> {
    let mut lines = Vec::new();
    let mut start = 0;
    for end in 1..=hints.len() {
        if end - start > 1 && hints_width(&hints[start..end]) > width {
            lines.push(&hints[start..end - 1]);
            start = end - 1;
        }
    }
    if start < hints.len() {
        lines.push(&hints[start..]);
    }
    lines
}

fn hints_width(hints: &[Hint]) -> u16 {
    let separators = u16::try_from(hints.len().saturating_sub(1)).unwrap_or(u16::MAX);
    hints
        .iter()
        .map(hint_width)
        .fold(separators.saturating_mul(separator_width()), u16::saturating_add)
}

fn separator_width() -> u16 {
    text_width(HINT_SEPARATOR)
}

fn text_width(text: &str) -> u16 {
    u16::try_from(Line::from(text).width()).unwrap_or(u16::MAX)
}

fn map_hint_targets(area: Rect, hints: &[Hint], hit_map: &mut HitMap) {
    let mut x = area.x;
    for (index, hint) in hints.iter().enumerate() {
        if index > 0 {
            x = x.saturating_add(separator_width());
        }
        let width = hint_width(hint);
        if let Some((code, modifiers)) = hint.key {
            hit_map.click(
                Rect::new(x, area.y, width.min(area.right().saturating_sub(x)), 1),
                HitTarget::Action(MouseAction::Key(code, modifiers)),
            );
        }
        x = x.saturating_add(width);
    }
}

fn hint_width(hint: &Hint) -> u16 {
    u16::try_from(Line::from(format!("{} {}", hint.label, hint.description)).width()).unwrap_or(u16::MAX)
}

fn render_modal(frame: &mut Frame, area: Rect, modal: &Modal, hit_map: &mut HitMap) {
    match modal {
        Modal::ConfirmDelete { agent, sessions } => {
            Form::new(" delete ", Color::Red, &CONFIRM_DELETE_HINTS)
                .row(Line::from(format!("Delete agent {agent}?")))
                .row(note_line(&format!("{sessions} session(s) will be deleted with it.")))
                .render(frame, area, FORM_WIDTH, hit_map);
        }
        Modal::ConfirmDeleteSession { agent, session } => {
            Form::new(" delete ", Color::Red, &CONFIRM_DELETE_HINTS)
                .row(Line::from(format!("Delete session {agent}/{session}?")))
                .row(note_line("Its harness is stopped and the Session is removed."))
                .render(frame, area, FORM_WIDTH, hit_map);
        }
        Modal::NewSession(form) => render_new_session(frame, area, form, hit_map),
        Modal::CreateAgent(form) => render_create_agent(frame, area, form, hit_map),
        Modal::PortForward(form) => render_port_forward(frame, area, form, hit_map),
        Modal::Help => render_help(frame, area, hit_map),
        // Typed in the footer, so the tree and the Session's turns stay in view.
        Modal::Filter | Modal::Prompt(_) => {}
    }
}

/// Every key, grouped by where it applies, in two columns over the current view.
fn render_help(frame: &mut Frame, area: Rect, hit_map: &mut HitMap) {
    let heading = Style::new().fg(Color::Cyan).add_modifier(Modifier::BOLD);
    let label = Style::new().fg(Color::Yellow).add_modifier(Modifier::BOLD);
    let column = |sections: &[HelpSection]| {
        let mut lines = Vec::new();
        for (index, (title, keys)) in sections.iter().enumerate() {
            if index > 0 {
                lines.push(vec![Span::raw("")]);
            }
            lines.push(vec![Span::styled(*title, heading)]);
            for (key, description) in *keys {
                lines.push(vec![
                    Span::styled(format!("{key:>HELP_KEY_WIDTH$}"), label),
                    Span::raw(format!("  {description}")),
                ]);
            }
        }
        lines
    };
    let [left, right] = HELP.map(column);
    let mut form = Form::new(" keys ", Color::Cyan, &HELP_HINTS);
    for index in 0..left.len().max(right.len()) {
        let mut spans = left.get(index).cloned().unwrap_or_default();
        let used = Line::from(spans.clone()).width();
        spans.push(Span::raw(" ".repeat(HELP_COLUMN_WIDTH.saturating_sub(used))));
        spans.extend(right.get(index).cloned().unwrap_or_default());
        form = form.row(Line::from(spans));
    }
    form.render(frame, area, HELP_WIDTH, hit_map);
}

fn render_new_session(frame: &mut Frame, area: Rect, form: &super::app::SessionForm, hit_map: &mut HitMap) {
    let harness = form
        .installation()
        .map_or("", |installation| harness_label(installation.kind));
    let target = Form::new(" new session ", Color::Cyan, &NEW_SESSION_HINTS)
        .row(labeled("Agent", false, text_input(&form.agent, false, "")))
        .row(labeled(
            "Name",
            form.field == SessionField::Name,
            text_input(&form.name, form.field == SessionField::Name, ""),
        ))
        .row(labeled(
            "Model",
            form.field == SessionField::Model,
            text_input(
                &form.model,
                form.field == SessionField::Model,
                &selection_hint(form.model_default()),
            ),
        ))
        .row(labeled(
            "Effort",
            form.field == SessionField::Effort,
            text_input(
                &form.effort,
                form.field == SessionField::Effort,
                &selection_hint(form.effort_default()),
            ),
        ))
        .row(labeled(
            "Harness",
            false,
            picker(harness, false, form.harness, form.harnesses.len(), "", 0),
        ))
        .error(form.error.as_deref())
        .render(frame, area, FORM_WIDTH, hit_map);
    for (row, field) in [
        (1, SessionField::Name),
        (2, SessionField::Model),
        (3, SessionField::Effort),
    ] {
        hit_map.click(
            line_area(target, row),
            HitTarget::Action(MouseAction::FocusSessionField(field)),
        );
    }
    if let Some(last) = form.harnesses.len().checked_sub(1) {
        let previous = form.harness.checked_sub(1).unwrap_or(last);
        let next = if form.harness >= last { 0 } else { form.harness + 1 };
        map_picker_targets(
            line_area(target, 4),
            MouseAction::SelectHarness(previous),
            MouseAction::SelectHarness(next),
            hit_map,
        );
    }
}

/// What an empty selection field resolves to: the manifest default or the harness's own.
fn selection_hint(manifest_default: Option<&str>) -> String {
    manifest_default.map_or_else(
        || "harness default".to_owned(),
        |default| format!("{default} (manifest default)"),
    )
}

fn render_create_agent(frame: &mut Frame, area: Rect, form: &super::app::CreateForm, hit_map: &mut HitMap) {
    let candidate_error = form.candidate().and_then(|candidate| candidate.name.as_ref().err());
    let mut widget = Form::new(" create agent ", Color::Cyan, &CREATE_AGENT_HINTS)
        .error(form.error.as_ref().or(candidate_error).map(String::as_str));
    let Some((agent, candidate)) = form.agent().zip(form.candidate()) else {
        widget
            .row(Line::from("No agent manifests found."))
            .row(note_line(&format!(
                "Start the TUI inside a repository or directory tree containing {MANIFEST_FILE},"
            )))
            .row(note_line("or apply one first: agentctl apply -f"))
            .row(Line::default())
            .render(frame, area, CREATE_AGENT_FORM_WIDTH, hit_map);
        return;
    };
    let detail_width =
        usize::from(CREATE_AGENT_FORM_WIDTH.saturating_sub(4)).saturating_sub(FORM_LABEL_WIDTH + PICKER_WIDTH);
    let manifest_file = candidate.path.file_name().map_or_else(
        || candidate.path.display().to_string(),
        |name| name.to_string_lossy().into_owned(),
    );
    widget = widget
        .row(labeled(
            "Agent",
            form.field == CreateField::Agent,
            picker(
                &agent.label(),
                form.field == CreateField::Agent,
                form.agent,
                form.agents.len(),
                &abbreviate_home(&agent.directory.display().to_string()),
                detail_width,
            ),
        ))
        .row(labeled(
            "Variant",
            form.field == CreateField::Variant,
            picker(
                &form.variant_label().unwrap_or_default(),
                form.field == CreateField::Variant,
                form.variant,
                agent.variants.len(),
                &manifest_file,
                detail_width,
            ),
        ))
        .row(labeled(
            "Name",
            form.field == CreateField::Name,
            text_input(
                &form.name,
                form.field == CreateField::Name,
                form.placeholder().unwrap_or_default(),
            ),
        ))
        .row(labeled(
            "Env file",
            form.field == CreateField::EnvironmentFile,
            text_input(
                &form.env_file,
                form.field == CreateField::EnvironmentFile,
                "default: .env beside manifest",
            ),
        ));
    let target = widget.render(frame, area, CREATE_AGENT_FORM_WIDTH, hit_map);
    for (row, field) in [
        (0, CreateField::Agent),
        (1, CreateField::Variant),
        (2, CreateField::Name),
        (3, CreateField::EnvironmentFile),
    ] {
        hit_map.click(
            line_area(target, row),
            HitTarget::Action(MouseAction::FocusCreateField(field)),
        );
    }
    for (row, field) in [(0, CreateField::Agent), (1, CreateField::Variant)] {
        map_picker_targets(
            line_area(target, row),
            MouseAction::SelectCreate { field, delta: -1 },
            MouseAction::SelectCreate { field, delta: 1 },
            hit_map,
        );
    }
}

fn render_port_forward(frame: &mut Frame, area: Rect, form: &super::app::ForwardForm, hit_map: &mut HitMap) {
    let title = if form.replace.is_some() {
        " edit forward "
    } else {
        " port forward "
    };
    let text = |label, value: &str, field, placeholder| {
        labeled(
            label,
            form.field == field,
            text_input(value, form.field == field, placeholder),
        )
    };
    let target = Form::new(title, Color::Cyan, &PORT_FORWARD_HINTS)
        .row(labeled("Agent", false, text_input(&form.agent, false, "")))
        .row(text("Address", &form.address, ForwardField::Address, "127.0.0.1"))
        .row(text(
            "Local port",
            &form.local,
            ForwardField::LocalPort,
            "same as guest port",
        ))
        .row(text("Guest port", &form.guest, ForwardField::GuestPort, ""))
        .error(form.error.as_deref())
        .render(frame, area, FORM_WIDTH, hit_map);
    for (row, field) in [
        (1, ForwardField::Address),
        (2, ForwardField::LocalPort),
        (3, ForwardField::GuestPort),
    ] {
        hit_map.click(
            line_area(target, row),
            HitTarget::Action(MouseAction::FocusForwardField(field)),
        );
    }
}

/// A modal drawn at a fixed size whatever is typed: one line per row, a line
/// for an error, then the form's key hints. Row `n` is drawn on line
/// `n`, which is where callers put its mouse targets.
struct Form<'a> {
    title: &'a str,
    border: Color,
    hints: &'a [Hint],
    rows: Vec<Line<'static>>,
    error: Line<'static>,
}

impl<'a> Form<'a> {
    fn new(title: &'a str, border: Color, hints: &'a [Hint]) -> Self {
        Self {
            title,
            border,
            hints,
            rows: Vec::new(),
            error: Line::default(),
        }
    }

    fn row(mut self, row: Line<'static>) -> Self {
        self.rows.push(row);
        self
    }

    /// Shows a validation or submission error above the hints.
    fn error(mut self, error: Option<&str>) -> Self {
        self.error = error.map_or_else(Line::default, |error| {
            Line::from(Span::styled(error.to_owned(), Style::new().fg(Color::Red)))
        });
        self
    }

    fn render(self, frame: &mut Frame, area: Rect, width: u16, hit_map: &mut HitMap) -> Rect {
        let hint_row = self.rows.len() + 1;
        let mut lines = self.rows;
        lines.extend([self.error, hint_line(self.hints)]);
        let height = u16::try_from(lines.len()).unwrap_or(u16::MAX).saturating_add(2);
        let target = centered_rect(area, width.min(area.width), height.min(area.height));
        frame.render_widget(Clear, target);
        let block = Block::bordered()
            .title(self.title.to_owned())
            .border_style(Style::new().fg(self.border))
            .padding(Padding::horizontal(1));
        frame.render_widget(Paragraph::new(lines).block(block), target);
        map_hint_targets(line_area(target, hint_row), self.hints, hit_map);
        target
    }
}

/// A form row: the label, highlighted while the row has focus, then its value.
fn labeled(label: &str, focused: bool, value: Vec<Span<'static>>) -> Line<'static> {
    let style = if focused {
        Style::new().fg(Color::Cyan)
    } else {
        Style::new().fg(Color::DarkGray)
    };
    let mut spans = vec![Span::styled(format!("{label:<FORM_LABEL_WIDTH$}"), style)];
    spans.extend(value);
    Line::from(spans)
}

/// A typed value followed by the cursor while focused, indented to line up
/// with picker values. An empty value shows its placeholder in gray with the
/// cursor over its first character, so the cursor sits flush against it.
fn text_input(value: &str, focused: bool, placeholder: &str) -> Vec<Span<'static>> {
    let mut spans = vec![Span::raw("  ")];
    let cursor = Span::styled("▏", Style::new().fg(Color::Cyan));
    if !value.is_empty() {
        spans.push(Span::raw(value.to_owned()));
        spans.extend(focused.then_some(cursor));
        return spans;
    }
    let gray = Style::new().fg(Color::DarkGray);
    let mut placeholder = placeholder.chars();
    match placeholder.next() {
        Some(first) => spans.extend([
            Span::styled(
                first.to_string(),
                if focused {
                    gray.add_modifier(Modifier::REVERSED)
                } else {
                    gray
                },
            ),
            Span::styled(placeholder.collect::<String>(), gray),
        ]),
        None => spans.extend(focused.then_some(cursor)),
    }
    spans
}

/// A value chosen with ←/→: arrows around it, its position, then a detail
/// shortened from the front to `detail_width`.
fn picker(
    value: &str,
    focused: bool,
    selected: usize,
    total: usize,
    detail: &str,
    detail_width: usize,
) -> Vec<Span<'static>> {
    let (arrow, value_style) = if focused {
        (Style::new().fg(Color::Cyan), Style::new().fg(Color::Cyan))
    } else {
        (Style::new().fg(Color::DarkGray), Style::new())
    };
    let position = format!("{}/{}", selected.saturating_add(1), total);
    vec![
        Span::styled("◂ ", arrow),
        Span::styled(fixed_width(value, PICKER_VALUE_WIDTH), value_style),
        Span::styled(" ▸", arrow),
        Span::styled(format!(" {position:>5}  "), Style::new().fg(Color::DarkGray)),
        Span::styled(tail_ellipsized(detail, detail_width), Style::new().fg(Color::DarkGray)),
    ]
}

fn map_picker_targets(line: Rect, previous: MouseAction, next: MouseAction, hit_map: &mut HitMap) {
    let arrows = line
        .x
        .saturating_add(u16::try_from(FORM_LABEL_WIDTH).unwrap_or(u16::MAX));
    let value = u16::try_from(PICKER_VALUE_WIDTH).unwrap_or(u16::MAX);
    hit_map.click(Rect::new(arrows, line.y, 2, 1), HitTarget::Action(previous));
    hit_map.click(
        Rect::new(arrows.saturating_add(2).saturating_add(value), line.y, 2, 1),
        HitTarget::Action(next),
    );
}

fn note_line(note: &str) -> Line<'static> {
    Line::from(Span::styled(note.to_owned(), Style::new().fg(Color::DarkGray)))
}

fn fixed_width(value: &str, width: usize) -> String {
    let mut characters = value.chars();
    let prefix = characters.by_ref().take(width).collect::<String>();
    if characters.next().is_none() {
        format!("{prefix:<width$}")
    } else {
        let mut truncated = prefix.chars().take(width.saturating_sub(1)).collect::<String>();
        truncated.push('…');
        truncated
    }
}

fn tail_ellipsized(value: &str, width: usize) -> String {
    if Line::from(value).width() <= width {
        return value.to_owned();
    }
    if width == 0 {
        return String::new();
    }

    let available = width.saturating_sub(1);
    let mut start = value.len();
    for (index, _) in value.char_indices().rev() {
        if Line::from(&value[index..]).width() > available {
            break;
        }
        start = index;
    }
    format!("…{}", &value[start..])
}

fn abbreviate_home(path: &str) -> String {
    abbreviate(path, std::env::var("HOME").ok().as_deref())
}

fn abbreviate(path: &str, home: Option<&str>) -> String {
    home.filter(|home| !home.is_empty())
        .and_then(|home| {
            let rest = path.strip_prefix(home)?;
            (rest.is_empty() || rest.starts_with('/')).then(|| format!("~{rest}"))
        })
        .unwrap_or_else(|| path.to_owned())
}

fn hint_line(hints: &[Hint]) -> Line<'static> {
    let mut spans = Vec::new();
    for (index, hint) in hints.iter().enumerate() {
        if index > 0 {
            spans.push(Span::styled(" · ", Style::new().fg(Color::DarkGray)));
        }
        spans.push(Span::styled(hint.label, Style::new().fg(Color::Cyan)));
        spans.push(Span::raw(" "));
        spans.push(Span::styled(hint.description, Style::new().fg(Color::DarkGray)));
    }
    Line::from(spans)
}

/// Line `line` of a form's content, inside its border and padding.
fn line_area(popup: Rect, line: usize) -> Rect {
    let inner = popup.inner(Margin::new(2, 1));
    let y = inner.y.saturating_add(u16::try_from(line).unwrap_or(u16::MAX));
    if y >= inner.bottom() {
        Rect::default()
    } else {
        Rect::new(inner.x, y, inner.width, 1)
    }
}

fn centered_rect(area: Rect, width: u16, height: u16) -> Rect {
    let x = area.x + (area.width.saturating_sub(width)) / 2;
    let y = area.y + (area.height.saturating_sub(height)) / 2;
    Rect {
        x,
        y,
        width,
        height: height.min(area.height),
    }
}

const fn selection(state: &ViewState) -> Style {
    if state.no_color {
        Style::new().add_modifier(Modifier::REVERSED)
    } else {
        Style::new().bg(SELECTION)
    }
}

const fn tone_color(tone: Tone) -> Color {
    match tone {
        Tone::Green => Color::Green,
        Tone::Yellow => Color::Yellow,
        Tone::Cyan => Color::Cyan,
        Tone::Gray => Color::DarkGray,
        Tone::Red => Color::Red,
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use ratatui::{Terminal, backend::TestBackend};

    use super::*;

    fn buffer_text(terminal: &Terminal<TestBackend>) -> String {
        let buffer = terminal.backend().buffer();
        let area = buffer.area();
        let mut text = String::new();
        for y in area.top()..area.bottom() {
            for x in area.left()..area.right() {
                text.push_str(buffer[(x, y)].symbol());
            }
            text.push('\n');
        }
        text
    }

    fn draw(terminal: &mut Terminal<TestBackend>, app: &App) -> HitMap {
        let mut state = ViewState::default();
        draw_with_state(terminal, app, &mut state)
    }

    fn draw_with_state(terminal: &mut Terminal<TestBackend>, app: &App, state: &mut ViewState) -> HitMap {
        let mut hit_map = None;
        terminal
            .draw(|frame| hit_map = Some(render(frame, app, state)))
            .expect("test draw");
        hit_map.expect("renderer returns a hit map")
    }

    fn tree_app(count: usize) -> App {
        let agents = (0..count)
            .map(|index| {
                let yaml = format!(
                    "apiVersion: agents.platform/v1alpha1\n\
                     kind: Agent\n\
                     metadata:\n\
                     \x20 name: agent-{index:02}\n\
                     spec:\n\
                     \x20 sandbox:\n\
                     \x20   image:\n\
                     \x20     type: build\n\
                     \x20     context: .\n\
                     \x20     dockerfile: Dockerfile\n\
                     \x20   platform:\n\
                     \x20     os: linux\n\
                     \x20   resources:\n\
                     \x20     cpu: \"1\"\n\
                     \x20     memory: \"1Gi\"\n\
                     \x20     rootFilesystem:\n\
                     \x20       capacity: \"8Gi\"\n\
                     \x20       mode: layered\n\
                     \x20 home:\n\
                     \x20   source: home\n\
                     \x20 harnesses:\n\
                     \x20   - type: claudeCode\n\
                     \x20     version: \"1.0.0\"\n\
                     \x20     auth: mediated\n\
                     \x20 secrets: []\n\
                     \x20 network:\n\
                     \x20   mode: mediated\n\
                     \x20   allow: all\n"
                );
                agent::manifest::decode(yaml.as_bytes()).expect("test manifest")
            })
            .collect();
        let mut app = App::new();
        app.apply_snapshot(agents, Vec::new());
        app
    }

    fn create_modal_geometry(text: &str) -> (String, usize, usize) {
        let top = text
            .lines()
            .position(|line| line.contains("create agent"))
            .expect("create Agent modal top");
        let border = text.lines().nth(top).expect("create Agent modal border").to_owned();
        let bottom = text
            .lines()
            .enumerate()
            .skip(top + 1)
            .find_map(|(row, line)| line.contains('└').then_some(row))
            .expect("create Agent modal bottom");
        (border, top, bottom)
    }

    fn text_column(line: &str, text: &str) -> usize {
        line.split_once(text).expect("text in rendered row").0.chars().count()
    }

    #[test]
    fn frame_shows_header_counts_tree_and_hints() {
        let app = App::new();
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("agentctl"));
        assert!(text.contains("agentctl  0 need you"));
        assert!(text.contains("loading…"));
        assert!(text.contains("A show archived · F forwards · q quit"));
    }

    #[test]
    fn the_footer_wraps_every_selection_hint_at_eighty_columns() {
        let mut app = triage_app();
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");
        let footer = |terminal: &Terminal<TestBackend>| {
            let text = buffer_text(terminal);
            let mut lines = text.lines().rev().take(3).map(str::trim_end).collect::<Vec<_>>();
            lines.reverse();
            lines.into_iter().map(str::to_owned).collect::<Vec<_>>()
        };

        app.selection = Some(TreeRowId::Session {
            agent: "agent-00".into(),
            session: agent::sessions::SessionName::new("main").expect("name"),
        });
        let hit_map = draw(&mut terminal, &app);
        assert_eq!(
            footer(&terminal),
            [
                "enter attach · p prompt · a archive · d delete · s describe · y yaml",
                "n new session · c new agent",
                "? help · tab needs you · / filter · A show archived · F forwards · q quit",
            ]
        );
        assert_eq!(
            hit_map.click_at(2, 10),
            Some(HitTarget::Action(MouseAction::Key(
                crossterm::event::KeyCode::Char('n'),
                crossterm::event::KeyModifiers::NONE,
            ))),
            "a wrapped hint is clicked where it is drawn"
        );

        app.selection = Some(TreeRowId::Agent("agent-00".into()));
        app.show_archived = true;
        draw(&mut terminal, &app);
        assert_eq!(
            footer(&terminal),
            [
                "enter fold · n new session · e exec · f forward · d delete · p provisioning",
                "s describe · y yaml · z all · c new agent",
                "? help · tab needs you · / filter · A hide archived · F forwards · q quit",
            ]
        );

        let mut wide = Terminal::new(TestBackend::new(140, 12)).expect("test terminal");
        draw(&mut wide, &app);
        let text = buffer_text(&wide);
        let lines = text.lines().rev().take(3).collect::<Vec<_>>();
        assert!(lines[1].starts_with("enter fold"), "two footer lines fit:\n{text}");
        assert!(!lines[2].contains("enter"), "{text}");
    }

    #[test]
    fn a_footer_too_narrow_for_its_hints_ends_in_an_ellipsis() {
        let mut app = triage_app();
        app.selection = Some(TreeRowId::Agent("agent-00".into()));
        let mut terminal = Terminal::new(TestBackend::new(40, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let lines = text.lines().rev().take(3).map(str::trim_end).collect::<Vec<_>>();
        assert_eq!(lines[2], "enter fold · n new session · e exec");
        assert_eq!(lines[1], "f forward · d delete · …");
        assert!(lines.iter().all(|line| line.chars().count() <= 40));
    }

    #[test]
    fn the_header_tells_what_an_archive_did_before_its_counts() {
        let mut app = triage_app();
        app.notice = Some(("main archived · A to show".into(), std::time::Instant::now()));
        let mut terminal = Terminal::new(TestBackend::new(50, 10)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let header = text.lines().next().unwrap_or_default();
        assert_eq!(
            header.trim_end(),
            " agentctl  1 need you · main archived · A to show",
            "a narrow header cuts the counts, not the notice"
        );
    }

    #[test]
    fn the_footer_keeps_its_height_below_the_tree_and_fits_other_views() {
        let mut app = triage_app();
        let mut heights = Vec::new();
        for selection in [
            TreeRowId::Agent("agent-00".into()),
            TreeRowId::Session {
                agent: "agent-00".into(),
                session: agent::sessions::SessionName::new("main").expect("name"),
            },
        ] {
            app.selection = Some(selection);
            heights.push(footer_height(&app, 80));
        }
        app.modal = Some(Modal::Filter);
        heights.push(footer_height(&app, 80));
        assert_eq!(heights, [3, 3, 3], "the tree keeps its rows");
        assert_eq!(footer_height(&app, 140), 2, "a wide terminal needs one line per group");

        app.modal = None;
        app.view = View::Forwards;
        assert_eq!(footer_height(&app, 80), 2, "the forwards view sizes for its own keys");
        app.view = View::Tree;
        app.detail = Some(super::super::app::Detail::text("describe".into(), Vec::new()));
        assert_eq!(footer_height(&app, 80), 2, "and so does a detail");
    }

    fn session(agent: &str, name: &str, state: &str) -> agent::sessions::Session {
        let lifecycle = match state {
            "working" | "waitingForInput" => "running",
            other => other,
        };
        serde_json::from_value(serde_json::json!({
            "id": "00000000-0000-0000-0000-000000000001",
            "agentId": "00000000-0000-0000-0000-000000000002",
            "agent": agent,
            "name": name,
            "harness": "claudeCode",
            "modelSelection": {"model": "fable"},
            "createdAt": "2026-08-25T00:00:00Z",
            "status": {"state": state, "lifecycle": {"state": lifecycle}}
        }))
        .expect("test session")
    }

    fn triage_app() -> App {
        let mut app = tree_app(2);
        let agents = std::mem::take(&mut app.agents);
        app.apply_snapshot(
            agents,
            vec![
                session("agent-00", "review", "waitingForInput"),
                session("agent-00", "main", "working"),
            ],
        );
        app
    }

    #[test]
    fn the_tree_aligns_state_columns_and_marks_sessions_that_need_input() {
        let app = triage_app();
        let mut terminal = Terminal::new(TestBackend::new(100, 10)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let lines = text.lines().collect::<Vec<_>>();
        assert!(lines[0].contains("1 need you · 1 working"));
        assert!(lines[1].contains("NAME") && lines[1].contains("DETAIL") && lines[1].contains("AGE"));
        assert!(lines[2].starts_with("▐ ▾ agent-00"), "{}", lines[2]);
        assert!(lines[3].starts_with("    * main"), "{}", lines[3]);
        assert!(lines[4].starts_with("▐   ! review"), "{}", lines[4]);
        let state = text_column(lines[1], "STATE");
        assert_eq!(text_column(lines[3], "Working"), state);
        assert_eq!(text_column(lines[4], "Needs you"), state);
        assert_eq!(
            text_column(lines[4], "Claude Code · fable"),
            text_column(lines[1], "DETAIL")
        );
    }

    fn failing_app() -> App {
        let mut app = triage_app();
        let mut agents = app.agents.clone();
        agents[1].status.conditions.push(agent::Condition {
            kind: agent::Condition::READY.into(),
            status: agent::ConditionStatus::False,
            reason: "SandboxReconcileFailed".into(),
            message: "Sandbox operation failed: resolve Sandbox Image: cache error at /home/user/.agent/cache/tmp/load-4.blob: No space left on device (os error 28)".into(),
            last_transition_time: None,
        });
        agents[1].status.failure = Some(agent::FailureKind::Transient);
        let sessions = app.sessions.clone();
        app.apply_snapshot(agents, sessions);
        app
    }

    #[test]
    fn a_failure_keeps_its_cause_in_view_and_the_side_panel_keeps_the_tree_still() {
        let mut app = failing_app();
        app.side_panel = true;
        app.select_index(3);
        let mut terminal = Terminal::new(TestBackend::new(140, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let lines = text.lines().collect::<Vec<_>>();
        let failed = lines
            .iter()
            .find(|line| line.contains("agent-01") && line.contains("Retrying"))
            .expect("failed Agent row");
        assert!(failed.contains("Retrying"), "{failed}");
        assert!(
            failed.contains("…") && failed.contains("(os error 28)"),
            "the cause at the end stays: {failed}"
        );
        assert!(
            text.contains("agent-01 · status"),
            "the panel shows the selected Agent:\n{text}"
        );
        assert!(text.contains("Failure:    Transient"), "{text}");
        let panel = lines
            .iter()
            .map(|line| line.chars().skip(text_column(lines[1], "AGE") + 5).collect::<String>())
            .collect::<String>();
        assert!(
            panel.contains("(os error 28)"),
            "the panel wraps the whole message:\n{text}"
        );

        let state = text_column(lines[1], "STATE");
        app.select_index(2);
        app.transcript_request().expect("the selected Session's turns");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert_eq!(
            text_column(text.lines().nth(1).expect("column header"), "STATE"),
            state,
            "selecting a Session leaves the columns where they were"
        );
        assert!(text.contains("review · recent turns"), "{text}");
    }

    #[test]
    fn every_view_draws_at_common_widths() {
        fn press(app: &mut App, row: usize, key: char) {
            app.select_index(row);
            app.on_key(crossterm::event::KeyEvent::new(
                crossterm::event::KeyCode::Char(key),
                crossterm::event::KeyModifiers::NONE,
            ));
        }
        type Open = fn(&mut App);
        let views: [(&str, Open); 8] = [
            ("tree", |_| {}),
            ("filter", |app| app.modal = Some(Modal::Filter)),
            ("new session", |app| press(app, 0, 'n')),
            ("forward", |app| press(app, 0, 'f')),
            ("delete", |app| press(app, 0, 'd')),
            ("describe", |app| press(app, 3, 's')),
            ("prompt", |app| press(app, 2, 'p')),
            ("help", |app| press(app, 0, '?')),
        ];
        for width in [60, 80, 110, 160] {
            for (name, open) in views {
                let mut app = failing_app();
                app.side_panel = shows_side_panel(width);
                open(&mut app);
                let mut terminal = Terminal::new(TestBackend::new(width, 16)).expect("test terminal");
                draw(&mut terminal, &app);
                let text = buffer_text(&terminal);
                let lines = text.lines().collect::<Vec<_>>();
                assert!(
                    lines[0].contains("agentctl"),
                    "{name} at {width} keeps the header:\n{text}"
                );
                if name == "describe" {
                    assert!(!text.contains("q quit"), "a detail offers only its own keys:\n{text}");
                }
                assert!(
                    lines.iter().rev().take(2).any(|line| !line.trim().is_empty()) || text.contains('┌'),
                    "{name} at {width} shows its hints:\n{text}"
                );
            }
        }
    }

    #[test]
    fn help_lists_every_key_by_where_it_applies_and_the_footer_offers_it() {
        let mut app = triage_app();
        let mut terminal = Terminal::new(TestBackend::new(80, 24)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(
            text.lines().last().is_some_and(|line| line.starts_with("? help")),
            "the footer offers help first:\n{text}"
        );

        app.modal = Some(Modal::Help);
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        for expected in [
            "keys",
            "Fleet",
            "Selected Agent",
            "Selected Session",
            "follow provisioning",
            "esc close",
        ] {
            assert!(text.contains(expected), "{expected:?} in:\n{text}");
        }
    }

    #[test]
    fn a_detail_scrolls_to_the_end_of_its_wrapped_lines() {
        let mut app = triage_app();
        let lines = (1..=5)
            .map(|line| format!("{}END{line}", "x".repeat(117)))
            .collect::<Vec<_>>();
        app.detail = Some(super::super::app::Detail::text("long".into(), lines));
        let mut terminal = Terminal::new(TestBackend::new(40, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        let press = |app: &mut App, code| {
            app.on_key(crossterm::event::KeyEvent::new(
                code,
                crossterm::event::KeyModifiers::NONE,
            ));
        };
        for _ in 0..30 {
            press(&mut app, crossterm::event::KeyCode::Char('j'));
        }
        draw(&mut terminal, &app);
        assert!(
            buffer_text(&terminal).contains("END5"),
            "the last wrapped row comes into view:\n{}",
            buffer_text(&terminal)
        );
        let bottom = app.detail.as_ref().map(|detail| detail.scroll);
        press(&mut app, crossterm::event::KeyCode::Char('k'));
        assert_eq!(
            app.detail.as_ref().map(|detail| detail.scroll),
            bottom.map(|scroll| scroll - 1),
            "one step up moves at once"
        );
    }

    #[test]
    fn a_narrow_tree_keeps_name_state_and_time_in_state() {
        let app = triage_app();
        let mut terminal = Terminal::new(TestBackend::new(50, 10)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("Needs you"));
        assert!(!text.contains("DETAIL"));
        assert!(!text.contains("Claude Code"));
    }

    #[test]
    fn no_color_draws_without_color_but_keeps_glyphs_and_the_selection() {
        let mut app = triage_app();
        app.select_index(1);
        let mut state = ViewState {
            no_color: true,
            ..ViewState::default()
        };
        let mut terminal = Terminal::new(TestBackend::new(100, 10)).expect("test terminal");
        draw_with_state(&mut terminal, &app, &mut state);
        let buffer = terminal.backend().buffer();
        assert!(
            buffer
                .content()
                .iter()
                .all(|cell| cell.fg == Color::Reset && cell.bg == Color::Reset)
        );
        assert!(
            buffer[(6, 3)].modifier.contains(Modifier::REVERSED),
            "the selected row stays marked"
        );
        assert!(buffer_text(&terminal).contains("! review"));
    }

    #[test]
    fn a_selected_session_shows_its_latest_turns_beside_the_tree() {
        let mut app = triage_app();
        app.side_panel = true;
        app.select_index(2);
        let (agent, session) = app.transcript_request().expect("turns are requested");
        let turns = serde_json::from_value(serde_json::json!([
            {"messages": [{"role": "user", "parts": [{"kind": "text", "text": "first question"}]}]},
            {"messages": [
                {"role": "user", "parts": [{"kind": "text", "text": "update the snapshot?"}]},
                {"role": "assistant", "parts": [
                    {"kind": "toolCall", "name": "Bash"},
                    {"kind": "text", "text": "The snapshot changed as expected. Shall I accept it and rerun the suite?"}
                ]}
            ]}
        ]))
        .expect("test turns");
        app.transcript_loaded(&agent, &session, Ok(turns));
        let mut terminal = Terminal::new(TestBackend::new(120, 9)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("review · recent turns"));
        assert!(text.contains("[assistant] -> Bash"));
        assert!(
            text.contains("rerun the suite?"),
            "the newest line wraps into view:\n{text}"
        );
        assert!(!text.contains("first question"), "older lines give way to newer ones");

        terminal.backend_mut().resize(100, 9);
        draw(&mut terminal, &app);
        assert!(
            !buffer_text(&terminal).contains("recent turns"),
            "a narrow terminal keeps the tree only"
        );
    }

    #[test]
    fn a_prompt_is_typed_in_the_footer_below_the_turns() {
        let mut app = triage_app();
        app.select_index(2);
        for code in [
            crossterm::event::KeyCode::Char('p'),
            crossterm::event::KeyCode::Char('y'),
            crossterm::event::KeyCode::Char('e'),
            crossterm::event::KeyCode::Char('s'),
        ] {
            app.on_key(crossterm::event::KeyEvent::new(
                code,
                crossterm::event::KeyModifiers::NONE,
            ));
        }
        let mut terminal = Terminal::new(TestBackend::new(120, 9)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let footer = text.lines().rev().take(2).collect::<Vec<_>>();
        assert!(footer[0].starts_with("review › yes▏"), "{footer:?}");
        assert!(footer[1].starts_with("enter send · esc cancel"), "{footer:?}");
    }

    #[test]
    fn a_lost_connection_keeps_the_last_reported_tree_visible() {
        let mut app = tree_app(2);
        app.connection_error = Some("connection refused".into());
        let mut terminal = Terminal::new(TestBackend::new(80, 8)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("reconnecting: connection refused"));
        assert!(text.contains("agent-01"));
    }

    #[test]
    fn tree_hit_map_uses_the_rendered_offset_and_updates_after_resize() {
        let mut app = tree_app(10);
        app.select_index(9);
        let mut state = ViewState::default();
        // Three footer lines, as the selection's hints wrap at this width.
        let mut terminal = Terminal::new(TestBackend::new(40, 9)).expect("test terminal");
        let agent = |name: &str| Some(HitTarget::Row(RowTarget::Tree(TreeRowId::Agent(name.into()))));

        let compact = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree_offset, 6);
        assert_eq!(compact.click_at(10, 1), None, "the column header is not a row");
        assert_eq!(compact.click_at(10, 2), agent("agent-06"));
        assert_eq!(compact.click_at(10, 5), agent("agent-09"));
        assert_eq!(compact.click_at(10, 6), None, "footer is not a list row");
        assert_eq!(compact.click_at(40, 2), None, "right edge is out of bounds");

        terminal.backend_mut().resize(40, 13);
        let resized = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree_offset, 2, "a taller terminal shows the rows above");
        assert_eq!(resized.click_at(10, 2), agent("agent-02"));
        assert_eq!(resized.click_at(10, 9), agent("agent-09"));
        assert_eq!(
            resized.click_at(10, 10),
            None,
            "the resized map has no stale row target"
        );
    }

    #[test]
    fn scrolling_into_an_agents_sessions_pins_the_agent_above_them() {
        let mut app = tree_app(1);
        let agents = std::mem::take(&mut app.agents);
        app.apply_snapshot(
            agents,
            (0..8)
                .map(|index| session("agent-00", &format!("s{index}"), "idle"))
                .collect(),
        );
        app.select_index(8);
        let mut state = ViewState::default();
        let mut terminal = Terminal::new(TestBackend::new(80, 9)).expect("test terminal");

        let hit_map = draw_with_state(&mut terminal, &app, &mut state);
        let text = buffer_text(&terminal);
        let lines = text.lines().collect::<Vec<_>>();
        assert!(lines[2].contains("▾ agent-00"), "{}", lines[2]);
        assert!(lines[3].contains("s5") && lines[5].contains("s7"), "{text}");
        assert_eq!(
            hit_map.click_at(10, 2),
            Some(HitTarget::Row(RowTarget::Tree(TreeRowId::Agent("agent-00".into()))))
        );
        assert_eq!(
            terminal.backend().buffer()[(10, 5)].bg,
            SELECTION,
            "the selected Session stays in view below the pinned Agent"
        );
    }

    #[test]
    fn the_filter_is_typed_in_the_footer_and_named_in_the_header() {
        let mut app = triage_app();
        app.on_key(crossterm::event::KeyEvent::new(
            crossterm::event::KeyCode::Char('/'),
            crossterm::event::KeyModifiers::NONE,
        ));
        for character in "rev".chars() {
            app.on_key(crossterm::event::KeyEvent::new(
                crossterm::event::KeyCode::Char(character),
                crossterm::event::KeyModifiers::NONE,
            ));
        }
        let mut terminal = Terminal::new(TestBackend::new(100, 10)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("filter: rev"));
        assert!(text.contains("review") && !text.contains("main"));
        assert!(text.lines().last().is_some_and(|line| line.starts_with("/rev▏")));

        app.filter = "nothing".into();
        app.rebuild();
        draw(&mut terminal, &app);
        assert!(buffer_text(&terminal).contains("(nothing matches the filter)"));
    }

    #[test]
    fn forward_hit_map_excludes_its_border_and_tracks_scrolling() {
        let mut app = App::new();
        app.view = View::Forwards;
        app.forwards = (0..10)
            .map(|id| super::super::app::ForwardEntry {
                id,
                agent: format!("agent-{id}"),
                local: format!("127.0.0.1:{}", 8000 + id),
                guest_port: 80,
                status: None,
            })
            .collect();
        app.forward_selected = 7;
        let mut state = ViewState::default();
        let mut terminal = Terminal::new(TestBackend::new(60, 8)).expect("test terminal");

        let hit_map = draw_with_state(&mut terminal, &app, &mut state);

        assert_eq!(state.forwards.offset(), 5);
        assert_eq!(hit_map.click_at(1, 2), Some(HitTarget::Row(RowTarget::Forward(5))));
        assert_eq!(hit_map.wheel_at(1, 2), Some(WheelTarget::Forwards));
        assert_eq!(hit_map.click_at(0, 2), None, "left border is inert");
        assert_eq!(hit_map.click_at(1, 1), None, "top border is inert");
    }

    #[test]
    fn error_body_hints_are_clickable_where_they_are_rendered() {
        let mut app = App::new();
        app.error = Some("request failed because".into());
        let mut terminal = Terminal::new(TestBackend::new(20, 8)).expect("test terminal");

        let hit_map = draw(&mut terminal, &app);
        let dismiss = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Esc,
            crossterm::event::KeyModifiers::NONE,
        ));
        let quit = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Char('q'),
            crossterm::event::KeyModifiers::NONE,
        ));

        assert_eq!(hit_map.click_at(0, 4), Some(dismiss));
        assert_eq!(hit_map.click_at(14, 4), Some(quit));
        assert_eq!(hit_map.click_at(12, 4), None, "separator is inert");
    }

    #[test]
    fn modal_hit_map_blocks_the_underlying_list_and_exposes_confirmation() {
        let mut app = tree_app(3);
        app.modal = Some(Modal::ConfirmDelete {
            agent: "agent-00".into(),
            sessions: 0,
        });
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");

        let hit_map = draw(&mut terminal, &app);

        assert_eq!(hit_map.click_at(0, 1), None, "modal prevents click-through");
        let confirmation = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Char('y'),
            crossterm::event::KeyModifiers::NONE,
        ));
        let area = hit_map
            .clicks
            .iter()
            .find_map(|(area, target)| (target == &confirmation).then_some(*area))
            .expect("confirmation control");
        assert_eq!(hit_map.click_at(area.x, area.y), Some(confirmation));
    }

    #[test]
    fn modal_hit_maps_expose_form_fields_and_choices() {
        let mut app = tree_app(1);
        app.on_key(crossterm::event::KeyEvent::new(
            crossterm::event::KeyCode::Char('n'),
            crossterm::event::KeyModifiers::NONE,
        ));
        let mut terminal = Terminal::new(TestBackend::new(100, 16)).expect("test terminal");

        let session = draw(&mut terminal, &app);
        assert!(
            session.clicks.iter().any(|(_, target)| {
                target == &HitTarget::Action(MouseAction::FocusSessionField(SessionField::Model))
            })
        );
        assert!(
            session
                .clicks
                .iter()
                .any(|(_, target)| { target == &HitTarget::Action(MouseAction::SelectHarness(0)) })
        );

        app.modal = Some(Modal::PortForward(super::super::app::ForwardForm {
            agent: "agent-00".into(),
            address: "127.0.0.1".into(),
            local: String::new(),
            guest: "8080".into(),
            field: ForwardField::GuestPort,
            error: None,
            replace: None,
        }));
        let forward = draw(&mut terminal, &app);
        assert!(forward.clicks.iter().any(|(_, target)| {
            target == &HitTarget::Action(MouseAction::FocusForwardField(ForwardField::Address))
        }));
        assert!(forward.clicks.iter().any(|(_, target)| {
            target
                == &HitTarget::Action(MouseAction::Key(
                    crossterm::event::KeyCode::Enter,
                    crossterm::event::KeyModifiers::NONE,
                ))
        }));
        assert!(forward.clicks.iter().any(|(_, target)| {
            target
                == &HitTarget::Action(MouseAction::Key(
                    crossterm::event::KeyCode::Tab,
                    crossterm::event::KeyModifiers::NONE,
                ))
        }));
    }

    fn modal_border(terminal: &Terminal<TestBackend>) -> Vec<(usize, usize)> {
        buffer_text(terminal)
            .lines()
            .enumerate()
            .filter_map(|(row, line)| line.find('┌').or_else(|| line.find('└')).map(|column| (row, column)))
            .collect()
    }

    #[test]
    fn forms_keep_their_size_when_an_error_appears_and_leave_the_footer_empty() {
        let mut app = tree_app(1);
        app.on_key(crossterm::event::KeyEvent::new(
            crossterm::event::KeyCode::Char('n'),
            crossterm::event::KeyModifiers::NONE,
        ));
        let mut terminal = Terminal::new(TestBackend::new(100, 16)).expect("test terminal");
        draw(&mut terminal, &app);
        let valid = modal_border(&terminal);
        let footer = buffer_text(&terminal).lines().rev().take(2).collect::<String>();
        assert!(footer.trim().is_empty(), "form hints are not repeated in the footer");

        if let Some(Modal::NewSession(form)) = &mut app.modal {
            form.name = "a-much-longer-session-name-than-before".into();
            form.error = Some("session name is invalid".into());
        }
        draw(&mut terminal, &app);
        assert!(buffer_text(&terminal).contains("session name is invalid"));
        assert_eq!(modal_border(&terminal), valid);
    }

    #[test]
    fn create_agent_modal_shows_the_picker_and_placeholder_name() {
        use super::super::app::{CreateField, CreateForm, ManifestCandidate};

        let mut app = App::new();
        app.modal = Some(Modal::CreateAgent(CreateForm::new(
            vec![
                ManifestCandidate::new(std::path::PathBuf::from("/sources/full/agent.yaml"), Ok("full".into())),
                ManifestCandidate::new(
                    std::path::PathBuf::from("/sources/full/agent.nested.yaml"),
                    Ok("full-nested".into()),
                ),
                ManifestCandidate::new(
                    std::path::PathBuf::from("/sources/broken/agent.yaml"),
                    Err("manifest cannot be decoded".into()),
                ),
            ],
            None,
        )));
        let mut terminal = Terminal::new(TestBackend::new(100, 16)).expect("test terminal");
        let hit_map = draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("create agent"));
        assert!(text.contains("Agent       ◂ full"));
        assert!(text.contains("Variant     ◂ default"));
        assert!(text.contains("Name          full"));
        assert!(text.contains("Env file      default: .env beside manifest"));
        assert!(text.contains("enter create · tab/↑/↓ field · ←/→ select · esc cancel"));
        let initial_geometry = create_modal_geometry(&text);
        let agent_line = text.lines().find(|line| line.contains("│ Agent")).expect("Agent row");
        let variant_line = text
            .lines()
            .find(|line| line.contains("│ Variant"))
            .expect("Variant row");
        let name_line = text.lines().find(|line| line.contains("│ Name")).expect("Name row");
        let env_line = text
            .lines()
            .find(|line| line.contains("│ Env file"))
            .expect("environment row");
        assert_eq!(text_column(agent_line, "◂"), text_column(variant_line, "◂"));
        assert_eq!(
            text_column(agent_line, "/sources/full"),
            text_column(variant_line, "agent.yaml")
        );
        let value_column = text_column(agent_line, "full");
        assert_eq!(value_column, text_column(variant_line, "default"));
        assert_eq!(value_column, text_column(name_line, "full"));
        assert_eq!(value_column, text_column(env_line, "default"));
        assert!(
            hit_map
                .clicks
                .iter()
                .any(|(_, target)| { target == &HitTarget::Action(MouseAction::FocusCreateField(CreateField::Name)) })
        );
        assert!(hit_map.clicks.iter().any(|(_, target)| {
            target
                == &HitTarget::Action(MouseAction::SelectCreate {
                    field: CreateField::Agent,
                    delta: 1,
                })
        }));
        assert!(hit_map.clicks.iter().any(|(_, target)| {
            target
                == &HitTarget::Action(MouseAction::Key(
                    crossterm::event::KeyCode::Enter,
                    crossterm::event::KeyModifiers::NONE,
                ))
        }));

        let Some(Modal::CreateAgent(form)) = &mut app.modal else {
            panic!("expected the CreateAgent modal");
        };
        form.agent = 1;
        form.variant = 0;
        form.field = CreateField::Name;
        form.name = "copy".into();
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("Agent       ◂ broken"));
        assert!(text.contains("Variant     ◂ default"));
        assert!(text.contains("manifest cannot be decoded"));
        assert!(text.contains("Name          copy▏"));
        assert!(text.contains("Env file      default: .env beside manifest"));
        assert_eq!(create_modal_geometry(&text), initial_geometry);
    }

    #[test]
    fn create_agent_modal_preserves_the_end_of_long_source_paths() {
        use super::super::app::{CreateForm, ManifestCandidate};

        let prefix = "/a/source/directory/whose/leading/components/do/not/fit/inside/the/create/agent/modal";
        let mut app = App::new();
        app.modal = Some(Modal::CreateAgent(CreateForm::new(
            vec![ManifestCandidate::new(
                std::path::PathBuf::from(prefix).join("agents/full/agent.yaml"),
                Ok("full".into()),
            )],
            None,
        )));
        let mut terminal = Terminal::new(TestBackend::new(100, 16)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let agent_line = text.lines().find(|line| line.contains("│ Agent")).expect("Agent row");
        let agent_line = agent_line.replace('\\', "/");
        assert!(agent_line.contains('…'));
        assert!(agent_line.contains("/fit/inside/the/create/agent/modal/agents/full"));
        assert!(!agent_line.contains("/a/source/directory"));
        assert!(
            agent_line.trim_end().ends_with('│'),
            "path remains inside the modal: {agent_line}"
        );
    }

    #[test]
    fn a_text_input_puts_the_cursor_over_its_placeholder_or_after_its_value() {
        let spans = text_input("", true, "full");
        assert_eq!(spans[1].content, "f");
        assert!(spans[1].style.add_modifier.contains(Modifier::REVERSED));
        assert_eq!(spans[2].content, "ull");

        let spans = text_input("my", true, "full");
        assert_eq!(spans[1].content, "my");
        assert_eq!(spans[2].content, "▏");
        assert_eq!(text_input("", false, "").len(), 1, "only the indent");
    }

    #[test]
    fn header_reports_a_running_manifest_scan() {
        let mut app = App::new();
        app.discovering = true;
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        assert!(buffer_text(&terminal).contains("scanning manifests…"));
    }

    #[test]
    fn create_agent_modal_explains_an_empty_picker() {
        use super::super::app::CreateForm;

        let mut app = App::new();
        app.modal = Some(Modal::CreateAgent(CreateForm::new(Vec::new(), None)));
        let mut terminal = Terminal::new(TestBackend::new(80, 14)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("No agent manifests found."));
        assert!(text.contains("agentctl apply"));
    }

    #[test]
    fn home_abbreviation_replaces_only_the_whole_home_component() {
        assert_eq!(abbreviate("/Users/dev/code", Some("/Users/dev")), "~/code");
        assert_eq!(abbreviate("/Users/dev", Some("/Users/dev")), "~");
        assert_eq!(
            abbreviate("/Users/devops/code", Some("/Users/dev")),
            "/Users/devops/code"
        );
        assert_eq!(abbreviate("/srv/code", None), "/srv/code");
        assert_eq!(abbreviate("/srv/code", Some("")), "/srv/code");
    }
}
