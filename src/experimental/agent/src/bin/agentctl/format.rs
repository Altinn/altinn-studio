use agent::{Agent, ConditionStatus};

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

    let mut lines = vec![
        format!("Name:       {}", agent.metadata.name),
        format!("Generation: {}", agent.metadata.generation),
        format!("Source:     {source}"),
        format!("Harnesses:  {}", format_harnesses(&agent.spec)),
        format!("Provider:   {provider}"),
        format!("Sandbox:    {sandbox}"),
        "Conditions:".to_owned(),
    ];
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
                condition.message.clone(),
            ]
        })
        .collect::<Vec<_>>();
    lines.extend(table_lines(&["TYPE", "STATUS", "REASON", "MESSAGE"], &rows));
    lines
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
        agent::sessions::State::Running => "Running",
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
    fn session_state_output_does_not_depend_on_debug_names() {
        assert_eq!(session_state(agent::sessions::State::Starting), "Starting");
        assert_eq!(session_state(agent::sessions::State::Running), "Running");
        assert_eq!(session_state(agent::sessions::State::Idle), "Idle");
        assert_eq!(session_state(agent::sessions::State::Failed), "Failed");
    }
}
