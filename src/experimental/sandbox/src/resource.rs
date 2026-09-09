//! Kubernetes-style quantities used by Sandbox resource assignments.

use std::{fmt, num::NonZeroU64, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Error as _};
use thiserror::Error;

const MILLICPUS_PER_CPU: u64 = 1_000;
const MAX_QUANTITY: u128 = i64::MAX as u128;

const BINARY_SUFFIXES: [(u64, &str); 6] = [
    (1_u64 << 60, "Ei"),
    (1_u64 << 50, "Pi"),
    (1_u64 << 40, "Ti"),
    (1_u64 << 30, "Gi"),
    (1_u64 << 20, "Mi"),
    (1_u64 << 10, "Ki"),
];

const DECIMAL_SUFFIXES: [(u64, &str); 6] = [
    (1_000_000_000_000_000_000, "E"),
    (1_000_000_000_000_000, "P"),
    (1_000_000_000_000, "T"),
    (1_000_000_000, "G"),
    (1_000_000, "M"),
    (1_000, "k"),
];

/// Failure to parse or construct a resource quantity.
#[derive(Clone, Copy, Debug, Eq, Error, PartialEq)]
pub enum ParseQuantityError {
    /// The quantity contains no value.
    #[error("resource quantity must not be empty")]
    Empty,
    /// The quantity does not follow the supported Kubernetes syntax.
    #[error("invalid resource quantity")]
    Invalid,
    /// Sandbox resource assignments must be greater than zero.
    #[error("resource quantity must be greater than zero")]
    NonPositive,
    /// The value cannot be represented exactly in the resource's base unit.
    #[error("resource quantity has unsupported precision")]
    Precision,
    /// The value exceeds the Kubernetes quantity range.
    #[error("resource quantity is too large")]
    Overflow,
}

/// A positive CPU quantity stored as an exact number of millicpus.
///
/// The accepted syntax follows Kubernetes CPU conventions, including `0.5`,
/// `500m`, and whole CPU values such as `4`. Precision finer than one
/// millicpu is rejected.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct CpuQuantity(NonZeroU64);

impl CpuQuantity {
    /// Creates a quantity from a non-zero number of millicpus.
    #[must_use]
    pub const fn from_millicpus(millicpus: NonZeroU64) -> Self {
        Self(millicpus)
    }

    /// Creates a quantity from a positive number of whole CPUs.
    ///
    /// # Errors
    ///
    /// Returns an error for zero or when conversion to millicpus overflows.
    pub fn from_cpus(cpus: u64) -> Result<Self, ParseQuantityError> {
        let millicpus = cpus
            .checked_mul(MILLICPUS_PER_CPU)
            .ok_or(ParseQuantityError::Overflow)?;
        Self::try_from_millicpus(millicpus)
    }

    /// Creates a quantity from a positive number of millicpus.
    ///
    /// # Errors
    ///
    /// Returns an error when the value is zero or exceeds the Kubernetes
    /// quantity range.
    pub fn try_from_millicpus(millicpus: u64) -> Result<Self, ParseQuantityError> {
        if u128::from(millicpus) > MAX_QUANTITY {
            return Err(ParseQuantityError::Overflow);
        }
        NonZeroU64::new(millicpus)
            .map(Self)
            .ok_or(ParseQuantityError::NonPositive)
    }

    /// Returns the normalized value in millicpus.
    #[must_use]
    pub const fn millicpus(self) -> u64 {
        self.0.get()
    }

    /// Returns the value as whole CPUs when it has no fractional CPU.
    #[must_use]
    pub const fn whole_cpus(self) -> Option<u64> {
        let millicpus = self.millicpus();
        if millicpus.is_multiple_of(MILLICPUS_PER_CPU) {
            Some(millicpus / MILLICPUS_PER_CPU)
        } else {
            None
        }
    }
}

impl FromStr for CpuQuantity {
    type Err = ParseQuantityError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let (number, suffix) = split_number_and_suffix(value)?;
        let decimal = parse_decimal(number)?;
        let multiplier = match suffix {
            "" => u128::from(MILLICPUS_PER_CPU),
            "m" => 1,
            _ => return Err(ParseQuantityError::Invalid),
        };
        let millicpus = decimal.to_exact_integer(multiplier, 0)?;
        let millicpus = u64::try_from(millicpus).map_err(|_| ParseQuantityError::Overflow)?;
        Self::try_from_millicpus(millicpus)
    }
}

impl TryFrom<&str> for CpuQuantity {
    type Error = ParseQuantityError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        value.parse()
    }
}

impl fmt::Display for CpuQuantity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let millicpus = self.millicpus();
        if let Some(cpus) = self.whole_cpus() {
            write!(formatter, "{cpus}")
        } else {
            write!(formatter, "{millicpus}m")
        }
    }
}

impl Serialize for CpuQuantity {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for CpuQuantity {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        String::deserialize(deserializer)?.parse().map_err(D::Error::custom)
    }
}

/// A positive byte quantity using Kubernetes binary and decimal SI syntax.
///
/// Values such as `256Mi`, `2Gi`, `1.5Gi`, `2G`, and plain byte counts are
/// accepted when they resolve to an exact whole number of bytes.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct ByteQuantity(NonZeroU64);

impl ByteQuantity {
    /// Creates a quantity from a non-zero number of bytes.
    #[must_use]
    pub const fn from_bytes(bytes: NonZeroU64) -> Self {
        Self(bytes)
    }

    /// Creates a quantity from a positive number of bytes.
    ///
    /// # Errors
    ///
    /// Returns an error when the value is zero or exceeds the Kubernetes
    /// quantity range.
    pub fn try_from_bytes(bytes: u64) -> Result<Self, ParseQuantityError> {
        if u128::from(bytes) > MAX_QUANTITY {
            return Err(ParseQuantityError::Overflow);
        }
        NonZeroU64::new(bytes).map(Self).ok_or(ParseQuantityError::NonPositive)
    }

    /// Creates a quantity from a positive number of mebibytes.
    ///
    /// # Errors
    ///
    /// Returns an error for zero or when conversion to bytes overflows.
    pub fn from_mebibytes(mebibytes: u64) -> Result<Self, ParseQuantityError> {
        Self::from_units(mebibytes, 1_u64 << 20)
    }

    /// Creates a quantity from a positive number of gibibytes.
    ///
    /// # Errors
    ///
    /// Returns an error for zero or when conversion to bytes overflows.
    pub fn from_gibibytes(gibibytes: u64) -> Result<Self, ParseQuantityError> {
        Self::from_units(gibibytes, 1_u64 << 30)
    }

    fn from_units(value: u64, multiplier: u64) -> Result<Self, ParseQuantityError> {
        let bytes = value.checked_mul(multiplier).ok_or(ParseQuantityError::Overflow)?;
        Self::try_from_bytes(bytes)
    }

    /// Returns the normalized value in bytes.
    #[must_use]
    pub const fn bytes(self) -> u64 {
        self.0.get()
    }

    /// Returns the value in whole mebibytes when it is exactly representable.
    #[must_use]
    pub const fn whole_mebibytes(self) -> Option<u64> {
        const MEBIBYTE: u64 = 1_u64 << 20;
        let bytes = self.bytes();
        if bytes.is_multiple_of(MEBIBYTE) {
            Some(bytes / MEBIBYTE)
        } else {
            None
        }
    }
}

impl FromStr for ByteQuantity {
    type Err = ParseQuantityError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let (number, suffix) = split_number_and_suffix(value)?;
        let decimal = parse_decimal(number)?;
        let (multiplier, exponent) = byte_scale(suffix)?;
        let bytes = decimal.to_exact_integer(multiplier, exponent)?;
        if bytes > MAX_QUANTITY {
            return Err(ParseQuantityError::Overflow);
        }
        let bytes = u64::try_from(bytes).map_err(|_| ParseQuantityError::Overflow)?;
        Self::try_from_bytes(bytes)
    }
}

impl TryFrom<&str> for ByteQuantity {
    type Error = ParseQuantityError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        value.parse()
    }
}

impl fmt::Display for ByteQuantity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let bytes = self.bytes();
        let mut canonical = bytes.to_string();
        for (multiplier, suffix) in BINARY_SUFFIXES.into_iter().chain(DECIMAL_SUFFIXES) {
            if bytes.is_multiple_of(multiplier) {
                let candidate = format!("{}{suffix}", bytes / multiplier);
                if candidate.len() < canonical.len() {
                    canonical = candidate;
                }
            }
        }
        formatter.write_str(&canonical)
    }
}

impl Serialize for ByteQuantity {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for ByteQuantity {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        String::deserialize(deserializer)?.parse().map_err(D::Error::custom)
    }
}

#[derive(Clone, Copy)]
struct Decimal {
    mantissa: u128,
    scale: u32,
}

impl Decimal {
    fn to_exact_integer(self, multiplier: u128, exponent: i32) -> Result<u128, ParseQuantityError> {
        let mut numerator = self
            .mantissa
            .checked_mul(multiplier)
            .ok_or(ParseQuantityError::Overflow)?;
        let mut denominator = checked_power(10, self.scale)?;
        if exponent >= 0 {
            numerator = numerator
                .checked_mul(checked_power(10, exponent.unsigned_abs())?)
                .ok_or(ParseQuantityError::Overflow)?;
        } else {
            denominator = denominator
                .checked_mul(checked_power(10, exponent.unsigned_abs())?)
                .ok_or(ParseQuantityError::Overflow)?;
        }
        if !numerator.is_multiple_of(denominator) {
            return Err(ParseQuantityError::Precision);
        }
        let value = numerator / denominator;
        if value == 0 {
            return Err(ParseQuantityError::NonPositive);
        }
        Ok(value)
    }
}

fn split_number_and_suffix(value: &str) -> Result<(&str, &str), ParseQuantityError> {
    if value.is_empty() {
        return Err(ParseQuantityError::Empty);
    }
    let mut number_end = 0;
    for (index, character) in value.char_indices() {
        let sign = index == 0 && matches!(character, '+' | '-');
        if sign || character.is_ascii_digit() || character == '.' {
            number_end = index + character.len_utf8();
        } else {
            break;
        }
    }
    if number_end == 0 {
        return Err(ParseQuantityError::Invalid);
    }
    Ok(value.split_at(number_end))
}

fn parse_decimal(value: &str) -> Result<Decimal, ParseQuantityError> {
    let value = match value.strip_prefix('+') {
        Some(value) => value,
        None if value.starts_with('-') => return Err(ParseQuantityError::NonPositive),
        None => value,
    };
    let mut parts = value.split('.');
    let integer = parts.next().ok_or(ParseQuantityError::Invalid)?;
    let fraction = parts.next();
    if parts.next().is_some() || (integer.is_empty() && fraction.is_none_or(str::is_empty)) {
        return Err(ParseQuantityError::Invalid);
    }
    if !integer.bytes().all(|byte| byte.is_ascii_digit())
        || fraction.is_some_and(|digits| !digits.bytes().all(|byte| byte.is_ascii_digit()))
    {
        return Err(ParseQuantityError::Invalid);
    }
    let fraction = fraction.unwrap_or_default();
    let scale = u32::try_from(fraction.len()).map_err(|_| ParseQuantityError::Overflow)?;
    let mut digits = String::with_capacity(integer.len() + fraction.len());
    digits.push_str(integer);
    digits.push_str(fraction);
    if digits.is_empty() {
        return Err(ParseQuantityError::Invalid);
    }
    let mantissa = digits.parse().map_err(|_| ParseQuantityError::Overflow)?;
    Ok(Decimal { mantissa, scale })
}

fn byte_scale(suffix: &str) -> Result<(u128, i32), ParseQuantityError> {
    let multiplier = match suffix {
        "" => 1,
        "Ki" => 1_u128 << 10,
        "Mi" => 1_u128 << 20,
        "Gi" => 1_u128 << 30,
        "Ti" => 1_u128 << 40,
        "Pi" => 1_u128 << 50,
        "Ei" => 1_u128 << 60,
        "k" => 1_000,
        "M" => 1_000_000,
        "G" => 1_000_000_000,
        "T" => 1_000_000_000_000,
        "P" => 1_000_000_000_000_000,
        "E" => 1_000_000_000_000_000_000,
        _ => return decimal_exponent(suffix).map(|exponent| (1, exponent)),
    };
    Ok((multiplier, 0))
}

fn decimal_exponent(suffix: &str) -> Result<i32, ParseQuantityError> {
    let exponent = suffix
        .strip_prefix('e')
        .or_else(|| suffix.strip_prefix('E'))
        .ok_or(ParseQuantityError::Invalid)?;
    if exponent.is_empty() {
        return Err(ParseQuantityError::Invalid);
    }
    exponent.parse().map_err(|_| ParseQuantityError::Invalid)
}

fn checked_power(base: u128, exponent: u32) -> Result<u128, ParseQuantityError> {
    base.checked_pow(exponent).ok_or(ParseQuantityError::Overflow)
}

#[cfg(test)]
#[allow(clippy::expect_used)]
mod tests {
    use super::{ByteQuantity, CpuQuantity, ParseQuantityError};

    #[test]
    fn cpu_quantities_normalize_to_millicpus() {
        let decimal: CpuQuantity = "0.5".parse().expect("decimal CPU should parse");
        let milli: CpuQuantity = "500m".parse().expect("millicpu should parse");
        let whole: CpuQuantity = "2.0".parse().expect("whole CPU should parse");

        assert_eq!(decimal, milli);
        assert_eq!(decimal.millicpus(), 500);
        assert_eq!(decimal.to_string(), "500m");
        assert_eq!(whole.whole_cpus(), Some(2));
        assert_eq!(whole.to_string(), "2");
    }

    #[test]
    fn cpu_quantities_reject_sub_millicpu_precision() {
        assert_eq!("0.0001".parse::<CpuQuantity>(), Err(ParseQuantityError::Precision));
        assert_eq!("0.5m".parse::<CpuQuantity>(), Err(ParseQuantityError::Precision));
    }

    #[test]
    fn byte_quantities_accept_binary_decimal_and_exponent_forms() {
        let binary: ByteQuantity = "1.5Gi".parse().expect("binary quantity should parse");
        let binary_canonical: ByteQuantity = "1536Mi".parse().expect("canonical binary quantity should parse");
        let decimal: ByteQuantity = "2G".parse().expect("decimal quantity should parse");
        let exponent: ByteQuantity = "2e9".parse().expect("exponent quantity should parse");

        assert_eq!(binary, binary_canonical);
        assert_eq!(binary.to_string(), "1536Mi");
        assert_eq!(decimal, exponent);
        assert_eq!(decimal.to_string(), "2G");
    }

    #[test]
    fn byte_quantities_require_whole_positive_bytes() {
        assert_eq!("0".parse::<ByteQuantity>(), Err(ParseQuantityError::NonPositive));
        assert_eq!("0.5".parse::<ByteQuantity>(), Err(ParseQuantityError::Precision));
        assert_eq!("-1Gi".parse::<ByteQuantity>(), Err(ParseQuantityError::NonPositive));
    }

    #[test]
    fn quantities_serialize_as_strings() {
        let cpu: CpuQuantity = serde_json::from_str(r#""0.5""#).expect("CPU should deserialize");
        let bytes: ByteQuantity = serde_json::from_str(r#""1.5Gi""#).expect("bytes should deserialize");

        assert_eq!(serde_json::to_string(&cpu).expect("CPU should serialize"), r#""500m""#);
        assert_eq!(
            serde_json::to_string(&bytes).expect("bytes should serialize"),
            r#""1536Mi""#
        );
    }
}
