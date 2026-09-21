//! Skill installation shared by the Linux harness bootstraps.
//!
//! A skill is a directory holding `SKILL.md`, read on the host from `spec.skills`. Each harness
//! discovers skills in its own user-level directory, so the adapter chooses the root and this
//! module does the placement.

use sandbox::{SandboxHandle, SandboxPath, execution::ExecutionSpec};

use crate::{Error, sandbox::platform::files::write_if_changed};

/// One skill directory read on the host, keyed by its directory name.
pub(crate) struct Skill {
    pub(crate) name: String,
    /// Regular files below the skill directory, as `/`-separated relative paths.
    pub(crate) files: Vec<SkillFile>,
}

/// One regular file of a skill.
pub(crate) struct SkillFile {
    pub(crate) relative_path: String,
    pub(crate) contents: Vec<u8>,
}

/// Places every skill below `root` as `root/<name>/<relative path>`, owned by the image user.
///
/// Harnesses watch their skill directories live, so a file whose contents are already in place
/// is left alone rather than rewritten. Directories are created as the image user. Runtime file
/// transfer writes as the Sandbox supervisor, so exactly the managed files are chowned
/// afterwards: no recursive ownership walk.
pub(super) async fn install_linux(sandbox: &SandboxHandle, root: &str, skills: &[Skill]) -> Result<(), Error> {
    for skill in skills {
        let target = format!("{root}/{}", skill.name);
        run_checked(sandbox, "/usr/bin/mkdir", ["-p".to_owned(), target.clone()]).await?;
        let mut managed = Vec::with_capacity(skill.files.len());
        for file in &skill.files {
            let path = format!("{target}/{}", file.relative_path);
            if let Some((parent, _)) = file.relative_path.rsplit_once('/') {
                run_checked(
                    sandbox,
                    "/usr/bin/mkdir",
                    ["-p".to_owned(), format!("{target}/{parent}")],
                )
                .await?;
            }
            write_if_changed(sandbox, &path, &file.contents).await?;
            managed.push(path);
        }
        if managed.is_empty() {
            continue;
        }
        let mut chown = vec!["/usr/bin/chown".to_owned(), "agent:agent".to_owned()];
        chown.extend(managed);
        run_checked(sandbox, "/usr/bin/sudo", chown).await?;
    }
    Ok(())
}

async fn run_checked(
    sandbox: &SandboxHandle,
    executable: &str,
    args: impl IntoIterator<Item = String>,
) -> Result<(), Error> {
    let output = sandbox
        .run_execution(ExecutionSpec::command(SandboxPath::new(executable), args))
        .await?;
    if output.status.success() {
        Ok(())
    } else {
        Err(Error::SandboxSetup(format!(
            "command {executable:?} exited with code {}",
            output.status.code
        )))
    }
}
