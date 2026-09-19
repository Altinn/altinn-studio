use std::io::{Stdout, Write};

use agent::Error;
use crossterm::{
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
    active: bool,
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

    pub(crate) fn suspend(&mut self) -> Result<(), Error> {
        deactivate()?;
        self.active = false;
        Ok(())
    }

    pub(crate) fn resume(&mut self) -> Result<(), Error> {
        activate()?;
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
    crossterm::execute!(output, EnterAlternateScreen, EnableMouseCapture)
}

fn leave_screen(output: &mut impl Write) -> std::io::Result<()> {
    crossterm::execute!(output, DisableMouseCapture, LeaveAlternateScreen, Show)
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
        assert!(alternate < mouse);
    }

    #[test]
    fn screen_cleanup_disables_mouse_capture_before_leaving_the_alternate_screen() {
        let mut output = Vec::new();

        leave_screen(&mut output).expect("screen cleanup");

        let output = String::from_utf8(output).expect("terminal commands are UTF-8");
        let mouse = output.find("?1006l").expect("disable mouse capture");
        let alternate = output.find("?1049l").expect("leave alternate screen");
        assert!(mouse < alternate);
    }
}
