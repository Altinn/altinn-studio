//! Local terminal plumbing for daemon-owned interactive streams.

use std::io::IsTerminal as _;

use agent::{Error, control_api::AttachedTerminal};
use crossterm::event::{
    Event, EventStream, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEvent, MouseEventKind,
};
use futures_util::StreamExt as _;
use sandbox::terminal::{TerminalAttachOutcome, TerminalEvent, TerminalSize};
use tokio::io::AsyncWriteExt as _;

const DETACH: u8 = 0x1d; // Ctrl+], matching the former Microsandbox attachment default.

/// Returns the current terminal size after validating interactive stdio.
pub(super) fn current_size() -> Result<TerminalSize, Error> {
    if !std::io::stdin().is_terminal() || !std::io::stdout().is_terminal() {
        return Err(Error::Invalid(
            "operation requires an interactive local terminal".into(),
        ));
    }
    let (columns, rows) = crossterm::terminal::size()?;
    TerminalSize::new(rows, columns).map_err(|error| Error::Invalid(error.to_string()))
}

/// Pumps raw input, output, and resizes until the remote terminal ends.
pub(super) async fn run(terminal: AttachedTerminal) -> Result<TerminalAttachOutcome, Error> {
    let _raw_mode = RawMode::enter()?;
    let AttachedTerminal {
        mut input, mut events, ..
    } = terminal;
    // EventStream owns a wakeable terminal reader. Unlike Tokio's blocking
    // stdin adapter, it can be dropped when an attachment ends before the TUI
    // resumes, without consuming a later keystroke.
    let mut local_events = EventStream::new();
    let mut stdout = tokio::io::stdout();

    loop {
        tokio::select! {
            event = local_events.next() => {
                let event = event
                    .ok_or_else(|| Error::Session("local terminal event stream ended".into()))??;
                match encode_event(event) {
                    Some(LocalInput::Bytes(data)) if data.contains(&DETACH) => {
                        return Ok(TerminalAttachOutcome::Detached);
                    }
                    Some(LocalInput::Bytes(data)) => input.write(&data).await?,
                    Some(LocalInput::Resize(size)) => input.resize(size).await?,
                    None => {}
                }
            }
            event = events.next() => match event? {
                Some(TerminalEvent::Started { .. }) => {}
                Some(TerminalEvent::Output(data)) => {
                    stdout.write_all(&data).await?;
                    stdout.flush().await?;
                }
                Some(TerminalEvent::Exited(status)) => {
                    stdout.flush().await?;
                    return Ok(TerminalAttachOutcome::Exited(status));
                }
                Some(TerminalEvent::Failed { message }) => return Err(Error::Session(message)),
                Some(_) => return Err(Error::Session("terminal stream returned an unsupported event".into())),
                None => return Err(Error::Session("terminal stream ended without an outcome".into())),
            },
        }
    }
}

#[derive(Debug, Eq, PartialEq)]
enum LocalInput {
    Bytes(Vec<u8>),
    Resize(TerminalSize),
}

fn encode_event(event: Event) -> Option<LocalInput> {
    match event {
        Event::Key(key) if key.kind != KeyEventKind::Release => encode_key(key).map(LocalInput::Bytes),
        Event::Paste(text) => Some(LocalInput::Bytes(
            [b"\x1b[200~".as_slice(), text.as_bytes(), b"\x1b[201~".as_slice()].concat(),
        )),
        Event::Mouse(mouse) => Some(LocalInput::Bytes(encode_mouse(mouse))),
        Event::FocusGained => Some(LocalInput::Bytes(b"\x1b[I".to_vec())),
        Event::FocusLost => Some(LocalInput::Bytes(b"\x1b[O".to_vec())),
        Event::Resize(columns, rows) => TerminalSize::new(rows, columns).ok().map(LocalInput::Resize),
        Event::Key(_) => None,
    }
}

fn encode_key(key: KeyEvent) -> Option<Vec<u8>> {
    let modifiers = key.modifiers;
    let bytes = match key.code {
        KeyCode::Char(character) => return Some(encode_character(character, modifiers)),
        KeyCode::Backspace => with_alt(vec![0x7f], modifiers),
        KeyCode::Enter => with_alt(vec![b'\r'], modifiers),
        KeyCode::Tab => with_alt(vec![b'\t'], modifiers),
        KeyCode::BackTab => b"\x1b[Z".to_vec(),
        KeyCode::Esc => with_alt(vec![0x1b], modifiers),
        KeyCode::Null => with_alt(vec![0], modifiers),
        KeyCode::Up => cursor_sequence('A', modifiers),
        KeyCode::Down => cursor_sequence('B', modifiers),
        KeyCode::Right => cursor_sequence('C', modifiers),
        KeyCode::Left => cursor_sequence('D', modifiers),
        KeyCode::KeypadBegin => cursor_sequence('E', modifiers),
        KeyCode::End => cursor_sequence('F', modifiers),
        KeyCode::Home => cursor_sequence('H', modifiers),
        KeyCode::Insert => tilde_sequence(2, modifiers),
        KeyCode::Delete => tilde_sequence(3, modifiers),
        KeyCode::PageUp => tilde_sequence(5, modifiers),
        KeyCode::PageDown => tilde_sequence(6, modifiers),
        KeyCode::F(number) => function_key_sequence(number, modifiers)?,
        _ => return None,
    };
    Some(bytes)
}

fn encode_character(character: char, modifiers: KeyModifiers) -> Vec<u8> {
    let mut bytes = if modifiers.contains(KeyModifiers::CONTROL) {
        control_byte(character).map_or_else(|| character.to_string().into_bytes(), |byte| vec![byte])
    } else {
        character.to_string().into_bytes()
    };
    if modifiers.contains(KeyModifiers::ALT) {
        bytes.insert(0, 0x1b);
    }
    bytes
}

const fn control_byte(character: char) -> Option<u8> {
    match character {
        ' ' | '@' | '2' => Some(0),
        'a'..='z' => Some((character as u8) - b'a' + 1),
        'A'..='Z' => Some((character as u8) - b'A' + 1),
        '[' | '3' => Some(0x1b),
        '\\' | '4' => Some(0x1c),
        ']' | '5' => Some(DETACH),
        '^' | '6' => Some(0x1e),
        '/' | '_' | '7' => Some(0x1f),
        '?' | '8' => Some(0x7f),
        _ => None,
    }
}

fn with_alt(mut bytes: Vec<u8>, modifiers: KeyModifiers) -> Vec<u8> {
    if modifiers.contains(KeyModifiers::ALT) {
        bytes.insert(0, 0x1b);
    }
    bytes
}

fn cursor_sequence(final_byte: char, modifiers: KeyModifiers) -> Vec<u8> {
    if modifier_parameter(modifiers) == 1 {
        format!("\x1b[{final_byte}").into_bytes()
    } else {
        format!("\x1b[1;{}{final_byte}", modifier_parameter(modifiers)).into_bytes()
    }
}

fn tilde_sequence(number: u8, modifiers: KeyModifiers) -> Vec<u8> {
    if modifier_parameter(modifiers) == 1 {
        format!("\x1b[{number}~").into_bytes()
    } else {
        format!("\x1b[{number};{}~", modifier_parameter(modifiers)).into_bytes()
    }
}

fn function_key_sequence(number: u8, modifiers: KeyModifiers) -> Option<Vec<u8>> {
    let modifier = modifier_parameter(modifiers);
    if let Some(final_byte) = ['P', 'Q', 'R', 'S'].get(usize::from(number.checked_sub(1)?)) {
        return Some(if modifier == 1 {
            format!("\x1bO{final_byte}").into_bytes()
        } else {
            format!("\x1b[1;{modifier}{final_byte}").into_bytes()
        });
    }
    let parameter = match number {
        5 => 15,
        6 => 17,
        7 => 18,
        8 => 19,
        9 => 20,
        10 => 21,
        11 => 23,
        12 => 24,
        13 => 25,
        14 => 26,
        15 => 28,
        16 => 29,
        17 => 31,
        18 => 32,
        19 => 33,
        20 => 34,
        _ => return None,
    };
    Some(tilde_sequence(parameter, modifiers))
}

const fn modifier_parameter(modifiers: KeyModifiers) -> u8 {
    1 + if modifiers.contains(KeyModifiers::SHIFT) { 1 } else { 0 }
        + if modifiers.contains(KeyModifiers::ALT) { 2 } else { 0 }
        + if modifiers.contains(KeyModifiers::CONTROL) {
            4
        } else {
            0
        }
        + if modifiers.contains(KeyModifiers::SUPER) { 8 } else { 0 }
        + if modifiers.contains(KeyModifiers::HYPER) { 16 } else { 0 }
        + if modifiers.contains(KeyModifiers::META) { 32 } else { 0 }
}

fn encode_mouse(mouse: MouseEvent) -> Vec<u8> {
    let modifiers = (if mouse.modifiers.contains(KeyModifiers::SHIFT) {
        4
    } else {
        0
    }) + (if mouse.modifiers.contains(KeyModifiers::ALT) {
        8
    } else {
        0
    }) + (if mouse.modifiers.contains(KeyModifiers::CONTROL) {
        16
    } else {
        0
    });
    let (button, suffix) = match mouse.kind {
        MouseEventKind::Down(button) => (mouse_button(button), 'M'),
        MouseEventKind::Up(button) => (mouse_button(button), 'm'),
        MouseEventKind::Drag(button) => (32 + mouse_button(button), 'M'),
        MouseEventKind::Moved => (35, 'M'),
        MouseEventKind::ScrollUp => (64, 'M'),
        MouseEventKind::ScrollDown => (65, 'M'),
        MouseEventKind::ScrollLeft => (66, 'M'),
        MouseEventKind::ScrollRight => (67, 'M'),
    };
    format!(
        "\x1b[<{};{};{}{suffix}",
        button + modifiers,
        u32::from(mouse.column) + 1,
        u32::from(mouse.row) + 1
    )
    .into_bytes()
}

const fn mouse_button(button: MouseButton) -> u8 {
    match button {
        MouseButton::Left => 0,
        MouseButton::Middle => 1,
        MouseButton::Right => 2,
    }
}

struct RawMode;

impl RawMode {
    fn enter() -> Result<Self, Error> {
        crossterm::terminal::enable_raw_mode()?;
        Ok(Self)
    }
}

impl Drop for RawMode {
    fn drop(&mut self) {
        let _ignored = crossterm::terminal::disable_raw_mode();
    }
}

#[cfg(test)]
mod tests {
    use crossterm::event::{Event, KeyCode, KeyEvent, KeyModifiers, MouseButton, MouseEvent, MouseEventKind};

    use super::{LocalInput, encode_event};

    #[test]
    fn encodes_text_control_navigation_and_detach_keys() {
        assert_eq!(key(KeyCode::Char('x'), KeyModifiers::NONE), b"x");
        assert_eq!(key(KeyCode::Char('c'), KeyModifiers::CONTROL), [0x03]);
        assert_eq!(key(KeyCode::Char('x'), KeyModifiers::ALT), b"\x1bx");
        assert_eq!(key(KeyCode::Up, KeyModifiers::CONTROL), b"\x1b[1;5A");
        assert_eq!(key(KeyCode::Char(']'), KeyModifiers::CONTROL), [0x1d]);
    }

    #[test]
    fn encodes_bracketed_paste_mouse_and_resize_events() {
        assert_eq!(
            encode_event(Event::Paste("hello".into())),
            Some(LocalInput::Bytes(b"\x1b[200~hello\x1b[201~".to_vec()))
        );
        assert_eq!(
            encode_event(Event::Mouse(MouseEvent {
                kind: MouseEventKind::Down(MouseButton::Left),
                column: 4,
                row: 6,
                modifiers: KeyModifiers::CONTROL,
            })),
            Some(LocalInput::Bytes(b"\x1b[<16;5;7M".to_vec()))
        );
        let size = sandbox::terminal::TerminalSize::new(40, 120).expect("test size");
        assert_eq!(encode_event(Event::Resize(120, 40)), Some(LocalInput::Resize(size)));
    }

    fn key(code: KeyCode, modifiers: KeyModifiers) -> Vec<u8> {
        let Some(LocalInput::Bytes(bytes)) = encode_event(Event::Key(KeyEvent::new(code, modifiers))) else {
            panic!("key should encode as input bytes");
        };
        bytes
    }
}
