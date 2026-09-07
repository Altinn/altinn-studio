use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Clear, List, ListItem, ListState, Paragraph, Wrap},
};

use super::MANIFEST_FILE;
use super::app::{App, ForwardField, Modal, Tone};

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
        Modal::NewSession {
            agent,
            name,
            harnesses,
            harness,
            error,
        } => {
            let mut harness_spans = vec![Span::raw("Harness: ")];
            for (index, kind) in harnesses.iter().enumerate() {
                if index > 0 {
                    harness_spans.push(Span::raw("  "));
                }
                let style = if index == *harness {
                    Style::new().fg(Color::Cyan).add_modifier(Modifier::REVERSED)
                } else {
                    Style::new().fg(Color::DarkGray)
                };
                harness_spans.push(Span::styled(kind.as_str(), style));
            }
            let mut lines = vec![
                Line::from(format!("Agent:   {agent}")),
                Line::from(vec![
                    Span::raw(format!("Name:    {name}")),
                    Span::styled("▏", Style::new().fg(Color::Cyan)),
                ]),
                Line::from(harness_spans),
            ];
            if let Some(error) = error {
                lines.push(Line::from(Span::styled(error.clone(), Style::new().fg(Color::Red))));
            }
            lines.push(Line::default());
            lines.push(hint_line(&[("enter", "create"), ("tab", "harness"), ("esc", "cancel")]));
            popup(frame, area, " new session ", Color::Cyan, lines);
        }
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

fn render_create_agent(frame: &mut Frame, area: Rect, form: &super::app::CreateForm) {
    let mut lines = form.candidates.get(form.selected).map_or_else(
        || {
            vec![
                Line::from("No agent manifests found."),
                Line::from(Span::styled(
                    format!("Start the TUI from a directory containing {MANIFEST_FILE},"),
                    Style::new().fg(Color::DarkGray),
                )),
                Line::from(Span::styled(
                    "or apply one first: agentctl apply -f",
                    Style::new().fg(Color::DarkGray),
                )),
            ]
        },
        |candidate| picker_lines(form, candidate),
    );
    if let Some(error) = &form.error {
        lines.push(Line::from(Span::styled(error.clone(), Style::new().fg(Color::Red))));
    }
    lines.push(Line::default());
    lines.push(hint_line(&[
        ("enter", "create"),
        ("tab", "manifest"),
        ("esc", "cancel"),
    ]));
    popup(frame, area, " create agent ", Color::Cyan, lines);
}

fn picker_lines(form: &super::app::CreateForm, candidate: &super::app::ManifestCandidate) -> Vec<Line<'static>> {
    let directory = candidate
        .path
        .parent()
        .map_or_else(String::new, |parent| abbreviate_home(&parent.display().to_string()));
    let mut manifest_spans = vec![
        Span::raw("Manifest: "),
        Span::styled("◂ ", Style::new().fg(Color::DarkGray)),
    ];
    if let Ok(name) = &candidate.name {
        manifest_spans.push(Span::styled(name.clone(), Style::new().fg(Color::Cyan)));
        manifest_spans.push(Span::styled(" | ", Style::new().fg(Color::DarkGray)));
    }
    manifest_spans.extend([
        Span::styled(directory, Style::new().fg(Color::DarkGray)),
        Span::styled(" ▸", Style::new().fg(Color::DarkGray)),
        Span::styled(
            format!("  {}/{}", form.selected + 1, form.candidates.len()),
            Style::new().fg(Color::DarkGray),
        ),
    ]);
    let mut lines = vec![Line::from(manifest_spans)];
    if let Err(invalid) = &candidate.name {
        lines.push(Line::from(Span::styled(
            format!("          {invalid}"),
            Style::new().fg(Color::Red),
        )));
    }
    lines.push(Line::from(name_field_spans(form)));
    lines
}

/// Renders the name input; an empty buffer shows the placeholder with a
/// block cursor over its first character, so the cursor sits flush against
/// the grayed text instead of leaving a cell-wide gap before it.
fn name_field_spans(form: &super::app::CreateForm) -> Vec<Span<'static>> {
    let mut spans = vec![Span::raw("Name:     ")];
    if !form.name.is_empty() {
        spans.push(Span::raw(form.name.clone()));
        spans.push(Span::styled("▏", Style::new().fg(Color::Cyan)));
        return spans;
    }
    let mut placeholder = form.placeholder().unwrap_or_default().chars();
    match placeholder.next() {
        Some(first) => {
            spans.push(Span::styled(
                first.to_string(),
                Style::new().fg(Color::DarkGray).add_modifier(Modifier::REVERSED),
            ));
            spans.push(Span::styled(
                placeholder.collect::<String>(),
                Style::new().fg(Color::DarkGray),
            ));
        }
        None => spans.push(Span::styled("▏", Style::new().fg(Color::Cyan))),
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
    let target = centered_rect(area, width, height);
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
        use super::super::app::{CreateForm, ManifestCandidate};

        let mut app = App::new();
        app.modal = Some(Modal::CreateAgent(CreateForm {
            candidates: vec![
                ManifestCandidate {
                    path: std::path::PathBuf::from("/sources/full/agent.yaml"),
                    name: Ok("full".into()),
                },
                ManifestCandidate {
                    path: std::path::PathBuf::from("/sources/broken/agent.yaml"),
                    name: Err("manifest cannot be decoded".into()),
                },
            ],
            selected: 0,
            name: String::new(),
            error: None,
        }));
        let mut terminal = Terminal::new(TestBackend::new(80, 14)).expect("test terminal");
        terminal.draw(|frame| render(frame, &app)).expect("modal draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("create agent"));
        assert!(text.contains("◂ full | /sources/full ▸"));
        assert!(text.contains("1/2"));
        assert!(text.contains("Name:     full"));
        assert!(text.contains("enter create · tab manifest · esc cancel"));

        let Some(Modal::CreateAgent(form)) = &mut app.modal else {
            panic!("expected the CreateAgent modal");
        };
        form.selected = 1;
        form.name = "copy".into();
        form.error = Some("agent \"copy\" already exists".into());
        terminal.draw(|frame| render(frame, &app)).expect("error draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("◂ /sources/broken ▸"));
        assert!(text.contains("manifest cannot be decoded"));
        assert!(text.contains("Name:     copy▏"));
        assert!(text.contains("agent \"copy\" already exists"));
    }

    #[test]
    fn create_agent_placeholder_first_character_is_the_block_cursor() {
        use super::super::app::{CreateForm, ManifestCandidate};

        let form = CreateForm {
            candidates: vec![ManifestCandidate {
                path: std::path::PathBuf::from("/sources/full/agent.yaml"),
                name: Ok("full".into()),
            }],
            selected: 0,
            name: String::new(),
            error: None,
        };
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
        app.modal = Some(Modal::CreateAgent(CreateForm {
            candidates: Vec::new(),
            selected: 0,
            name: String::new(),
            error: None,
        }));
        let mut terminal = Terminal::new(TestBackend::new(80, 14)).expect("test terminal");
        terminal.draw(|frame| render(frame, &app)).expect("empty draw");
        let text = buffer_text(&terminal);
        assert!(text.contains("No agent manifests found."));
        assert!(text.contains("agentctl apply -f"));
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
