use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Clear, List, ListItem, ListState, Paragraph, Wrap},
};

use super::MANIFEST_FILE;
use super::app::{App, ForwardField, Modal, Tone};

const CREATE_AGENT_POPUP_WIDTH: u16 = 96;
const CREATE_AGENT_POPUP_HEIGHT: u16 = 8;
const CREATE_AGENT_FIELD_ROWS: usize = 4;
const CREATE_FIELD_LABEL_WIDTH: usize = 10;
const CREATE_PICKER_VALUE_WIDTH: usize = 18;

pub(crate) fn render(frame: &mut Frame, app: &App) {
    let [header, body, footer] =
        Layout::vertical([Constraint::Length(1), Constraint::Min(0), Constraint::Length(2)]).areas(frame.area());
    render_header(frame, header, app);
    if let Some(detail) = &app.detail {
        render_detail(frame, body, detail);
    } else if let Some(error) = &app.error {
        render_error(frame, body, error);
    } else if app.view == super::app::View::Forwards {
        render_forwards(frame, body, app);
    } else {
        render_tree(frame, body, app);
    }
    render_footer(frame, footer, app);
    if let Some(modal) = &app.modal {
        render_modal(frame, body, modal);
    }
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

fn render_tree(frame: &mut Frame, area: Rect, app: &App) {
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
    let mut state = ListState::default().with_selected(Some(app.selected));
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_forwards(frame: &mut Frame, area: Rect, app: &App) {
    let block = Block::bordered().title(" port-forwards ");
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
    let mut state = ListState::default().with_selected(Some(app.forward_selected));
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_detail(frame: &mut Frame, area: Rect, detail: &super::app::Detail) {
    let block = Block::bordered().title(format!(" {} — q back · ↑/↓ scroll ", detail.title));
    let scroll = u16::try_from(detail.scroll).unwrap_or(u16::MAX);
    let paragraph = Paragraph::new(detail.lines.join("\n")).block(block).scroll((scroll, 0));
    frame.render_widget(paragraph, area);
}

fn render_error(frame: &mut Frame, area: Rect, error: &str) {
    let paragraph = Paragraph::new(format!("{error}\n\nr retry · q quit"))
        .style(Style::new().fg(Color::Red))
        .wrap(Wrap { trim: false });
    frame.render_widget(paragraph, area);
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

fn render_modal(frame: &mut Frame, area: Rect, modal: &Modal) {
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
            popup(frame, area, " delete ", Color::Red, lines);
        }
        Modal::NewSession(form) => render_new_session(frame, area, form),
        Modal::CreateAgent(form) => render_create_agent(frame, area, form),
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
            lines.push(hint_line(&[("enter", "forward"), ("tab", "field"), ("esc", "cancel")]));
            let title = if form.replace.is_some() {
                " edit forward "
            } else {
                " port forward "
            };
            popup(frame, area, title, Color::Cyan, lines);
        }
    }
}

fn render_new_session(frame: &mut Frame, area: Rect, form: &super::app::SessionForm) {
    use super::app::SessionField;

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
    lines.push(hint_line(&super::app::NEW_SESSION_HINTS));
    popup(frame, area, " new session ", Color::Cyan, lines);
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

fn render_create_agent(frame: &mut Frame, area: Rect, form: &super::app::CreateForm) {
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
        |(agent, candidate)| picker_lines(form, agent, candidate),
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
    lines.push(hint_line(&[
        ("enter", "create"),
        ("tab", "field"),
        ("←/→", "select"),
        ("esc", "cancel"),
    ]));
    popup_sized(
        frame,
        area,
        " create agent ",
        Color::Cyan,
        lines,
        CREATE_AGENT_POPUP_WIDTH,
        CREATE_AGENT_POPUP_HEIGHT,
    );
}

fn picker_lines(
    form: &super::app::CreateForm,
    agent: &super::app::AgentDefinition,
    candidate: &super::app::ManifestCandidate,
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
            agent_path,
            form.field == super::app::CreateField::Agent,
            form.agent,
            form.agents.len(),
        ),
        picker_line(
            "Variant:",
            &variant_label,
            manifest_file,
            form.field == super::app::CreateField::Variant,
            form.variant,
            agent.variants.len(),
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
    detail: String,
    focused: bool,
    selected: usize,
    total: usize,
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
        Span::styled(detail, Style::new().fg(Color::DarkGray)),
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

fn popup(frame: &mut Frame, area: Rect, title: &str, border: Color, lines: Vec<Line<'_>>) {
    let height = u16::try_from(lines.len()).unwrap_or(u16::MAX).saturating_add(2);
    let content = lines
        .iter()
        .map(Line::width)
        .max()
        .and_then(|width| u16::try_from(width).ok())
        .unwrap_or(u16::MAX)
        .saturating_add(2);
    let width = (area.width / 2).max(content).min(area.width);
    popup_sized(frame, area, title, border, lines, width, height);
}

fn popup_sized(
    frame: &mut Frame,
    area: Rect,
    title: &str,
    border: Color,
    lines: Vec<Line<'_>>,
    width: u16,
    height: u16,
) {
    let target = centered_rect(area, width.min(area.width), height.min(area.height));
    frame.render_widget(Clear, target);
    let block = Block::bordered()
        .title(title.to_owned())
        .border_style(Style::new().fg(border));
    frame.render_widget(Paragraph::new(lines).block(block), target);
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
        terminal.draw(|frame| render(frame, &app)).expect("first draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("agentctl"));
        assert!(text.contains("0 agents · 0 sessions · 0 running"));
        assert!(text.contains("loading…"));
        assert!(text.contains("j/k move · r refresh · F forwards · q quit"));
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
        terminal.draw(|frame| render(frame, &app)).expect("modal draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("create agent"));
        assert!(text.contains("Agent:    ◂ full"));
        assert!(text.contains("Variant:  ◂ default"));
        assert!(text.contains("Name:       full"));
        assert!(text.contains("Env file:   default: .env beside manifest"));
        assert!(text.contains("enter create · tab field · ←/→ select · esc cancel"));
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

        let Some(Modal::CreateAgent(form)) = &mut app.modal else {
            panic!("expected the CreateAgent modal");
        };
        form.agent = 1;
        form.variant = 0;
        form.field = CreateField::Name;
        form.name = "copy".into();
        terminal.draw(|frame| render(frame, &app)).expect("error draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("Agent:    ◂ broken"));
        assert!(text.contains("Variant:  ◂ default"));
        assert!(text.contains("manifest cannot be decoded"));
        assert!(text.contains("Name:       copy▏"));
        assert!(text.contains("Env file:   default: .env beside manifest"));
        assert_eq!(create_modal_geometry(&text), initial_geometry);
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
        terminal.draw(|frame| render(frame, &app)).expect("draw");
        assert!(buffer_text(&terminal).contains("scanning manifests…"));
    }

    #[test]
    fn create_agent_modal_explains_an_empty_picker() {
        use super::super::app::CreateForm;

        let mut app = App::new();
        app.modal = Some(Modal::CreateAgent(CreateForm::new(Vec::new(), None)));
        let mut terminal = Terminal::new(TestBackend::new(80, 14)).expect("test terminal");
        terminal.draw(|frame| render(frame, &app)).expect("empty draw");
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
