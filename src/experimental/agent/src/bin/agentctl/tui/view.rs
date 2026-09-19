use ratatui::{
    Frame,
    layout::{Constraint, Layout, Margin, Position, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Clear, List, ListItem, ListState, Paragraph, Wrap},
};

use super::MANIFEST_FILE;
use super::app::{
    App, CREATE_AGENT_HINTS, CreateField, ForwardField, Modal, MouseAction, Row, SessionField, Tone, View,
};

const CREATE_AGENT_POPUP_WIDTH: u16 = 96;
const CREATE_AGENT_POPUP_HEIGHT: u16 = 8;
const CREATE_AGENT_FIELD_ROWS: usize = 4;
const CREATE_FIELD_LABEL_WIDTH: usize = 10;
const CREATE_PICKER_VALUE_WIDTH: usize = 18;
const CREATE_PICKER_DETAIL_OFFSET: usize = CREATE_FIELD_LABEL_WIDTH + 2 + CREATE_PICKER_VALUE_WIDTH + 2 + 8;
const ERROR_HINTS: [(&str, &str); 2] = [("r", "retry"), ("q", "quit")];

#[derive(Default)]
pub(crate) struct ViewState {
    tree: ListState,
    forwards: ListState,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RowTarget {
    Tree(usize),
    Forward(usize),
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
    if let Some(detail) = &app.detail {
        render_detail(frame, body, detail, &mut hit_map);
    } else if let Some(error) = &app.error {
        render_error(frame, body, error, &mut hit_map);
    } else if app.view == View::Forwards {
        render_forwards(frame, body, app, state, &mut hit_map);
    } else {
        render_tree(frame, body, app, state, &mut hit_map);
    }
    render_footer(frame, footer, app);
    map_footer_targets(footer, app, &mut hit_map);
    if let Some(modal) = &app.modal {
        hit_map.clear();
        map_footer_targets(footer, app, &mut hit_map);
        render_modal(frame, body, modal, &mut hit_map);
    }
    hit_map
}

fn render_header(frame: &mut Frame, area: Rect, app: &App) {
    let (agents, sessions, running) = app.counts();
    let mut spans = vec![
        Span::styled(
            " agentctl ",
            Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED),
        ),
        Span::raw(" "),
        Span::styled(
            format!("{agents} agents · {sessions} sessions · {running} running"),
            Style::new().fg(Color::DarkGray),
        ),
    ];
    if app.loading {
        spans.push(Span::styled(" · ⟳", Style::new().fg(Color::Cyan)));
    }
    if app.creating > 0 {
        spans.push(Span::styled(" · creating forward…", Style::new().fg(Color::Cyan)));
    }
    if app.discovering {
        spans.push(Span::styled(" · scanning manifests…", Style::new().fg(Color::Cyan)));
    }
    frame.render_widget(Line::from(spans), area);
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
    let items = rows
        .iter()
        .map(|row| {
            let mut spans = Vec::new();
            if row.agent {
                spans.push(Span::styled(row.marker, Style::new().fg(tone_color(row.tone))));
            } else {
                spans.push(Span::styled(row.marker, Style::new().fg(Color::DarkGray)));
            }
            if let Some(dot) = row.dot {
                spans.push(Span::styled(dot, Style::new().fg(tone_color(row.tone))));
                spans.push(Span::raw(" "));
            }
            let label_style = if row.agent {
                Style::new().add_modifier(Modifier::BOLD)
            } else {
                Style::new()
            };
            spans.push(Span::styled(row.label.clone(), label_style));
            spans.push(Span::styled(
                format!("  {}", row.badge),
                Style::new().fg(Color::DarkGray),
            ));
            ListItem::new(Line::from(spans))
        })
        .collect::<Vec<_>>();
    let list = List::new(items).highlight_style(Style::new().add_modifier(Modifier::REVERSED));
    state.tree.select(Some(app.selected));
    frame.render_stateful_widget(list, area, &mut state.tree);
    hit_map.wheel(area, WheelTarget::Tree);
    for visible in 0..usize::from(area.height) {
        let index = state.tree.offset().saturating_add(visible);
        let Some(row) = app.rows.get(index) else {
            break;
        };
        let y = area.y.saturating_add(u16::try_from(visible).unwrap_or(u16::MAX));
        let row_area = Rect::new(area.x, y, area.width, 1);
        hit_map.click(row_area, HitTarget::Row(RowTarget::Tree(index)));
        if matches!(row, Row::Agent(_)) {
            hit_map.click(
                Rect::new(area.x, y, area.width.min(2), 1),
                HitTarget::Action(MouseAction::FoldTree(index)),
            );
        }
    }
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
            HitTarget::Row(RowTarget::Forward(index)),
        );
    }
}

fn render_detail(frame: &mut Frame, area: Rect, detail: &super::app::Detail, hit_map: &mut HitMap) {
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
        frame.render_widget(Line::from("r retry · q quit").style(Style::new().fg(Color::Red)), hints);
        map_hint_targets(hints, &ERROR_HINTS, hit_map);
    }
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App) {
    let [contextual, global] = Layout::vertical([Constraint::Length(1), Constraint::Length(1)]).areas(area);
    let mut spans = Vec::new();
    for (index, (key, description)) in app.hints().into_iter().enumerate() {
        if index > 0 {
            spans.push(Span::styled(" · ", Style::new().fg(Color::DarkGray)));
        }
        spans.push(Span::styled(key, Style::new().fg(Color::Cyan)));
        spans.push(Span::raw(" "));
        spans.push(Span::styled(description, Style::new().fg(Color::DarkGray)));
    }
    frame.render_widget(Line::from(spans), contextual);
    frame.render_widget(
        Line::from(Span::styled(
            "j/k move · r refresh · F forwards · q quit",
            Style::new().fg(Color::DarkGray),
        )),
        global,
    );
}

fn map_footer_targets(area: Rect, app: &App, hit_map: &mut HitMap) {
    let [contextual, global] = Layout::vertical([Constraint::Length(1), Constraint::Length(1)]).areas(area);
    if app.modal.is_some() {
        map_hint_targets(contextual, &app.hints(), hit_map);
        return;
    }
    if app.error.is_some() {
        map_hint_targets_matching(
            global,
            &[("j/k", "move"), ("r", "refresh"), ("F", "forwards"), ("q", "quit")],
            hit_map,
            |key| matches!(key, "r" | "q"),
        );
        return;
    }
    map_hint_targets(contextual, &app.hints(), hit_map);
    if app.detail.is_some() || app.view == View::Forwards {
        return;
    }
    let hints = [("j/k", "move"), ("r", "refresh"), ("F", "forwards"), ("q", "quit")];
    map_hint_targets(global, &hints, hit_map);
}

fn map_hint_targets(area: Rect, hints: &[(&str, &str)], hit_map: &mut HitMap) {
    map_hint_targets_matching(area, hints, hit_map, |_| true);
}

fn map_hint_targets_matching(area: Rect, hints: &[(&str, &str)], hit_map: &mut HitMap, include: impl Fn(&str) -> bool) {
    let mut x = area.x;
    for (index, (key, description)) in hints.iter().enumerate() {
        if index > 0 {
            x = x.saturating_add(3);
        }
        let width = u16::try_from(Line::from(format!("{key} {description}")).width()).unwrap_or(u16::MAX);
        if include(key)
            && let Some(action) = hint_action(key)
        {
            hit_map.click(
                Rect::new(x, area.y, width.min(area.right().saturating_sub(x)), 1),
                HitTarget::Action(action),
            );
        }
        x = x.saturating_add(width);
    }
}

fn hint_action(key: &str) -> Option<MouseAction> {
    let (code, modifiers) = match key {
        "enter" => (crossterm::event::KeyCode::Enter, crossterm::event::KeyModifiers::NONE),
        "tab" => (crossterm::event::KeyCode::Tab, crossterm::event::KeyModifiers::NONE),
        "esc" => (crossterm::event::KeyCode::Esc, crossterm::event::KeyModifiers::NONE),
        "ctrl-d" => (
            crossterm::event::KeyCode::Char('d'),
            crossterm::event::KeyModifiers::CONTROL,
        ),
        "F" => (
            crossterm::event::KeyCode::Char('F'),
            crossterm::event::KeyModifiers::NONE,
        ),
        "r" | "q" | "s" | "y" | "n" | "c" | "e" | "f" | "d" | "z" => (
            crossterm::event::KeyCode::Char(key.chars().next()?),
            crossterm::event::KeyModifiers::NONE,
        ),
        _ => return None,
    };
    Some(MouseAction::Key(code, modifiers))
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
                hint_line(&[("y", "confirm"), ("n", "cancel")]),
            ];
            let target = popup(frame, area, " delete ", Color::Red, lines);
            map_hint_targets(line_area(target, 3), &[("y", "confirm"), ("n", "cancel")], hit_map);
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
            let hints = [("enter", "forward"), ("tab", "field"), ("esc", "cancel")];
            let hint_row = lines.len();
            lines.push(hint_line(&hints));
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
            map_hint_targets(line_area(target, hint_row), &hints, hit_map);
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
    lines.push(hint_line(&super::app::NEW_SESSION_HINTS));
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
    map_hint_targets(line_area(target, hint_row), &super::app::NEW_SESSION_HINTS, hit_map);
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

fn hint_line(hints: &[(&'static str, &'static str)]) -> Line<'static> {
    let mut spans = Vec::new();
    for (index, (key, description)) in hints.iter().enumerate() {
        if index > 0 {
            spans.push(Span::styled(" · ", Style::new().fg(Color::DarkGray)));
        }
        spans.push(Span::styled(*key, Style::new().fg(Color::Cyan)));
        spans.push(Span::raw(" "));
        spans.push(Span::styled(*description, Style::new().fg(Color::DarkGray)));
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
        assert!(text.contains("0 agents · 0 sessions · 0 running"));
        assert!(text.contains("loading…"));
        assert!(text.contains("j/k move · r refresh · F forwards · q quit"));
    }

    #[test]
    fn tree_hit_map_uses_the_rendered_offset_and_updates_after_resize() {
        let mut app = tree_app(10);
        app.selected = 9;
        let mut state = ViewState::default();
        let mut terminal = Terminal::new(TestBackend::new(40, 8)).expect("test terminal");

        let compact = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree.offset(), 5);
        assert_eq!(compact.click_at(10, 1), Some(HitTarget::Row(RowTarget::Tree(5))));
        assert_eq!(compact.click_at(10, 5), Some(HitTarget::Row(RowTarget::Tree(9))));
        assert_eq!(compact.click_at(10, 6), None, "footer is not a list row");
        assert_eq!(compact.click_at(40, 1), None, "right edge is out of bounds");

        terminal.resize(Rect::new(0, 0, 40, 12)).expect("terminal resize");
        let resized = draw_with_state(&mut terminal, &app, &mut state);
        assert_eq!(state.tree.offset(), 5, "the viewport remains stable when it still fits");
        assert_eq!(resized.click_at(10, 1), Some(HitTarget::Row(RowTarget::Tree(5))));
        assert_eq!(
            resized.click_at(10, 6),
            None,
            "the resized map has no stale footer target"
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
        assert_eq!(hit_map.click_at(10, 4), Some(quit));
        assert_eq!(hit_map.click_at(8, 4), None, "separator is inert");
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
        assert!(text.contains("enter create · tab/↑/↓ field · ←/→ select · esc cancel"));
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
