use std::io::Stdout;

use agent::Error;
use crossterm::{
    cursor::Show,
    terminal::{Clear, ClearType, EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{Terminal, backend::CrosstermBackend};

use super::app::App;
use super::view;

pub(crate) struct Tui {
    terminal: Terminal<CrosstermBackend<Stdout>>,
    active: bool,
}

impl Tui {
    pub(crate) fn enter() -> Result<Self, Error> {
        install_panic_hook();
        activate()?;
        let terminal = Terminal::new(CrosstermBackend::new(std::io::stdout())).map_err(Error::from)?;
        Ok(Self { terminal, active: true })
    }

    pub(crate) fn draw(&mut self, app: &App) -> Result<(), Error> {
        self.terminal
            .draw(|frame| view::render(frame, app))
            .map_err(Error::from)?;
        Ok(())
    }

    pub(crate) fn suspend(&mut self) -> Result<(), Error> {
        self.active = false;
        deactivate()
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
    crossterm::execute!(std::io::stdout(), EnterAlternateScreen).map_err(Error::from)
}

fn deactivate() -> Result<(), Error> {
    disable_raw_mode()?;
    crossterm::execute!(std::io::stdout(), LeaveAlternateScreen, Show).map_err(Error::from)
}

fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let _ = deactivate();
        previous(info);
    }));
}
