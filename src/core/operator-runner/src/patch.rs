//! Checks the patch of a run before the operator runner returns it.
//!
//! App code ran in the VM and could have written the patch file, so the operator runner reads it as untrusted input. It
//! accepts only the format that `git diff --cached --binary --no-renames` writes, and refuses a patch with any other
//! line, because `git apply` could read such a line as the header of another change. It also refuses the changes that
//! no command makes:
//!
//! - symbolic links and submodules, which can send `git apply` and the steps of the client out of the repository;
//! - CI workflows, which run with the secrets of the repository;
//! - the files that change what git does with the other files;
//! - paths outside the app.
//!
//! A client applies the patch with `git apply`, which also refuses paths outside the repository and in `.git`.

use std::fmt;

/// CI workflows run with the secrets of the repository.
const REFUSED_FOLDERS: [&[u8]; 2] = [b".github/", b".gitea/"];
/// These files change what git does with the other files.
const REFUSED_FILE_NAMES: [&[u8]; 2] = [b".gitattributes", b".gitmodules"];
const DEV_NULL: &[u8] = b"/dev/null";
const BASE85: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

/// Why the operator runner does not return a patch.
#[derive(Debug, Eq, PartialEq)]
pub enum Refusal {
    /// The line with this number is not one that `git diff` writes there.
    Format { line: usize },
    /// The patch changes these paths, each with the reason.
    Changes(Vec<String>),
}

impl fmt::Display for Refusal {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Format { line } => write!(formatter, "line {line} of the patch is not in the format of git diff"),
            Self::Changes(changes) => write!(formatter, "the patch changes {}", changes.join(", ")),
        }
    }
}

/// Returns why the operator runner refuses the patch, if it does.
///
/// # Errors
///
/// Returns the first line that is not in the format of `git diff`, or else every change that the operator runner
/// refuses.
pub fn check(patch: &[u8]) -> Result<(), Refusal> {
    let mut lines = Lines::new(patch)?;
    let mut refused = Vec::new();
    while let Some(line) = lines.next() {
        let file_path = line
            .strip_prefix(b"diff --git ")
            .and_then(header_path)
            .ok_or_else(|| lines.refuse_current())?;
        let mut reason = path_refusal(&file_path);
        if let Some(mode_reason) = read_extended_headers(&mut lines)? {
            reason.get_or_insert(mode_reason);
        }
        read_changes(&mut lines, &file_path)?;
        if let Some(reason) = reason {
            refused.push(format!("{} ({reason})", String::from_utf8_lossy(&file_path)));
        }
    }
    if refused.is_empty() {
        Ok(())
    } else {
        Err(Refusal::Changes(refused))
    }
}

/// The lines of a patch, without their line feeds.
struct Lines<'a> {
    rest: &'a [u8],
    /// The number of the line that [`Lines::next`] returned last.
    number: usize,
}

impl<'a> Lines<'a> {
    /// `git diff` ends each line with a line feed, also the last one.
    fn new(patch: &'a [u8]) -> Result<Self, Refusal> {
        if patch.is_empty() || patch.ends_with(b"\n") {
            Ok(Self { rest: patch, number: 0 })
        } else {
            Err(Refusal::Format {
                line: patch.split(|&byte| byte == b'\n').count(),
            })
        }
    }

    fn peek(&self) -> Option<&'a [u8]> {
        let end = self.rest.iter().position(|&byte| byte == b'\n')?;
        Some(&self.rest[..end])
    }

    fn next(&mut self) -> Option<&'a [u8]> {
        let line = self.peek()?;
        self.rest = &self.rest[line.len() + 1..];
        self.number += 1;
        Some(line)
    }

    /// Returns the next line, or refuses the patch when it has no more lines.
    fn expect(&mut self) -> Result<&'a [u8], Refusal> {
        self.next().ok_or(Refusal::Format { line: self.number + 1 })
    }

    const fn refuse_current(&self) -> Refusal {
        Refusal::Format { line: self.number }
    }

    const fn refuse_next(&self) -> Refusal {
        Refusal::Format { line: self.number + 1 }
    }
}

/// Reads the path from `a/<path> b/<path>`. Without renames, both names are the path. git quotes both names when the
/// path has a byte that needs quotes, as in `"a/caf\303\251" "b/caf\303\251"`.
fn header_path(names: &[u8]) -> Option<Vec<u8>> {
    if names.first() == Some(&b'"') {
        let (old, rest) = unquote(names)?;
        let (new, rest) = unquote(rest.strip_prefix(b" ")?)?;
        let path = old.strip_prefix(b"a/")?;
        return (rest.is_empty() && new.strip_prefix(b"b/")? == path).then(|| path.to_vec());
    }
    // `a/` and ` b/` are five bytes, and the rest is the path twice.
    let length = names.len().checked_sub(5)?;
    if length % 2 != 0 {
        return None;
    }
    let (path, new) = names.strip_prefix(b"a/")?.split_at(length / 2);
    (new.strip_prefix(b" b/")? == path).then(|| path.to_vec())
}

/// Reads a name in the quotes of git, which escape as C does, and returns it with the rest of the line.
fn unquote(text: &[u8]) -> Option<(Vec<u8>, &[u8])> {
    let mut rest = text.strip_prefix(b"\"")?;
    let mut name = Vec::new();
    loop {
        let (&byte, after) = rest.split_first()?;
        rest = after;
        match byte {
            b'"' => return Some((name, rest)),
            b'\\' => {
                let (&escape, after) = rest.split_first()?;
                rest = after;
                let unescaped = match escape {
                    b'a' => 0x07,
                    b'b' => 0x08,
                    b't' => b'\t',
                    b'n' => b'\n',
                    b'v' => 0x0b,
                    b'f' => 0x0c,
                    b'r' => b'\r',
                    b'"' | b'\\' => escape,
                    b'0'..=b'3' => {
                        let (digits, after) = rest.split_at_checked(2)?;
                        rest = after;
                        [escape, digits[0], digits[1]].iter().try_fold(0_u8, |value, &digit| {
                            (b'0'..=b'7').contains(&digit).then(|| value * 8 + (digit - b'0'))
                        })?
                    }
                    _ => return None,
                };
                name.push(unescaped);
            }
            _ => name.push(byte),
        }
    }
}

/// Reads the mode and index lines after the header of a file. Returns why the operator runner refuses the new mode, if
/// it does.
fn read_extended_headers(lines: &mut Lines<'_>) -> Result<Option<&'static str>, Refusal> {
    let mut refusal = None;
    while let Some(line) = lines.peek() {
        let new_mode = if let Some(mode) = line
            .strip_prefix(b"new mode ")
            .or_else(|| line.strip_prefix(b"new file mode "))
        {
            Some(mode)
        } else if let Some(mode) = line
            .strip_prefix(b"old mode ")
            .or_else(|| line.strip_prefix(b"deleted file mode "))
        {
            if !is_mode(mode) {
                return Err(lines.refuse_next());
            }
            None
        } else if let Some(index) = line.strip_prefix(b"index ") {
            // The mode in the index line is the mode of the file before and after the change.
            let mode = index_mode(index).ok_or_else(|| lines.refuse_next())?;
            (!mode.is_empty()).then_some(mode)
        } else {
            break;
        };
        if let Some(mode) = new_mode {
            if !is_mode(mode) {
                return Err(lines.refuse_next());
            }
            refusal = refusal.or_else(|| mode_refusal(mode));
        }
        lines.next();
    }
    Ok(refusal)
}

/// Reads `<id>..<id>` with an optional mode. Returns the mode, which is empty when the line has none.
fn index_mode(index: &[u8]) -> Option<&[u8]> {
    let (ids, mode) = index
        .iter()
        .position(|&byte| byte == b' ')
        .map_or((index, &b""[..]), |space| (&index[..space], &index[space + 1..]));
    let separator = ids.windows(2).position(|pair| pair == b"..")?;
    let (old, new) = (&ids[..separator], &ids[separator + 2..]);
    let is_id = |id: &[u8]| !id.is_empty() && id.iter().all(u8::is_ascii_hexdigit);
    (is_id(old) && is_id(new)).then_some(mode)
}

/// Reads what changed in a file: nothing, a binary patch, or the names and hunks of a text patch.
fn read_changes(lines: &mut Lines<'_>, path: &[u8]) -> Result<(), Refusal> {
    match lines.peek() {
        None => Ok(()),
        Some(line) if line.starts_with(b"diff --git ") => Ok(()),
        Some(b"GIT binary patch") => {
            lines.next();
            read_binary_hunk(lines)?;
            if lines
                .peek()
                .is_some_and(|line| line.starts_with(b"literal ") || line.starts_with(b"delta "))
            {
                read_binary_hunk(lines)?;
            }
            Ok(())
        }
        Some(line) if line.starts_with(b"--- ") => {
            read_name(lines, b"--- ", b"a/", path)?;
            read_name(lines, b"+++ ", b"b/", path)?;
            read_hunks(lines)
        }
        Some(_) => Err(lines.refuse_next()),
    }
}

/// Reads a `---` or `+++` line, which names the path of the header or `/dev/null`. git adds a tab after a name with a
/// space.
fn read_name(lines: &mut Lines<'_>, marker: &[u8], prefix: &[u8], path: &[u8]) -> Result<(), Refusal> {
    let line = lines.expect()?;
    let name = line.strip_prefix(marker).ok_or_else(|| lines.refuse_current())?;
    let name = name.strip_suffix(b"\t").unwrap_or(name);
    if name == DEV_NULL {
        return Ok(());
    }
    let name = if name.first() == Some(&b'"') {
        match unquote(name) {
            Some((name, b"")) => name,
            _ => return Err(lines.refuse_current()),
        }
    } else {
        name.to_vec()
    };
    if name.strip_prefix(prefix) == Some(path) {
        Ok(())
    } else {
        Err(lines.refuse_current())
    }
}

/// Reads the hunks of a text patch. Each hunk header counts its lines, so a line in a hunk is never read as a header.
fn read_hunks(lines: &mut Lines<'_>) -> Result<(), Refusal> {
    let mut hunks = 0;
    while let Some(header) = lines.peek().and_then(|line| line.strip_prefix(b"@@ -")) {
        lines.next();
        let (mut old, mut new) = hunk_counts(header).ok_or_else(|| lines.refuse_current())?;
        while old > 0 || new > 0 {
            match lines.expect()?.first() {
                Some(b' ') if old > 0 && new > 0 => {
                    old -= 1;
                    new -= 1;
                }
                Some(b'-') if old > 0 => old -= 1,
                Some(b'+') if new > 0 => new -= 1,
                Some(b'\\') => {}
                _ => return Err(lines.refuse_current()),
            }
        }
        // `\ No newline at end of file` follows the last line of a file that does not end with a line feed.
        if lines.peek().is_some_and(|line| line.starts_with(b"\\ ")) {
            lines.next();
        }
        hunks += 1;
    }
    if hunks == 0 { Err(lines.refuse_next()) } else { Ok(()) }
}

/// Reads the line counts from `<start>[,<count>] +<start>[,<count>] @@`. A count that is not there is 1.
fn hunk_counts(header: &[u8]) -> Option<(usize, usize)> {
    let space = header.iter().position(|&byte| byte == b' ')?;
    let old = range_count(&header[..space])?;
    let rest = header[space + 1..].strip_prefix(b"+")?;
    let space = rest.iter().position(|&byte| byte == b' ')?;
    let new = range_count(&rest[..space])?;
    rest[space + 1..].starts_with(b"@@").then_some((old, new))
}

fn range_count(range: &[u8]) -> Option<usize> {
    let (start, count) = range
        .iter()
        .position(|&byte| byte == b',')
        .map_or((range, None), |comma| (&range[..comma], Some(&range[comma + 1..])));
    number(start)?;
    count.map_or(Some(1), number)
}

/// Reads `literal <size>` or `delta <size>`, then lines of base85 data, then an empty line.
fn read_binary_hunk(lines: &mut Lines<'_>) -> Result<(), Refusal> {
    let line = lines.expect()?;
    line.strip_prefix(b"literal ")
        .or_else(|| line.strip_prefix(b"delta "))
        .and_then(number)
        .ok_or_else(|| lines.refuse_current())?;
    let mut data_lines = 0;
    loop {
        let line = lines.expect()?;
        if line.is_empty() && data_lines > 0 {
            return Ok(());
        }
        if !is_base85_line(line) {
            return Err(lines.refuse_current());
        }
        data_lines += 1;
    }
}

/// A line of a binary patch starts with a letter for the number of bytes in it, from `A` for 1 to `z` for 52. Each
/// four bytes, and the rest, take five characters.
fn is_base85_line(line: &[u8]) -> bool {
    let Some((&length, data)) = line.split_first() else {
        return false;
    };
    let bytes = match length {
        b'A'..=b'Z' => length - b'A' + 1,
        b'a'..=b'z' => length - b'a' + 27,
        _ => return false,
    };
    data.len() == usize::from(bytes).div_ceil(4) * 5 && data.iter().all(|byte| BASE85.contains(byte))
}

fn number(digits: &[u8]) -> Option<usize> {
    if digits.is_empty() || !digits.iter().all(u8::is_ascii_digit) {
        return None;
    }
    std::str::from_utf8(digits).ok()?.parse().ok()
}

fn is_mode(mode: &[u8]) -> bool {
    mode.len() == 6 && mode.iter().all(|digit| (b'0'..=b'7').contains(digit))
}

fn mode_refusal(mode: &[u8]) -> Option<&'static str> {
    match mode {
        b"100644" | b"100755" => None,
        b"120000" => Some("a symbolic link"),
        b"160000" => Some("a submodule"),
        _ => Some("an unknown file mode"),
    }
}

fn path_refusal(path: &[u8]) -> Option<&'static str> {
    let mut segments = path.split(|&byte| byte == b'/');
    if path.is_empty()
        || segments.any(|segment| {
            segment.is_empty() || segment == b"." || segment == b".." || segment.eq_ignore_ascii_case(b".git")
        })
    {
        return Some("a path outside the app");
    }
    if REFUSED_FOLDERS.iter().any(|folder| path.starts_with(folder)) {
        return Some("a CI workflow folder");
    }
    let name = path.rsplit(|&byte| byte == b'/').next().unwrap_or(path);
    if REFUSED_FILE_NAMES.contains(&name) {
        return Some("a git attributes or submodules file");
    }
    None
}

#[cfg(test)]
mod tests {
    use std::{fs, io, os::unix::fs::PermissionsExt as _, path::PathBuf, process::Command};

    use super::{Refusal, check};

    /// The patch that the operator runner makes, by the same command as in `PATCH_SCRIPT`.
    struct Repo(tempfile::TempDir);

    impl Repo {
        fn new() -> io::Result<Self> {
            let repo = Self(tempfile::tempdir()?);
            repo.git(&["init", "--quiet"])?;
            fs::write(repo.path("README.md"), "one\ntwo\nthree\n")?;
            fs::write(repo.path("image.png"), [0_u8, 1, 2, 3, 255])?;
            fs::create_dir(repo.path("App"))?;
            fs::write(repo.path("App/Program.cs"), "class Program {}\n")?;
            fs::write(repo.path("App/old.txt"), "old\n")?;
            repo.git(&["add", "-A"])?;
            repo.git(&["commit", "--quiet", "--message", "base"])?;
            Ok(repo)
        }

        fn path(&self, path: &str) -> PathBuf {
            self.0.path().join(path)
        }

        fn git(&self, arguments: &[&str]) -> io::Result<Vec<u8>> {
            let output = Command::new("git")
                .args(["-c", "user.name=test", "-c", "user.email=test@example.com"])
                .args(arguments)
                .current_dir(self.0.path())
                .env("GIT_CONFIG_NOSYSTEM", "1")
                .env("GIT_CONFIG_GLOBAL", "/dev/null")
                .output()?;
            if !output.status.success() {
                return Err(io::Error::other(String::from_utf8_lossy(&output.stderr).into_owned()));
            }
            Ok(output.stdout)
        }

        fn patch(&self) -> io::Result<Vec<u8>> {
            self.git(&["add", "-A"])?;
            self.git(&[
                "diff",
                "--cached",
                "--binary",
                "--no-renames",
                "--no-color",
                "--no-ext-diff",
                "--no-textconv",
                "--src-prefix=a/",
                "--dst-prefix=b/",
            ])
        }
    }

    fn refused_changes(patch: &[u8]) -> Vec<String> {
        match check(patch) {
            Err(Refusal::Changes(changes)) => changes,
            other => panic!("expected refused changes, got {other:?}"),
        }
    }

    #[test]
    fn accepts_no_changes() {
        assert_eq!(check(b""), Ok(()));
    }

    #[test]
    fn accepts_the_changes_that_an_upgrade_makes() -> io::Result<()> {
        let repo = Repo::new()?;
        fs::write(repo.path("README.md"), "one\n2\nthree\nfour")?;
        fs::write(repo.path("image.png"), [9_u8; 300])?;
        fs::write(repo.path("App/new image.png"), [0_u8, 159, 146, 150])?;
        fs::write(repo.path("App/Ny side æøå.json"), "{\n  \"a\": 1\n}\n")?;
        fs::write(repo.path("App/tab\there.txt"), "tab\n")?;
        fs::write(repo.path("App/empty.txt"), "")?;
        fs::remove_file(repo.path("App/old.txt"))?;
        // A move is a deletion and an addition without renames.
        fs::rename(repo.path("App/Program.cs"), repo.path("App/Main.cs"))?;
        fs::create_dir(repo.path("scripts"))?;
        fs::write(repo.path("scripts/run.sh"), "#!/bin/sh\n")?;
        fs::set_permissions(repo.path("scripts/run.sh"), fs::Permissions::from_mode(0o755))?;

        let patch = repo.patch()?;

        assert_eq!(check(&patch), Ok(()), "{}", String::from_utf8_lossy(&patch));
        Ok(())
    }

    #[test]
    fn accepts_a_change_of_the_mode_only() -> io::Result<()> {
        let repo = Repo::new()?;
        fs::set_permissions(repo.path("README.md"), fs::Permissions::from_mode(0o755))?;

        assert_eq!(check(&repo.patch()?), Ok(()));
        Ok(())
    }

    #[test]
    fn refuses_symbolic_links_and_submodules() -> io::Result<()> {
        let repo = Repo::new()?;
        std::os::unix::fs::symlink("../../outside", repo.path("App/link"))?;
        let commit = String::from_utf8_lossy(&repo.git(&["rev-parse", "HEAD"])?)
            .trim()
            .to_string();
        repo.git(&["add", "-A"])?;
        repo.git(&[
            "update-index",
            "--add",
            "--cacheinfo",
            &format!("160000,{commit},vendor"),
        ])?;

        let patch = repo.git(&["diff", "--cached", "--binary", "--no-renames"])?;

        assert_eq!(
            refused_changes(&patch),
            ["App/link (a symbolic link)", "vendor (a submodule)"]
        );
        Ok(())
    }

    #[test]
    fn refuses_a_file_that_becomes_a_symbolic_link() -> io::Result<()> {
        let repo = Repo::new()?;
        fs::remove_file(repo.path("README.md"))?;
        std::os::unix::fs::symlink("/etc/passwd", repo.path("README.md"))?;

        let patch = repo.patch()?;

        assert_eq!(refused_changes(&patch), ["README.md (a symbolic link)"]);
        Ok(())
    }

    #[test]
    fn refuses_ci_workflows_and_git_attributes() -> io::Result<()> {
        let repo = Repo::new()?;
        for folder in [".github/workflows", ".gitea/workflows"] {
            fs::create_dir_all(repo.path(folder))?;
            fs::write(repo.path(&format!("{folder}/build.yml")), "on: push\n")?;
        }
        fs::write(repo.path("App/.gitattributes"), "* -text\n")?;
        fs::write(repo.path(".gitmodules"), "")?;

        let patch = repo.patch()?;

        assert_eq!(
            refused_changes(&patch),
            [
                ".gitea/workflows/build.yml (a CI workflow folder)",
                ".github/workflows/build.yml (a CI workflow folder)",
                ".gitmodules (a git attributes or submodules file)",
                "App/.gitattributes (a git attributes or submodules file)",
            ]
        );
        Ok(())
    }

    #[test]
    fn refuses_the_deletion_of_a_ci_workflow() -> io::Result<()> {
        let repo = Repo::new()?;
        fs::create_dir_all(repo.path(".github/workflows"))?;
        fs::write(repo.path(".github/workflows/build.yml"), "on: push\n")?;
        repo.git(&["add", "-A"])?;
        repo.git(&["commit", "--quiet", "--message", "workflow"])?;
        fs::remove_file(repo.path(".github/workflows/build.yml"))?;

        assert_eq!(
            refused_changes(&repo.patch()?),
            [".github/workflows/build.yml (a CI workflow folder)"]
        );
        Ok(())
    }

    #[test]
    fn refuses_paths_outside_the_app() {
        for path in [
            "../outside",
            "App/../../outside",
            ".git/config",
            "App/.GIT/hooks/pre-commit",
            "/etc/passwd",
        ] {
            let patch = format!("diff --git a/{path} b/{path}\nnew file mode 100644\nindex 0000000..e69de29\n");
            assert!(matches!(check(patch.as_bytes()), Err(Refusal::Changes(_))), "{path}");
        }
    }

    /// `git apply` reads these lines as changes, so the operator runner refuses a patch that has them where `git diff`
    /// does not write them.
    #[test]
    fn refuses_lines_that_git_diff_does_not_write() {
        let change = "diff --git a/a.txt b/a.txt\nindex 1111111..2222222 100644\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b\n";
        let cases = [
            // A patch in the format of diff, with no git header.
            (
                "--- a/.github/workflows/x.yml\n+++ b/.github/workflows/x.yml\n@@ -0,0 +1 @@\n+on: push\n",
                1,
            ),
            // Text before the first header.
            ("From: someone\n", 1),
            // A hunk with more lines than its header counts.
            (
                "diff --git a/a.txt b/a.txt\nindex 1111111..2222222 100644\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b\n+c\n",
                8,
            ),
            // A hunk with fewer lines than its header counts.
            (
                "diff --git a/a.txt b/a.txt\nindex 1111111..2222222 100644\n--- a/a.txt\n+++ b/a.txt\n@@ -1,2 +1,2 @@\n-a\n+b\n",
                8,
            ),
            // A rename, which the operator runner never asks for.
            (
                "diff --git a/a.txt b/b.txt\nsimilarity index 100%\nrename from a.txt\nrename to b.txt\n",
                1,
            ),
            (
                "diff --git a/a.txt b/a.txt\nsimilarity index 100%\ncopy from a.txt\ncopy to .github/x.yml\n",
                2,
            ),
            // Names that differ from the header.
            (
                "diff --git a/a.txt b/a.txt\nindex 1111111..2222222 100644\n--- a/a.txt\n+++ b/.github/x.yml\n@@ -1 +1 @@\n-a\n+b\n",
                4,
            ),
            // Binary data that is not base85.
            (
                "diff --git a/a.bin b/a.bin\nindex 1111111..2222222 100644\nGIT binary patch\nliteral 4\nLdiff --git\n\n",
                5,
            ),
            // An index line with a mode that is not a mode.
            ("diff --git a/a.txt b/a.txt\nindex 1111111..2222222 12345\n", 2),
            // No line feed at the end.
            ("diff --git a/a.txt b/a.txt", 1),
        ];
        for (patch, line) in cases {
            assert_eq!(check(patch.as_bytes()), Err(Refusal::Format { line }), "{patch}");
        }
        assert_eq!(check(format!("{change}{change}").as_bytes()), Ok(()));
    }

    #[test]
    fn reads_quoted_paths() {
        let patch = b"diff --git \"a/App/caf\\303\\251 \\\"x\\\".txt\" \"b/App/caf\\303\\251 \\\"x\\\".txt\"\nnew file mode 100644\nindex 0000000..e69de29\n";
        assert_eq!(check(patch), Ok(()));
        let ci = b"diff --git \"a/.github/caf\\303\\251\" \"b/.github/caf\\303\\251\"\nnew file mode 100644\nindex 0000000..e69de29\n";
        assert_eq!(
            check(ci),
            Err(Refusal::Changes(vec![
                ".github/caf\u{e9} (a CI workflow folder)".to_string()
            ]))
        );
    }
}
