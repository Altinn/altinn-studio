//! Explicit non-secret environment imported from an Agent's environment file.

use std::collections::BTreeMap;

use zeroize::Zeroizing;

use crate::{Error, control_plane::AgentRecord};

pub(crate) async fn resolve(record: &AgentRecord) -> Result<BTreeMap<String, String>, Error> {
    if record.agent.spec.environment.is_empty() {
        return Ok(BTreeMap::new());
    }
    let values = read(&record.env_file_path()).await?;
    record
        .agent
        .spec
        .environment
        .iter()
        .map(|variable| {
            let value = required(&values, variable.source())?;
            Ok((variable.name.clone(), value.to_owned()))
        })
        .collect()
}

pub(crate) async fn read(path: &std::path::Path) -> Result<BTreeMap<String, Zeroizing<String>>, Error> {
    let Some(bytes) = read_if_exists(path).await? else {
        return Err(Error::Invalid(format!(
            "manifest values require the environment file {} (default: .env beside the manifest; override with `agentctl apply --env-file`)",
            path.display()
        )));
    };
    parse(&bytes)
}

pub(crate) async fn read_or_empty(path: &std::path::Path) -> Result<BTreeMap<String, Zeroizing<String>>, Error> {
    let Some(bytes) = read_if_exists(path).await? else {
        return Ok(BTreeMap::new());
    };
    parse(&bytes)
}

async fn read_if_exists(path: &std::path::Path) -> Result<Option<Zeroizing<Vec<u8>>>, Error> {
    match tokio::fs::read(path).await {
        Ok(bytes) => Ok(Some(Zeroizing::new(bytes))),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(Error::Io(error)),
    }
}

fn parse(bytes: &[u8]) -> Result<BTreeMap<String, Zeroizing<String>>, Error> {
    let text = std::str::from_utf8(bytes).map_err(|_| Error::Invalid(".env must be UTF-8".into()))?;
    let mut values = BTreeMap::new();
    for (line_index, original) in text.lines().enumerate() {
        let line = original.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((name, value)) = line.split_once('=') else {
            return Err(Error::Invalid(format!(
                "invalid .env assignment on line {}",
                line_index + 1
            )));
        };
        let name = name.trim();
        if !portable_name(name) {
            return Err(Error::Invalid(format!(
                "invalid .env variable name on line {}",
                line_index + 1
            )));
        }
        let value = unquote(value.trim())
            .ok_or_else(|| Error::Invalid(format!("unbalanced .env quotes on line {}", line_index + 1)))?;
        if values.insert(name.into(), Zeroizing::new(value.into())).is_some() {
            return Err(Error::Invalid(format!("duplicate .env variable {name:?}")));
        }
    }
    Ok(values)
}

pub(crate) fn optional<'a>(values: &'a BTreeMap<String, Zeroizing<String>>, name: &str) -> Option<&'a str> {
    values
        .get(name)
        .map(|value| value.as_str())
        .filter(|value| !value.is_empty())
}

pub(crate) fn required<'a>(values: &'a BTreeMap<String, Zeroizing<String>>, name: &str) -> Result<&'a str, Error> {
    let value = values
        .get(name)
        .ok_or_else(|| Error::Invalid(format!(".env does not define required variable {name:?}")))?;
    if value.is_empty() {
        return Err(Error::Invalid(format!(".env variable {name:?} must not be empty")));
    }
    Ok(value)
}

fn portable_name(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .enumerate()
            .all(|(index, byte)| byte == b'_' || byte.is_ascii_alphabetic() || (index > 0 && byte.is_ascii_digit()))
}

fn unquote(value: &str) -> Option<&str> {
    match value.as_bytes().first() {
        Some(b'"') => value.strip_prefix('"')?.strip_suffix('"'),
        Some(b'\'') => value.strip_prefix('\'')?.strip_suffix('\''),
        _ if value.ends_with(['"', '\'']) => None,
        _ => Some(value),
    }
}

#[cfg(test)]
mod tests {
    use super::{optional, read_or_empty};
    use std::collections::BTreeMap;
    use zeroize::Zeroizing;

    #[tokio::test]
    async fn missing_optional_environment_file_is_empty() -> Result<(), crate::Error> {
        let directory = tempfile::tempdir()?;
        let values = read_or_empty(&directory.path().join("missing.env")).await?;

        assert!(values.is_empty());
        Ok(())
    }

    #[test]
    fn optional_values_omit_missing_and_empty_entries() {
        let values = BTreeMap::from([
            ("EMPTY".into(), Zeroizing::new(String::new())),
            ("PRESENT".into(), Zeroizing::new("value".into())),
        ]);

        assert_eq!(optional(&values, "MISSING"), None);
        assert_eq!(optional(&values, "EMPTY"), None);
        assert_eq!(optional(&values, "PRESENT"), Some("value"));
    }
}
