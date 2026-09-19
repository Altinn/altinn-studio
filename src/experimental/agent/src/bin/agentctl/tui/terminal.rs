use std::{
    fmt,
    io::{Stdout, Write},
};

use agent::Error;
use crossterm::{
    Command,
    cursor::Show,
    event::{DisableMouseCapture, EnableMouseCapture},
    terminal::{Clear, ClearType, EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{Terminal, backend::CrosstermBackend};

use super::app::App;
use super::view;

pub(crate) struct Tui {
    terminal: Terminal<CrosstermBackend<Stdout>>,
    view_state: view::ViewState,
    pointer_shape: PointerShape,
    active: bool,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
enum PointerShape {
    #[default]
    Default,
    Pointer,
}

struct SetPointerShape(PointerShape);

impl Command for SetPointerShape {
    fn write_ansi(&self, output: &mut impl fmt::Write) -> fmt::Result {
        let shape = match self.0 {
            PointerShape::Default => "default",
            PointerShape::Pointer => "pointer",
        };
        write!(output, "\x1b]22;{shape}\x1b\\")
    }

    #[cfg(windows)]
    fn execute_winapi(&self) -> std::io::Result<()> {
        Ok(())
    }
}

struct ResetPointerShape;

impl Command for ResetPointerShape {
    fn write_ansi(&self, output: &mut impl fmt::Write) -> fmt::Result {
        output.write_str("\x1b]22;\x1b\\")
    }

    #[cfg(windows)]
    fn execute_winapi(&self) -> std::io::Result<()> {
        Ok(())
    }
}

impl Tui {
    pub(crate) fn enter() -> Result<Self, Error> {
        install_panic_hook();
        activate()?;
        let terminal = match Terminal::new(CrosstermBackend::new(std::io::stdout())) {
            Ok(terminal) => terminal,
            Err(error) => {
                let _ = deactivate();
                return Err(Error::from(error));
            }
        };
        Ok(Self {
            terminal,
            view_state: view::ViewState::default(),
            pointer_shape: PointerShape::Default,
            active: true,
        })
    }

    pub(crate) fn draw(&mut self, app: &App) -> Result<view::HitMap, Error> {
        let mut hit_map = None;
        let view_state = &mut self.view_state;
        self.terminal
            .draw(|frame| hit_map = Some(view::render(frame, app, view_state)))
            .map_err(Error::from)?;
        Ok(hit_map.unwrap_or_default())
    }

    pub(crate) fn set_pointer_for(
        &mut self,
        hit_map: &view::HitMap,
        position: Option<(u16, u16)>,
    ) -> Result<(), Error> {
        let shape = if position.is_some_and(|(column, row)| hit_map.clickable_at(column, row)) {
            PointerShape::Pointer
        } else {
            PointerShape::Default
        };
        if shape != self.pointer_shape {
            crossterm::execute!(std::io::stdout(), SetPointerShape(shape))?;
            self.pointer_shape = shape;
        }
        Ok(())
    }

    pub(crate) fn suspend(&mut self) -> Result<(), Error> {
        deactivate()?;
        self.pointer_shape = PointerShape::Default;
        self.active = false;
        Ok(())
    }

    pub(crate) fn resume(&mut self) -> Result<(), Error> {
        activate()?;
        self.pointer_shape = PointerShape::Default;
        self.active = true;
        crossterm::execute!(std::io::stdout(), Clear(ClearType::All))?;
        self.terminal = Terminal::new(CrosstermBackend::new(std::io::stdout())).map_err(Error::from)?;
        Ok(())
    }

    pub(crate) fn restore(&mut self) -> Result<(), Error> {
        self.suspend()
    }
}

impl Drop for Tui {
    fn drop(&mut self) {
        if self.active {
            let _ = deactivate();
        }
    }
}

fn activate() -> Result<(), Error> {
    enable_raw_mode()?;
    if let Err(error) = enter_screen(&mut std::io::stdout()) {
        let _ = deactivate();
        return Err(Error::from(error));
    }
    Ok(())
}

fn deactivate() -> Result<(), Error> {
    let screen = leave_screen(&mut std::io::stdout());
    let raw = disable_raw_mode();
    screen?;
    raw.map_err(Error::from)
}

fn enter_screen(output: &mut impl Write) -> std::io::Result<()> {
    crossterm::execute!(
        output,
        EnterAlternateScreen,
        EnableMouseCapture,
        SetPointerShape(PointerShape::Default)
    )
}

fn leave_screen(output: &mut impl Write) -> std::io::Result<()> {
    crossterm::execute!(
        output,
        ResetPointerShape,
        DisableMouseCapture,
        LeaveAlternateScreen,
        Show
    )
}

fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = deactivate();
        previous(info);
    }));
}

#[cfg(test)]
mod tests {
    #![allow(clippy::expect_used)]

    use super::*;

    #[test]
    fn screen_activation_enables_mouse_capture_after_entering_the_alternate_screen() {
        let mut output = Vec::new();

        enter_screen(&mut output).expect("screen activation");

        let output = String::from_utf8(output).expect("terminal commands are UTF-8");
        let alternate = output.find("?1049h").expect("enter alternate screen");
        let mouse = output.find("?1000h").expect("enable mouse capture");
        let pointer = output.find("]22;default").expect("set default pointer shape");
        assert!(alternate < mouse);
        assert!(mouse < pointer);
    }

    #[test]
    fn screen_cleanup_disables_mouse_capture_before_leaving_the_alternate_screen() {
        let mut output = Vec::new();

        leave_screen(&mut output).expect("screen cleanup");

        let output = String::from_utf8(output).expect("terminal commands are UTF-8");
        let pointer = output.find("]22;").expect("reset pointer shape");
        let mouse = output.find("?1006l").expect("disable mouse capture");
        let alternate = output.find("?1049l").expect("leave alternate screen");
        assert!(pointer < mouse);
        assert!(mouse < alternate);
    }

    #[test]
    fn pointer_shape_commands_use_osc_22_and_can_restore_the_terminal_default() {
        let mut output = Vec::new();

        crossterm::execute!(output, SetPointerShape(PointerShape::Pointer), ResetPointerShape)
            .expect("pointer commands");

        assert_eq!(output, b"\x1b]22;pointer\x1b\\\x1b]22;\x1b\\");
    }
}
