use agent::{Agent, ConditionStatus};

/// Lists the declared access capabilities, or `-` when there are none.
pub(crate) fn format_access(spec: &agent::Spec) -> String {
    if spec.access.is_empty() {
        return "-".into();
    }
    spec.access
        .iter()
        .map(|capability| match capability {
            agent::AccessSpec::Ssh {} => "ssh",
        })
        .collect::<Vec<_>>()
        .join(",")
}

/// Renders an SSH access descriptor as aligned `key: value` lines.
pub(crate) fn ssh_access_lines(access: &agent::ssh::AccessInfo) -> Vec<String> {
    vec![
        format!("Type:        {}", access.kind),
        format!("Agent:       {}", access.agent),
        format!("Agent ID:    {}", access.agent_id),
        format!("Alias:       {}", access.alias),
        format!("User:        {}", access.user),
        format!("Identity:    {}", access.identity_file.display()),
        format!("Known hosts: {}", access.known_hosts_file.display()),
        format!("Config:      {}", access.config_file.display()),
        format!("Proxy:       {}", access.proxy_command),
        format!("Connect:     ssh -F {} {}", access.config_file.display(), access.alias),
    ]
}

pub(crate) fn describe_agent_lines(agent: &Agent) -> Vec<String> {
    let provider = agent
        .status
        .sandbox
        .as_ref()
        .map_or("-", |assignment| assignment.provider().as_str());
    let sandbox = agent
        .status
        .sandbox
        .as_ref()
        .and_then(agent::sandbox::Assignment::id)
        .map_or_else(|| "-".into(), ToString::to_string);

    let source = agent.status.provenance.as_ref().map_or_else(
        || "-".into(),
        |provenance| {
            provenance
                .manifest_path
                .as_ref()
                .unwrap_or(&provenance.source_directory)
                .display()
                .to_string()
        },
    );

    let secrets = if agent.spec.secrets.is_empty() {
        "-".to_owned()
    } else {
        agent.status.provenance.as_ref().map_or_else(
            || "-".into(),
            |provenance| {
                provenance
                    .env_file
                    .clone()
                    .unwrap_or_else(|| provenance.source_directory.join(agent::control_plane::ENV_FILE))
                    .display()
                    .to_string()
            },
        )
    };

    let mut lines = vec![
        format!("Name:       {}", agent.metadata.name),
        format!("Generation: {}", agent.metadata.generation),
        format!("Source:     {source}"),
        format!("Secrets:    {secrets}"),
        format!("Harnesses:  {}", format_harnesses(&agent.spec)),
        format!("Access:     {}", format_access(&agent.spec)),
        format!("Provider:   {provider}"),
        format!("Sandbox:    {sandbox}"),
    ];
    if let Some(failure) = agent.status.failure {
        lines.push(format!("Failure:    {}", failure_kind(failure)));
    }
    if let Some(provisioning) = &agent.status.progress {
        let progress = &provisioning.progress;
        lines.extend(provisioning_lines(
            progress,
            progress.output().lines().map(|line| line.text.as_str()),
        ));
    }
    lines.push("Conditions:".to_owned());
    if agent.status.conditions.is_empty() {
        lines.push("  None".to_owned());
        return lines;
    }
    let rows = agent
        .status
        .conditions
        .iter()
        .map(|condition| {
            vec![
                condition.kind.clone(),
                condition_status(condition.status).into(),
                condition.reason.clone(),
                condition.last_transition_time.map_or_else(|| "-".into(), format_age),
                condition.message.clone(),
            ]
        })
        .collect::<Vec<_>>();
    lines.extend(table_lines(&["TYPE", "STATUS", "REASON", "AGE", "MESSAGE"], &rows));
    lines
}

/// Renders a pass: its phases with the steps they still retain, the step in
/// progress, the failure detail when it failed, then `output` under its own
/// heading.
pub(crate) fn provisioning_lines<'a>(
    progress: &sandbox::progress::Progress,
    output: impl IntoIterator<Item = &'a str>,
) -> Vec<String> {
    let mut lines = vec!["Provisioning:".to_owned()];
    for phase in progress.finished() {
        lines.push(format!(
            "  {} {} ({})",
            outcome_mark(phase.outcome),
            phase.phase.label,
            crate::progress::duration(phase.elapsed_ms)
        ));
        lines.extend(phase.steps.iter().map(step_line));
    }
    if let Some(current) = progress.current() {
        lines.push(format!(
            "  → {} ({})",
            current.phase.label,
            format_age(current.started_at)
        ));
        lines.extend(current.finished_steps.iter().map(step_line));
        if let Some(step) = progress.current_step() {
            lines.push(format!("    {}{}", step.name, measurement(step.measurement)));
        }
    }
    if let sandbox::progress::OperationStatus::Failed { detail } = progress.status() {
        lines.push(format!("  Failed: {detail}"));
    }
    let mut output = output.into_iter().peekable();
    if output.peek().is_some() {
        lines.push("  Output:".to_owned());
        lines.extend(output.map(|line| format!("    {line}")));
    }
    lines
}

fn step_line(step: &sandbox::progress::FinishedStep) -> String {
    format!(
        "    {} {}{} ({})",
        outcome_mark(step.outcome),
        step.name,
        measurement(step.measurement),
        crate::progress::duration(step.elapsed_ms)
    )
}

const fn outcome_mark(outcome: sandbox::Outcome) -> &'static str {
    match outcome {
        sandbox::Outcome::Failed => "✗",
        _ => "✓",
    }
}

fn measurement(measurement: Option<sandbox::progress::Measurement>) -> String {
    measurement.map_or_else(String::new, |measurement| {
        format!(": {}", crate::progress::format_measurement(measurement))
    })
}

pub(crate) const fn failure_kind(kind: agent::FailureKind) -> &'static str {
    match kind {
        agent::FailureKind::Invalid => "Invalid (change the Agent to continue)",
        agent::FailureKind::Transient => "Transient (retrying in the background)",
    }
}

pub(crate) const fn condition_status(status: ConditionStatus) -> &'static str {
    match status {
        ConditionStatus::True => "True",
        ConditionStatus::False => "False",
        ConditionStatus::Unknown => "Unknown",
    }
}

pub(crate) fn format_harnesses(spec: &agent::Spec) -> String {
    spec.harnesses
        .iter()
        .map(|harness| {
            let suffix = if spec.harnesses.len() == 1 || harness.default {
                " (default)"
            } else {
                ""
            };
            let version = harness
                .version
                .as_deref()
                .map(|version| format!(" {version}"))
                .unwrap_or_default();
            format!("{}{version}{suffix}", harness.kind.as_str())
        })
        .collect::<Vec<_>>()
        .join(", ")
}

pub(crate) const fn session_state(state: agent::sessions::State) -> &'static str {
    match state {
        agent::sessions::State::Starting => "Starting",
        agent::sessions::State::Working => "Working",
        agent::sessions::State::WaitingForInput => "WaitingForInput",
        agent::sessions::State::Idle => "Idle",
        agent::sessions::State::Failed => "Failed",
    }
}

pub(crate) fn format_age(created_at: time::OffsetDateTime) -> String {
    let seconds = (time::OffsetDateTime::now_utc() - created_at).whole_seconds().max(0);
    match seconds {
        0..60 => format!("{seconds}s"),
        60..3600 => format!("{}m", seconds / 60),
        3600..86_400 => format!("{}h", seconds / 3600),
        _ => format!("{}d", seconds / 86_400),
    }
}

/// Renders turns as `agentctl turns` prints them: a heading per turn, then one
/// line per text part or tool call, marked with its author.
pub(crate) fn turn_lines(turns: &[agent::sessions::Turn]) -> Vec<String> {
    use agent::sessions::{Part, Role};
    let mut lines = Vec::new();
    for (index, turn) in turns.iter().enumerate() {
        if index > 0 {
            lines.push(String::new());
        }
        lines.push(format!("=== turn {} ===", index + 1));
        for message in &turn.messages {
            let who = match message.role {
                Role::User => "user",
                Role::Assistant => "assistant",
            };
            for part in &message.parts {
                lines.push(match part {
                    Part::Text { text } => format!("[{who}] {text}"),
                    Part::ToolCall { name, failed } => {
                        let mark = if *failed { " (failed)" } else { "" };
                        format!("[{who}] -> {name}{mark}")
                    }
                });
            }
        }
    }
    lines
}

pub(crate) fn table_lines(headers: &[&str], rows: &[Vec<String>]) -> Vec<String> {
    let widths = headers
        .iter()
        .enumerate()
        .map(|(index, header)| {
            rows.iter()
                .filter_map(|row| row.get(index))
                .map(String::len)
                .max()
                .unwrap_or_default()
                .max(header.len())
        })
        .collect::<Vec<_>>();
    let mut lines = vec![row_line(
        &headers.iter().map(|value| (*value).to_owned()).collect::<Vec<_>>(),
        &widths,
    )];
    lines.extend(rows.iter().map(|row| row_line(row, &widths)));
    lines
}

fn row_line(values: &[String], widths: &[usize]) -> String {
    let mut line = String::new();
    for (index, value) in values.iter().enumerate() {
        line.push_str(value);
        if index + 1 < values.len() {
            let width = widths.get(index).copied().unwrap_or_default();
            for _ in value.len()..width + 2 {
                line.push(' ');
            }
        }
    }
    line
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn describe_shows_the_failure_class_and_condition_age() {
        let mut agent: Agent =
            serde_yaml_ng::from_str(include_str!("../../../examples/minimal/agent.yaml")).expect("example manifest");
        agent.status.failure = Some(agent::FailureKind::Transient);
        agent.status.conditions = vec![agent::Condition {
            kind: "Ready".into(),
            status: ConditionStatus::False,
            reason: "SandboxReconcileFailed".into(),
            message: "registry unavailable".into(),
            last_transition_time: Some(time::OffsetDateTime::now_utc() - time::Duration::minutes(3)),
        }];

        let mut progress = sandbox::progress::Progress::new();
        let step = sandbox::StepId::generate();
        progress.apply(&sandbox::ProgressEvent::PhaseStarted {
            phase: sandbox::SandboxPhase::ImageResolve.phase(),
        });
        progress.apply(&sandbox::ProgressEvent::StepStarted {
            id: step.clone(),
            name: "Pull OCI image".into(),
            unit: None,
            total: None,
        });
        progress.apply(&sandbox::ProgressEvent::StepOutput {
            id: step,
            stream: sandbox::OutputStream::Stderr,
            bytes: b"connection reset\n".to_vec().into(),
        });
        progress.fail("registry unavailable");
        agent.status.progress = Some(agent::progress::Provisioning {
            pass: agent::resources::Changes::new().revision(),
            progress,
        });

        let lines = describe_agent_lines(&agent);
        assert!(lines.contains(&"Failure:    Transient (retrying in the background)".to_owned()));
        for expected in [
            "Provisioning:",
            "  Failed: registry unavailable",
            "  Output:",
            "    connection reset",
        ] {
            assert!(
                lines.iter().any(|line| line == expected),
                "missing {expected:?} in {lines:#?}"
            );
        }
        assert!(lines.iter().any(|line| line.starts_with("  ✗ Resolve Sandbox Image (")));
        assert!(lines.iter().any(|line| line.contains(" AGE ")));
        assert!(
            lines
                .iter()
                .any(|line| line.contains("SandboxReconcileFailed") && line.contains(" 3m "))
        );
    }

    #[test]
    fn session_state_output_does_not_depend_on_debug_names() {
        assert_eq!(session_state(agent::sessions::State::Starting), "Starting");
        assert_eq!(session_state(agent::sessions::State::Working), "Working");
        assert_eq!(
            session_state(agent::sessions::State::WaitingForInput),
            "WaitingForInput"
        );
        assert_eq!(session_state(agent::sessions::State::Idle), "Idle");
        assert_eq!(session_state(agent::sessions::State::Failed), "Failed");
    }
}
