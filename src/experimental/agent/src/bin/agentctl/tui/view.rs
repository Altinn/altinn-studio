use ratatui::{
    Frame,
    layout::{Constraint, Layout, Margin, Position, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Clear, List, ListItem, ListState, Paragraph, Wrap},
};

use super::MANIFEST_FILE;
use super::app::{
    App, CONFIRM_DELETE_HINTS, CREATE_AGENT_HINTS, CreateField, ForwardField, Hint, Modal, MouseAction,
    NEW_SESSION_HINTS, PORT_FORWARD_HINTS, Row, RowTarget, SessionField, Tone, View,
};

const CREATE_AGENT_POPUP_WIDTH: u16 = 96;
const CREATE_AGENT_POPUP_HEIGHT: u16 = 8;
const CREATE_AGENT_FIELD_ROWS: usize = 4;
const CREATE_FIELD_LABEL_WIDTH: usize = 10;
const CREATE_PICKER_VALUE_WIDTH: usize = 18;
const CREATE_PICKER_DETAIL_OFFSET: usize = CREATE_FIELD_LABEL_WIDTH + 2 + CREATE_PICKER_VALUE_WIDTH + 2 + 8;
const ERROR_HINTS: [Hint; 2] = [
    Hint::key("r", "retry", crossterm::event::KeyCode::Char('r')),
    Hint::key("q", "quit", crossterm::event::KeyCode::Char('q')),
];
const GLOBAL_HINTS: [Hint; 4] = [
    Hint::display("j/k", "move"),
    Hint::key("r", "refresh", crossterm::event::KeyCode::Char('r')),
    Hint::key("F", "forwards", crossterm::event::KeyCode::Char('F')),
    Hint::key("q", "quit", crossterm::event::KeyCode::Char('q')),
];

#[derive(Default)]
pub(crate) struct ViewState {
    tree: ListState,
    forwards: ListState,
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

pub(crate) fn render(frame: &mut Frame, app: &App, state: &mut ViewState) -> HitMap {
    let mut hit_map = HitMap::new(frame.area());
    let [header, body, footer] =
        Layout::vertical([Constraint::Length(1), Constraint::Min(0), Constraint::Length(2)]).areas(frame.area());
    render_header(frame, header, app);
    let body = app.poll_error.as_ref().map_or(body, |error| {
        let [banner, content] = Layout::vertical([Constraint::Length(1), Constraint::Min(0)]).areas(body);
        frame.render_widget(
            Paragraph::new(format!(" refresh failed: {error} · showing last good snapshot "))
                .style(Style::new().fg(Color::Red).add_modifier(Modifier::REVERSED)),
            banner,
        );
        content
    });
    if let Some(detail) = app.detail_view() {
        render_detail(frame, body, &detail, &mut hit_map);
    } else if let Some(error) = &app.error {
        render_error(frame, body, error, &mut hit_map);
    } else if app.view == View::Forwards {
        render_forwards(frame, body, app, state, &mut hit_map);
    } else {
        render_tree(frame, body, app, state, &mut hit_map);
    }
    if let Some(modal) = &app.modal {
        hit_map.clear();
        render_modal(frame, body, modal, &mut hit_map);
    } else {
        render_footer(frame, footer, app, &mut hit_map);
    }
    if !app.color_enabled {
        remove_colors(frame);
    }
    hit_map
}

fn remove_colors(frame: &mut Frame) {
    let area = frame.area();
    for y in area.top()..area.bottom() {
        for x in area.left()..area.right() {
            frame.buffer_mut()[(x, y)].set_fg(Color::Reset).set_bg(Color::Reset);
        }
    }
}

fn render_header(frame: &mut Frame, area: Rect, app: &App) {
    let counts = app.triage_counts();
    let mut spans = vec![
        Span::styled(
            " agentctl ",
            Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED),
        ),
        Span::raw(" "),
        Span::styled(
            format!("{} need you", counts.needs_you),
            Style::new().fg(Color::Yellow).add_modifier(Modifier::BOLD),
        ),
    ];
    for segment in [
        format!(" · {} working", counts.working),
        format!(" · {} starting", counts.starting),
        format!(" · {} idle", counts.idle),
        format!(" · {} failed", counts.failed),
    ] {
        push_header_segment(&mut spans, area.width, segment, Color::DarkGray);
    }
    if app.refreshing() {
        push_header_segment(&mut spans, area.width, " · refreshing".into(), Color::Cyan);
    }
    if app.creating > 0 {
        push_header_segment(&mut spans, area.width, " · creating forward".into(), Color::Cyan);
    }
    if app.discovering {
        push_header_segment(&mut spans, area.width, " · scanning manifests".into(), Color::Cyan);
    }
    let updated = app.last_updated.map_or_else(
        || "waiting for first update".to_owned(),
        |at| format!("updated {} ago", compact_duration(at.elapsed().as_secs())),
    );
    push_header_segment(&mut spans, area.width, format!(" · {updated}"), Color::DarkGray);
    frame.render_widget(Line::from(spans), area);
}

fn push_header_segment(spans: &mut Vec<Span<'static>>, width: u16, segment: String, color: Color) {
    let used = Line::from(spans.clone()).width();
    if used + Line::from(segment.as_str()).width() <= usize::from(width) {
        spans.push(Span::styled(segment, Style::new().fg(color)));
    }
}

fn compact_duration(seconds: u64) -> String {
    match seconds {
        0..=59 => format!("{seconds}s"),
        60..=3_599 => format!("{}m", seconds / 60),
        _ => format!("{}h", seconds / 3_600),
    }
}

fn render_tree(frame: &mut Frame, area: Rect, app: &App, state: &mut ViewState, hit_map: &mut HitMap) {
    let rows = app.render_rows();
    if rows.is_empty() {
        let placeholder = if app.loaded { "(no agents)" } else { "loading…" };
        frame.render_widget(
            Paragraph::new(placeholder).style(Style::new().fg(Color::DarkGray)),
            area,
        );
        return;
    }
    let [columns, list_area] = Layout::vertical([Constraint::Length(1), Constraint::Min(0)]).areas(area);
    frame.render_widget(tree_header(columns.width), columns);
    let viewport = tree_viewport(app, state, list_area.height);
    hit_map.wheel(list_area, WheelTarget::Tree);
    let mut y = list_area.y;
    if viewport.hidden_above > 0 && y < list_area.bottom() {
        render_more(frame, list_area, y, viewport.hidden_above, "above");
        y = y.saturating_add(1);
    }
    if let Some(index) = viewport.sticky.filter(|_| y < list_area.bottom()) {
        render_tree_item(frame, app, &rows, list_area, (index, y, true), hit_map);
        y = y.saturating_add(1);
    }
    for index in viewport.offset..viewport.offset.saturating_add(viewport.visible) {
        if y >= list_area.bottom() {
            break;
        }
        render_tree_item(frame, app, &rows, list_area, (index, y, false), hit_map);
        y = y.saturating_add(1);
    }
    if viewport.hidden_below > 0 && y < list_area.bottom() {
        render_more(frame, list_area, y, viewport.hidden_below, "below");
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
struct TreeViewport {
    offset: usize,
    visible: usize,
    sticky: Option<usize>,
    hidden_above: usize,
    hidden_below: usize,
}

fn tree_viewport(app: &App, state: &mut ViewState, height: u16) -> TreeViewport {
    let total = app.rows.len();
    let height = usize::from(height);
    let Some(selected) = app.selected_index().filter(|_| total > 0 && height > 0) else {
        *state.tree.offset_mut() = 0;
        state.tree.select(app.selected_index());
        return TreeViewport::default();
    };
    let mut offset = state.tree.offset().min(total.saturating_sub(1));
    for _ in 0..4 {
        let hidden_above = usize::from(offset > 0);
        let sticky = sticky_agent_row(app, offset);
        let reserved = hidden_above + usize::from(sticky.is_some());
        let without_bottom = height.saturating_sub(reserved);
        let has_bottom = offset.saturating_add(without_bottom) < total;
        let capacity = without_bottom.saturating_sub(usize::from(has_bottom)).max(1);
        let next = if selected < offset {
            selected
        } else if selected >= offset.saturating_add(capacity) {
            selected.saturating_add(1).saturating_sub(capacity)
        } else {
            offset
        };
        if next == offset {
            break;
        }
        offset = next.min(total.saturating_sub(1));
    }
    let hidden_above = offset;
    let sticky = sticky_agent_row(app, offset);
    let reserved = usize::from(hidden_above > 0) + usize::from(sticky.is_some());
    let without_bottom = height.saturating_sub(reserved);
    let has_bottom = offset.saturating_add(without_bottom) < total;
    let visible = without_bottom
        .saturating_sub(usize::from(has_bottom))
        .min(total.saturating_sub(offset));
    let hidden_below = total.saturating_sub(offset.saturating_add(visible));
    *state.tree.offset_mut() = offset;
    state.tree.select(Some(selected));
    TreeViewport {
        offset,
        visible,
        sticky,
        hidden_above,
        hidden_below,
    }
}

fn sticky_agent_row(app: &App, offset: usize) -> Option<usize> {
    let Row::Session { group, .. } = app.rows.get(offset)? else {
        return None;
    };
    app.rows[..offset]
        .iter()
        .rposition(|row| matches!(row, Row::Agent(candidate) if candidate == group))
}

fn render_more(frame: &mut Frame, area: Rect, y: u16, count: usize, direction: &str) {
    frame.render_widget(
        Paragraph::new(format!("  {count} more {direction}"))
            .style(Style::new().fg(Color::DarkGray).add_modifier(Modifier::ITALIC)),
        Rect::new(area.x, y, area.width, 1),
    );
}

fn render_tree_item(
    frame: &mut Frame,
    app: &App,
    views: &[super::app::RowView],
    area: Rect,
    item: (usize, u16, bool),
    hit_map: &mut HitMap,
) {
    let (index, y, sticky) = item;
    let (Some(row), Some(view), Some(target)) = (app.rows.get(index), views.get(index), app.row_target(index)) else {
        return;
    };
    let row_area = Rect::new(area.x, y, area.width, 1);
    let selected = !sticky && app.selected_index() == Some(index);
    let style = if selected {
        Style::new().add_modifier(Modifier::REVERSED)
    } else if sticky {
        Style::new().add_modifier(Modifier::DIM)
    } else {
        Style::new()
    };
    frame.render_widget(Paragraph::new(tree_row(view, area.width)).style(style), row_area);
    hit_map.click(row_area, HitTarget::Row(target.clone()));
    if matches!(row, Row::Agent(_)) {
        let RowTarget::Tree(target) = target else {
            return;
        };
        hit_map.click(
            Rect::new(area.x, y, area.width.min(2), 1),
            HitTarget::Action(MouseAction::FoldTree(target)),
        );
    }
}

#[derive(Clone, Copy)]
struct TreeColumns {
    name: usize,
    state: usize,
    active_for: Option<(usize, usize)>,
    harness: Option<(usize, usize)>,
    model: Option<(usize, usize)>,
    age: Option<(usize, usize)>,
}

fn tree_columns(width: u16) -> TreeColumns {
    let width = usize::from(width);
    if width >= 80 {
        TreeColumns {
            name: 4,
            state: 34,
            active_for: Some((45, 6)),
            harness: Some((52, 13)),
            model: Some((66, 9)),
            age: Some((76, 4)),
        }
    } else if width >= 60 {
        TreeColumns {
            name: 4,
            state: 27,
            active_for: Some((38, 6)),
            harness: Some((45, width.saturating_sub(45))),
            model: None,
            age: None,
        }
    } else {
        TreeColumns {
            name: 4,
            state: width.saturating_sub(17).max(18),
            active_for: (width >= 38).then_some((width.saturating_sub(6), 6)),
            harness: None,
            model: None,
            age: None,
        }
    }
}

fn tree_header(width: u16) -> Line<'static> {
    let columns = tree_columns(width);
    let mut spans = Vec::new();
    push_at(
        &mut spans,
        columns.name,
        "NAME".into(),
        Style::new().fg(Color::DarkGray),
    );
    push_at(
        &mut spans,
        columns.state,
        "STATE".into(),
        Style::new().fg(Color::DarkGray),
    );
    if let Some((column, cell_width)) = columns.active_for {
        push_at(
            &mut spans,
            column,
            fit_right("FOR", cell_width),
            Style::new().fg(Color::DarkGray),
        );
    }
    if let Some((column, _)) = columns.harness {
        push_at(&mut spans, column, "HARNESS".into(), Style::new().fg(Color::DarkGray));
    }
    if let Some((column, _)) = columns.model {
        push_at(&mut spans, column, "MODEL".into(), Style::new().fg(Color::DarkGray));
    }
    if let Some((column, cell_width)) = columns.age {
        push_at(
            &mut spans,
            column,
            fit_right("AGE", cell_width),
            Style::new().fg(Color::DarkGray),
        );
    }
    Line::from(spans)
}

fn tree_row(row: &super::app::RowView, width: u16) -> Line<'static> {
    let columns = tree_columns(width);
    let width = usize::from(width);
    let mut spans = Vec::new();
    let tone = tone_color(row.tone);
    let gutter = if row.gutter { "▐" } else { " " };
    push_at(&mut spans, 0, gutter.into(), Style::new().fg(tone));
    push_at(&mut spans, 2, row.control.into(), Style::new().fg(tone));
    let name_width = columns.state.saturating_sub(columns.name + 1);
    let name_style = if row.agent {
        Style::new().add_modifier(Modifier::BOLD)
    } else {
        Style::new()
    };
    push_at(&mut spans, columns.name, fit_left(&row.name, name_width), name_style);
    push_at(
        &mut spans,
        columns.state,
        fit_left(&row.state, 10),
        Style::new()
            .fg(tone)
            .add_modifier(if row.gutter { Modifier::BOLD } else { Modifier::empty() }),
    );
    if row.agent {
        let detail_column = columns.active_for.map_or(columns.state + 11, |(column, _)| column);
        let detail_width = width.saturating_sub(detail_column);
        push_at(
            &mut spans,
            detail_column,
            fit_left(&row.detail, detail_width),
            Style::new().fg(Color::DarkGray),
        );
        return Line::from(spans);
    }
    if let Some((column, cell_width)) = columns.active_for {
        push_at(
            &mut spans,
            column,
            fit_right(&row.active_for, cell_width),
            Style::new().fg(tone),
        );
    }
    if let Some((column, cell_width)) = columns.harness {
        push_at(
            &mut spans,
            column,
            fit_left(&row.harness, cell_width),
            Style::new().fg(Color::DarkGray),
        );
    }
    if let Some((column, cell_width)) = columns.model {
        push_at(
            &mut spans,
            column,
            fit_left(&row.model, cell_width),
            Style::new().fg(Color::DarkGray),
        );
    }
    if let Some((column, cell_width)) = columns.age {
        push_at(
            &mut spans,
            column,
            fit_right(&row.age, cell_width),
            Style::new().fg(Color::DarkGray),
        );
    }
    Line::from(spans)
}

fn push_at(spans: &mut Vec<Span<'static>>, column: usize, value: String, style: Style) {
    let current = Line::from(spans.clone()).width();
    if current < column {
        spans.push(Span::raw(" ".repeat(column - current)));
    }
    spans.push(Span::styled(value, style));
}

fn fit_left(value: &str, width: usize) -> String {
    let mut output = String::new();
    let mut used = 0;
    let truncated = Line::from(value).width() > width;
    let available = width.saturating_sub(usize::from(truncated));
    for character in value.chars() {
        let cell_width = Line::from(character.to_string()).width();
        if used + cell_width > available {
            break;
        }
        output.push(character);
        used += cell_width;
    }
    if truncated && width > 0 {
        output.push('~');
        used += 1;
    }
    output.push_str(&" ".repeat(width.saturating_sub(used)));
    output
}

fn fit_right(value: &str, width: usize) -> String {
    let value = fit_left(value, width);
    let value = value.trim_end();
    format!("{value:>width$}")
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
    let list = List::new(items)
        .block(block)
        .highlight_style(Style::new().add_modifier(Modifier::REVERSED));
    state.forwards.select(Some(app.forward_selected));
    frame.render_stateful_widget(list, area, &mut state.forwards);
    hit_map.wheel(inner, WheelTarget::Forwards);
    for visible in 0..usize::from(inner.height) {
        let index = state.forwards.offset().saturating_add(visible);
        if index >= app.forwards.len() {
            break;
        }
        let y = inner.y.saturating_add(u16::try_from(visible).unwrap_or(u16::MAX));
        hit_map.click(
            Rect::new(inner.x, y, inner.width, 1),
            HitTarget::Row(RowTarget::Forward(app.forwards[index].id)),
        );
    }
}

fn render_detail(frame: &mut Frame, area: Rect, detail: &super::app::DetailView, hit_map: &mut HitMap) {
    let block = Block::bordered().title(format!(" {} — q back · ↑/↓ scroll ", detail.title));
    let inner = block.inner(area);
    let scroll = u16::try_from(detail.scroll).unwrap_or(u16::MAX);
    let paragraph = Paragraph::new(detail.lines.join("\n")).block(block).scroll((scroll, 0));
    frame.render_widget(paragraph, area);
    hit_map.wheel(inner, WheelTarget::Detail);
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
        render_hint_line(frame, hints, &ERROR_HINTS, Color::Red, Color::Red, hit_map, |_| true);
    }
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App, hit_map: &mut HitMap) {
    let [contextual, global] = Layout::vertical([Constraint::Length(1), Constraint::Length(1)]).areas(area);
    render_hint_line(
        frame,
        contextual,
        app.hints(),
        Color::Cyan,
        Color::DarkGray,
        hit_map,
        |_| app.error.is_none(),
    );
    render_hint_line(
        frame,
        global,
        &GLOBAL_HINTS,
        Color::DarkGray,
        Color::DarkGray,
        hit_map,
        |hint| {
            if app.modal.is_some() || app.detail.is_some() || app.view == View::Forwards {
                false
            } else if app.error.is_some() {
                matches!(hint.label, "r" | "q")
            } else {
                true
            }
        },
    );
}

fn render_hint_line(
    frame: &mut Frame,
    area: Rect,
    hints: &[Hint],
    key_color: Color,
    description_color: Color,
    hit_map: &mut HitMap,
    clickable: impl Fn(&Hint) -> bool,
) {
    let mut spans = Vec::new();
    let mut x = area.x;
    let mut rendered = 0;
    for (index, hint) in hints.iter().enumerate() {
        let separator_width = if index > 0 { 2 } else { 0 };
        let width = hint_width(hint);
        if x.saturating_add(separator_width).saturating_add(width) > area.right() {
            break;
        }
        if index > 0 {
            spans.push(Span::raw("  "));
            x = x.saturating_add(2);
        }
        spans.push(Span::styled(
            format!(" {} ", hint.label),
            Style::new().fg(key_color).add_modifier(Modifier::REVERSED),
        ));
        spans.push(Span::raw(" "));
        spans.push(Span::styled(hint.description, Style::new().fg(description_color)));
        if clickable(hint)
            && let Some((code, modifiers)) = hint.key
        {
            hit_map.click(
                Rect::new(x, area.y, width.min(area.right().saturating_sub(x)), 1),
                HitTarget::Action(MouseAction::Key(code, modifiers)),
            );
        }
        x = x.saturating_add(width);
        rendered += 1;
    }
    if rendered < hints.len() {
        let hidden = format!(" +{}", hints.len() - rendered);
        if x.saturating_add(u16::try_from(hidden.len()).unwrap_or(u16::MAX)) <= area.right() {
            spans.push(Span::styled(hidden, Style::new().fg(description_color)));
        }
    }
    frame.render_widget(Line::from(spans), area);
}

fn map_hint_targets(area: Rect, hints: &[Hint], hit_map: &mut HitMap) {
    let mut x = area.x;
    for (index, hint) in hints.iter().enumerate() {
        let separator_width = if index > 0 { 2 } else { 0 };
        let width = hint_width(hint);
        if x.saturating_add(separator_width).saturating_add(width) > area.right() {
            break;
        }
        if index > 0 {
            x = x.saturating_add(2);
        }
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
    u16::try_from(Line::from(format!(" {}  {}", hint.label, hint.description)).width()).unwrap_or(u16::MAX)
}

fn render_modal(frame: &mut Frame, area: Rect, modal: &Modal, hit_map: &mut HitMap) {
    match modal {
        Modal::ConfirmDelete { agent, sessions } => {
            let lines = vec![
                Line::from(format!("Delete agent {agent}?")),
                Line::from(Span::styled(
                    format!("{sessions} session(s) will be deleted with it."),
                    Style::new().fg(Color::DarkGray),
                )),
                Line::default(),
                hint_line(&CONFIRM_DELETE_HINTS),
            ];
            let target = popup(frame, area, " delete ", Color::Red, lines);
            map_hint_targets(line_area(target, 3), &CONFIRM_DELETE_HINTS, hit_map);
        }
        Modal::NewSession(form) => render_new_session(frame, area, form, hit_map),
        Modal::CreateAgent(form) => render_create_agent(frame, area, form, hit_map),
        Modal::PortForward(form) => {
            let mut lines = vec![
                Line::from(format!("Agent:         {}", form.agent)),
                form_field("Local address", &form.address, form.field == ForwardField::Address),
                form_field("Local port", &form.local, form.field == ForwardField::LocalPort),
                form_field("Guest port", &form.guest, form.field == ForwardField::GuestPort),
            ];
            if form.local.is_empty() {
                lines.push(Line::from(Span::styled(
                    "An empty local port mirrors the guest port.",
                    Style::new().fg(Color::DarkGray),
                )));
            }
            if let Some(error) = &form.error {
                lines.push(Line::from(Span::styled(error.clone(), Style::new().fg(Color::Red))));
            }
            lines.push(Line::default());
            let hint_row = lines.len();
            lines.push(hint_line(&PORT_FORWARD_HINTS));
            let title = if form.replace.is_some() {
                " edit forward "
            } else {
                " port forward "
            };
            let target = popup(frame, area, title, Color::Cyan, lines);
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
            map_hint_targets(line_area(target, hint_row), &PORT_FORWARD_HINTS, hit_map);
        }
    }
}

fn render_new_session(frame: &mut Frame, area: Rect, form: &super::app::SessionForm, hit_map: &mut HitMap) {
    let mut harness_spans = vec![Span::raw("Harness: ")];
    for (index, installation) in form.harnesses.iter().enumerate() {
        if index > 0 {
            harness_spans.push(Span::raw("  "));
        }
        let style = if index == form.harness {
            Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED)
        } else {
            Style::new().fg(Color::DarkGray)
        };
        harness_spans.push(Span::styled(installation.kind.as_str().to_owned(), style));
    }
    let mut lines = vec![
        Line::from(format!("Agent:   {}", form.agent)),
        field_line("Name:    ", &form.name, form.field == SessionField::Name, None),
        field_line(
            "Model:   ",
            &form.model,
            form.field == SessionField::Model,
            Some(selection_hint(form.model_default())),
        ),
        field_line(
            "Effort:  ",
            &form.effort,
            form.field == SessionField::Effort,
            Some(selection_hint(form.effort_default())),
        ),
        Line::from(harness_spans),
    ];
    if let Some(error) = &form.error {
        lines.push(Line::from(Span::styled(error.clone(), Style::new().fg(Color::Red))));
    }
    lines.push(Line::default());
    let hint_row = lines.len();
    lines.push(hint_line(&NEW_SESSION_HINTS));
    let target = popup(frame, area, " new session ", Color::Cyan, lines);
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
    let harness_area = line_area(target, 4);
    let mut x = harness_area.x.saturating_add(9);
    for (index, installation) in form.harnesses.iter().enumerate() {
        if index > 0 {
            x = x.saturating_add(2);
        }
        let width = u16::try_from(Line::from(installation.kind.as_str()).width()).unwrap_or(u16::MAX);
        hit_map.click(
            Rect::new(x, harness_area.y, width.min(harness_area.right().saturating_sub(x)), 1),
            HitTarget::Action(MouseAction::SelectHarness(index)),
        );
        x = x.saturating_add(width);
    }
    map_hint_targets(line_area(target, hint_row), &NEW_SESSION_HINTS, hit_map);
}

/// What an empty selection field resolves to: the manifest default or the harness's own.
fn selection_hint(manifest_default: Option<&str>) -> String {
    manifest_default.map_or_else(
        || "harness default".to_owned(),
        |default| format!("{default} (manifest default)"),
    )
}

/// One text field of the new Session form. The cursor marks the focused field;
/// `empty_hint` shows what an empty field resolves to.
fn field_line(label: &str, value: &str, focused: bool, empty_hint: Option<String>) -> Line<'static> {
    let mut spans = vec![Span::raw(format!("{label}{value}"))];
    if focused {
        spans.push(Span::styled("▏", Style::new().fg(Color::Cyan)));
    }
    if let Some(hint) = empty_hint
        && value.is_empty()
    {
        spans.push(Span::styled(format!(" {hint}"), Style::new().fg(Color::DarkGray)));
    }
    Line::from(spans)
}

fn render_create_agent(frame: &mut Frame, area: Rect, form: &super::app::CreateForm, hit_map: &mut HitMap) {
    let popup_width = CREATE_AGENT_POPUP_WIDTH.min(area.width);
    let detail_width = usize::from(popup_width)
        .saturating_sub(2)
        .saturating_sub(CREATE_PICKER_DETAIL_OFFSET);
    let mut lines = form.agent().zip(form.candidate()).map_or_else(
        || {
            vec![
                Line::from("No agent manifests found."),
                Line::from(Span::styled(
                    format!("Start the TUI inside a repository or directory tree containing {MANIFEST_FILE},"),
                    Style::new().fg(Color::DarkGray),
                )),
                Line::from(Span::styled(
                    "or apply one first: agentctl apply -f",
                    Style::new().fg(Color::DarkGray),
                )),
            ]
        },
        |(agent, candidate)| picker_lines(form, agent, candidate, detail_width),
    );
    while lines.len() < CREATE_AGENT_FIELD_ROWS {
        lines.push(Line::default());
    }
    let candidate_error = form.candidate().and_then(|candidate| candidate.name.as_ref().err());
    if let Some(error) = form.error.as_ref().or(candidate_error) {
        lines.push(Line::from(Span::styled(error.clone(), Style::new().fg(Color::Red))));
    } else {
        lines.push(Line::default());
    }
    lines.push(hint_line(&CREATE_AGENT_HINTS));
    let target = popup_sized(
        frame,
        area,
        " create agent ",
        Color::Cyan,
        lines,
        popup_width,
        CREATE_AGENT_POPUP_HEIGHT,
    );
    if form.candidate().is_some() {
        let label_width = u16::try_from(CREATE_FIELD_LABEL_WIDTH).unwrap_or(u16::MAX);
        let value_width = u16::try_from(CREATE_PICKER_VALUE_WIDTH).unwrap_or(u16::MAX);
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
            let line = line_area(target, row);
            hit_map.click(
                Rect::new(line.x.saturating_add(label_width), line.y, 2, 1),
                HitTarget::Action(MouseAction::SelectCreate { field, delta: -1 }),
            );
            hit_map.click(
                Rect::new(
                    line.x
                        .saturating_add(label_width)
                        .saturating_add(2)
                        .saturating_add(value_width),
                    line.y,
                    2,
                    1,
                ),
                HitTarget::Action(MouseAction::SelectCreate { field, delta: 1 }),
            );
        }
    }
    map_hint_targets(line_area(target, 5), &CREATE_AGENT_HINTS, hit_map);
}

fn picker_lines(
    form: &super::app::CreateForm,
    agent: &super::app::AgentDefinition,
    candidate: &super::app::ManifestCandidate,
    detail_width: usize,
) -> Vec<Line<'static>> {
    let agent_path = abbreviate_home(&agent.directory.display().to_string());
    let manifest_file = candidate.path.file_name().map_or_else(
        || candidate.path.display().to_string(),
        |name| name.to_string_lossy().into_owned(),
    );
    let agent_label = agent.label();
    let variant_label = form.variant_label().unwrap_or_default();
    let mut lines = vec![
        picker_line(
            "Agent:",
            &agent_label,
            &agent_path,
            form.field == super::app::CreateField::Agent,
            form.agent,
            form.agents.len(),
            detail_width,
        ),
        picker_line(
            "Variant:",
            &variant_label,
            &manifest_file,
            form.field == super::app::CreateField::Variant,
            form.variant,
            agent.variants.len(),
            detail_width,
        ),
    ];
    lines.push(Line::from(name_field_spans(form)));
    lines.push(create_text_field_line(
        "Env file:",
        &form.env_file,
        form.field == super::app::CreateField::EnvironmentFile,
        "default: .env beside manifest",
    ));
    lines
}

fn picker_line(
    label: &'static str,
    value: &str,
    detail: &str,
    focused: bool,
    selected: usize,
    total: usize,
    detail_width: usize,
) -> Line<'static> {
    let control = if focused { Color::Cyan } else { Color::DarkGray };
    let value_style = if focused {
        Style::new().fg(Color::Cyan)
    } else {
        Style::new()
    };
    let value = fixed_width(value, CREATE_PICKER_VALUE_WIDTH);
    let position = format!("{}/{}", selected.saturating_add(1), total);
    Line::from(vec![
        Span::raw(create_field_label(label)),
        Span::styled("◂ ", Style::new().fg(control)),
        Span::styled(value, value_style),
        Span::styled(" ▸", Style::new().fg(control)),
        Span::styled(format!(" {position:>5}  "), Style::new().fg(Color::DarkGray)),
        Span::styled(tail_ellipsized(detail, detail_width), Style::new().fg(Color::DarkGray)),
    ])
}

fn create_field_label(label: &str) -> String {
    format!("{label:<CREATE_FIELD_LABEL_WIDTH$}")
}

fn create_text_field_label(label: &str) -> String {
    format!("{}  ", create_field_label(label))
}

fn create_text_field_line(label: &str, value: &str, focused: bool, empty_hint: &str) -> Line<'static> {
    let mut spans = vec![Span::raw(create_text_field_label(label))];
    if value.is_empty() {
        let mut hint = empty_hint.chars();
        if let Some(first) = hint.next() {
            let style = Style::new().fg(Color::DarkGray);
            spans.push(Span::styled(
                first.to_string(),
                if focused {
                    style.add_modifier(Modifier::REVERSED)
                } else {
                    style
                },
            ));
            spans.push(Span::styled(hint.collect::<String>(), style));
        }
    } else {
        spans.push(Span::raw(value.to_owned()));
        if focused {
            spans.push(Span::styled("▏", Style::new().fg(Color::Cyan)));
        }
    }
    Line::from(spans)
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

/// Renders the name input; an empty buffer shows the placeholder with a
/// block cursor over its first character, so the cursor sits flush against
/// the grayed text instead of leaving a cell-wide gap before it.
fn name_field_spans(form: &super::app::CreateForm) -> Vec<Span<'static>> {
    let focused = form.field == super::app::CreateField::Name;
    let mut spans = vec![Span::raw(create_text_field_label("Name:"))];
    if !form.name.is_empty() {
        spans.push(Span::raw(form.name.clone()));
        if focused {
            spans.push(Span::styled("▏", Style::new().fg(Color::Cyan)));
        }
        return spans;
    }
    let mut placeholder = form.placeholder().unwrap_or_default().chars();
    match placeholder.next() {
        Some(first) if focused => {
            spans.push(Span::styled(
                first.to_string(),
                Style::new().fg(Color::DarkGray).add_modifier(Modifier::REVERSED),
            ));
            spans.push(Span::styled(
                placeholder.collect::<String>(),
                Style::new().fg(Color::DarkGray),
            ));
        }
        Some(first) => spans.push(Span::styled(
            format!("{first}{}", placeholder.collect::<String>()),
            Style::new().fg(Color::DarkGray),
        )),
        None if focused => spans.push(Span::styled("▏", Style::new().fg(Color::Cyan))),
        None => {}
    }
    spans
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

fn form_field(label: &str, value: &str, selected: bool) -> Line<'static> {
    let mut spans = vec![Span::raw(format!(
        "{label}:{}",
        " ".repeat(14usize.saturating_sub(label.len()))
    ))];
    let style = if selected {
        Style::new().fg(Color::Cyan)
    } else {
        Style::new()
    };
    spans.push(Span::styled(value.to_owned(), style));
    if selected {
        spans.push(Span::styled("▏", Style::new().fg(Color::Cyan)));
    }
    Line::from(spans)
}

fn hint_line(hints: &[Hint]) -> Line<'static> {
    let mut spans = Vec::new();
    for (index, hint) in hints.iter().enumerate() {
        if index > 0 {
            spans.push(Span::raw("  "));
        }
        spans.push(Span::styled(
            format!(" {} ", hint.label),
            Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED),
        ));
        spans.push(Span::raw(" "));
        spans.push(Span::styled(hint.description, Style::new().fg(Color::DarkGray)));
    }
    Line::from(spans)
}

fn popup(frame: &mut Frame, area: Rect, title: &str, border: Color, lines: Vec<Line<'_>>) -> Rect {
    let height = u16::try_from(lines.len()).unwrap_or(u16::MAX).saturating_add(2);
    let content = lines
        .iter()
        .map(Line::width)
        .max()
        .and_then(|width| u16::try_from(width).ok())
        .unwrap_or(u16::MAX)
        .saturating_add(2);
    let width = (area.width / 2).max(content).min(area.width);
    popup_sized(frame, area, title, border, lines, width, height)
}

fn popup_sized(
    frame: &mut Frame,
    area: Rect,
    title: &str,
    border: Color,
    lines: Vec<Line<'_>>,
    width: u16,
    height: u16,
) -> Rect {
    let target = centered_rect(area, width.min(area.width), height.min(area.height));
    frame.render_widget(Clear, target);
    let block = Block::bordered()
        .title(title.to_owned())
        .border_style(Style::new().fg(border));
    frame.render_widget(Paragraph::new(lines).block(block), target);
    target
}

fn line_area(popup: Rect, line: usize) -> Rect {
    let inner = popup.inner(Margin::new(1, 1));
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

const fn tone_color(tone: Tone) -> Color {
    match tone {
        Tone::Green => Color::Green,
        Tone::Yellow => Color::Yellow,
        Tone::Blue => Color::Blue,
        Tone::Gray => Color::DarkGray,
        Tone::Red => Color::Red,
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use ratatui::{Terminal, backend::TestBackend};
    use unicode_width::UnicodeWidthChar as _;

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

    fn session(agent: &str, name: &str, state: &str, index: u128) -> agent::sessions::Session {
        let lifecycle = if matches!(state, "working" | "waitingForInput") {
            "running"
        } else {
            state
        };
        serde_json::from_value(serde_json::json!({
            "id": format!("00000000-0000-0000-0000-{index:012x}"),
            "agentId": "00000000-0000-0000-0000-000000000100",
            "agent": agent,
            "name": name,
            "harness": "claudeCode",
            "modelSelection": {},
            "createdAt": "2026-09-19T00:00:00Z",
            "status": {
                "state": state,
                "lifecycle": {"state": lifecycle}
            }
        }))
        .expect("test Session")
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
    fn aligned_tree_glyphs_are_narrow_in_cjk_terminals() {
        for glyph in ['>', 'v', '❖', '◉', '◔', '◌', '✖', '▐', '~'] {
            assert_eq!(glyph.width(), Some(1), "normal width for {glyph}");
            assert_eq!(glyph.width_cjk(), Some(1), "CJK width for {glyph}");
        }
    }

    #[test]
    fn state_column_does_not_move_with_the_name() {
        let row = |name: &str| super::super::app::RowView {
            gutter: false,
            control: "◉",
            name: name.into(),
            state: "Working".into(),
            active_for: "2m".into(),
            harness: "Codex".into(),
            model: "gpt-5".into(),
            age: "12m".into(),
            detail: String::new(),
            tone: Tone::Green,
            agent: false,
        };
        for name in ["x", "investigate-summary2-focus-regression"] {
            let line = tree_row(&row(name), 80);
            let text = line.spans.iter().map(|span| span.content.as_ref()).collect::<String>();
            assert_eq!(text_column(&text, "Working"), 34);
        }
    }

    #[test]
    fn frame_shows_header_counts_tree_and_hints() {
        let app = App::new();
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        assert!(text.contains("agentctl"));
        assert!(text.contains("0 need you · 0 working · 0 starting · 0 idle · 0 failed"));
        assert!(text.contains("loading…"));
        assert!(text.contains(" j/k  move   r  refresh   F  forwards   q  quit"));
    }

    #[test]
    fn tree_hit_map_uses_the_rendered_offset_and_updates_after_resize() {
        let mut app = tree_app(10);
        app.select_index(9);
        let ninth = app.row_target(9).expect("ninth Agent target");
        let mut state = ViewState::default();
        let mut terminal = Terminal::new(TestBackend::new(40, 8)).expect("test terminal");

        let compact = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree.offset(), 7);
        assert_eq!(compact.click_at(10, 1), None, "column header is inert");
        assert_eq!(compact.click_at(10, 2), None, "hidden-row affordance is inert");
        assert_eq!(
            compact.click_at(10, 3),
            Some(HitTarget::Row(app.row_target(7).expect("seventh target")))
        );
        assert_eq!(compact.click_at(10, 5), Some(HitTarget::Row(ninth)));
        assert!(
            matches!(compact.click_at(10, 6), Some(HitTarget::Action(_))),
            "footer control is not a stale list row"
        );
        assert_eq!(compact.click_at(40, 1), None, "right edge is out of bounds");

        terminal = Terminal::new(TestBackend::new(40, 12)).expect("resized test terminal");
        let resized = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree.offset(), 7, "the viewport remains stable when it still fits");
        assert_eq!(resized.click_at(10, 1), None, "column header remains inert");
        assert_eq!(resized.click_at(10, 2), None, "hidden-row affordance remains inert");
        assert_eq!(
            resized.click_at(10, 3),
            Some(HitTarget::Row(app.row_target(7).expect("seventh target")))
        );
        assert_eq!(
            resized.click_at(10, 6),
            None,
            "the resized map has no stale footer target"
        );
    }

    #[test]
    fn scrolled_session_view_keeps_its_agent_sticky_and_hit_targets_exact() {
        let mut app = tree_app(2);
        let agents = std::mem::take(&mut app.agents);
        let sessions = (0..10)
            .map(|index| session("agent-00", &format!("task-{index:02}"), "idle", index))
            .collect();
        app.apply_snapshot(agents, sessions);
        app.select_index(9);
        let sticky = app.row_target(0).expect("owning Agent target");
        let selected = app.row_target(9).expect("selected Session target");
        let mut state = ViewState::default();
        let mut terminal = Terminal::new(TestBackend::new(40, 8)).expect("test terminal");

        let hit_map = draw_with_state(&mut terminal, &app, &mut state);
        let text = buffer_text(&terminal);

        assert!(text.contains("9 more above"));
        assert!(text.contains("agent-00"), "owning Agent is pinned above the Session");
        assert!(text.contains("task-08"));
        assert!(text.contains("2 more below"));
        assert_eq!(hit_map.click_at(10, 2), None, "more affordance is inert");
        assert_eq!(hit_map.click_at(10, 3), Some(HitTarget::Row(sticky)));
        assert_eq!(hit_map.click_at(10, 4), Some(HitTarget::Row(selected)));
        assert_eq!(hit_map.click_at(10, 5), None, "bottom affordance is inert");
    }

    #[test]
    fn no_color_removes_palette_but_keeps_state_cues() {
        let mut app = tree_app(1);
        let agents = std::mem::take(&mut app.agents);
        app.apply_snapshot(agents, vec![session("agent-00", "blocked", "waitingForInput", 1)]);
        app.color_enabled = false;
        let mut terminal = Terminal::new(TestBackend::new(80, 12)).expect("test terminal");

        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let buffer = terminal.backend().buffer();

        assert!(text.contains("▐"));
        assert!(text.contains("❖"));
        assert!(text.contains("Needs you"));
        assert!(
            buffer
                .content()
                .iter()
                .all(|cell| cell.fg == Color::Reset && cell.bg == Color::Reset)
        );
    }

    #[test]
    fn narrow_footer_only_renders_complete_keycap_controls() {
        let app = App::new();
        let mut terminal = Terminal::new(TestBackend::new(32, 8)).expect("test terminal");

        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);
        let footer = text.lines().rev().take(2).collect::<Vec<_>>();

        assert!(
            footer.iter().any(|line| line.contains('+')),
            "hidden actions are counted"
        );
        assert!(
            footer
                .iter()
                .all(|line| !line.contains("forw") || line.contains("forwards"))
        );
        assert!(
            footer
                .iter()
                .all(|line| !line.contains("refre") || line.contains("refresh"))
        );
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
        let retry = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Char('r'),
            crossterm::event::KeyModifiers::NONE,
        ));
        let quit = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Char('q'),
            crossterm::event::KeyModifiers::NONE,
        ));

        assert_eq!(hit_map.click_at(0, 4), Some(retry));
        assert_eq!(hit_map.click_at(11, 4), Some(quit));
        assert_eq!(hit_map.click_at(9, 4), None, "separator is inert");
    }

    #[test]
    fn poll_error_keeps_the_last_good_tree_visible() {
        let mut app = tree_app(2);
        app.poll_error = Some("daemon unavailable".into());
        let mut terminal = Terminal::new(TestBackend::new(120, 12)).expect("test terminal");

        draw(&mut terminal, &app);
        let text = buffer_text(&terminal);

        assert!(text.contains("refresh failed: daemon unavailable"));
        assert!(text.contains("agent-00"));
        assert!(text.contains("agent-01"));
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
        let text = buffer_text(&terminal);

        assert_eq!(hit_map.click_at(0, 1), None, "modal prevents click-through");
        assert!(!text.lines().rev().take(2).any(|line| line.contains("refresh")));
        let confirmation = HitTarget::Action(MouseAction::Key(
            crossterm::event::KeyCode::Char('y'),
            crossterm::event::KeyModifiers::NONE,
        ));
        let area = hit_map
            .clicks
            .iter()
            .find_map(|(area, target)| (target == &confirmation).then_some(*area))
            .expect("confirmation control");
        assert_eq!(hit_map.click_at(area.x, area.y), Some(confirmation.clone()));
        assert_eq!(
            hit_map
                .clicks
                .iter()
                .filter(|(_, target)| target == &confirmation)
                .count(),
            1,
            "modal controls are registered once"
        );
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
        assert!(text.contains("Agent:    ◂ full"));
        assert!(text.contains("Variant:  ◂ default"));
        assert!(text.contains("Name:       full"));
        assert!(text.contains("Env file:   default: .env beside manifest"));
        assert!(text.contains(" enter  create   tab/↑/↓  field   ←/→  select   esc  cancel"));
        let initial_geometry = create_modal_geometry(&text);
        let agent_line = text.lines().find(|line| line.contains("Agent:")).expect("Agent row");
        let variant_line = text
            .lines()
            .find(|line| line.contains("Variant:"))
            .expect("Variant row");
        let name_line = text.lines().find(|line| line.contains("Name:")).expect("Name row");
        let env_line = text
            .lines()
            .find(|line| line.contains("Env file:"))
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
        assert!(text.contains("Agent:    ◂ broken"));
        assert!(text.contains("Variant:  ◂ default"));
        assert!(text.contains("manifest cannot be decoded"));
        assert!(text.contains("Name:       copy▏"));
        assert!(text.contains("Env file:   default: .env beside manifest"));
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
        let agent_line = text.lines().find(|line| line.contains("Agent:")).expect("Agent row");
        let agent_line = agent_line.replace('\\', "/");
        assert!(agent_line.contains('…'));
        assert!(agent_line.contains("/not/fit/inside/the/create/agent/modal/agents/full"));
        assert!(!agent_line.contains("/a/source/directory"));
        assert!(
            agent_line.trim_end().ends_with('│'),
            "path remains inside the modal: {agent_line}"
        );
    }

    #[test]
    fn create_agent_placeholder_first_character_is_the_block_cursor() {
        use super::super::app::{CreateField, CreateForm, ManifestCandidate};

        let mut form = CreateForm::new(
            vec![ManifestCandidate::new(
                std::path::PathBuf::from("/sources/full/agent.yaml"),
                Ok("full".into()),
            )],
            None,
        );
        form.field = CreateField::Name;
        let spans = name_field_spans(&form);
        assert_eq!(spans[1].content, "f");
        assert!(spans[1].style.add_modifier.contains(Modifier::REVERSED));
        assert_eq!(spans[2].content, "ull");

        let typed = CreateForm {
            name: "my".into(),
            ..form
        };
        let spans = name_field_spans(&typed);
        assert_eq!(spans[1].content, "my");
        assert_eq!(spans[2].content, "▏");
    }

    #[test]
    fn header_reports_a_running_manifest_scan() {
        let mut app = App::new();
        app.discovering = true;
        let mut terminal = Terminal::new(TestBackend::new(140, 12)).expect("test terminal");
        draw(&mut terminal, &app);
        assert!(buffer_text(&terminal).contains("scanning manifests"));
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
