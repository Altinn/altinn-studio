//! Windows console events encoded for the remote terminal.

#[cfg(windows)]
use agent::Error;
#[cfg(windows)]
use crossterm::event::EventStream;
use crossterm::event::{Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEvent, MouseEventKind};
#[cfg(windows)]
use futures_util::StreamExt as _;
use sandbox::terminal::TerminalSize;

use super::{DETACH, LocalInput};

#[cfg(windows)]
pub(super) struct LocalEvents {
    events: EventStream,
    open: bool,
}

#[cfg(windows)]
impl LocalEvents {
    pub(super) fn open() -> Self {
        Self {
            events: EventStream::new(),
            open: true,
        }
    }

    pub(super) const fn is_open(&self) -> bool {
        self.open
    }

    pub(super) const fn close(&mut self) {
        self.open = false;
    }

    pub(super) async fn next(&mut self) -> Result<LocalInput, Error> {
        loop {
            let Some(event) = self.events.next().await else {
                return Ok(LocalInput::Close);
            };
            if let Some(input) = encode_event(event?) {
                return Ok(input);
            }
        }
    }
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

#[cfg(test)]
mod tests {
    use super::*;

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
