using System.Globalization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents the format of an organization number.
/// </summary>
public enum OrganizationNumberFormat
{
    /// <summary>
    /// Represents only the locally recognized organization number, e.g. "991825827".
    /// </summary>
    Local,

    /// <summary>
    /// Represents only the locally recognized organization number, e.g. "0192:991825827".
    /// </summary>
    International,
}

/// <summary>
/// <p>Represents a Norwegian organization number.</p>
/// <p>Note: The validation in this type is hard coded to the Norwegian organization number format.</p>
/// </summary>
public readonly struct OrganizationNumber : IEquatable<OrganizationNumber>
{
    private readonly string _local;
    private readonly string _international;

    /// <summary>
    /// Gets the organization number as a string in the specified format.
    /// </summary>
    /// <param name="format">The format to get</param>
    /// <exception cref="ArgumentOutOfRangeException">Invalid format provided</exception>
    public string Get(OrganizationNumberFormat format) =>
        format switch
        {
            OrganizationNumberFormat.Local => _local,
            OrganizationNumberFormat.International => _international,
            _ => throw new ArgumentOutOfRangeException(nameof(format)),
        };

    private OrganizationNumber(string local, string international)
    {
        _local = local;
        _international = international;
    }

    /// <summary>
    /// Parses an organization number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <exception cref="FormatException">The organization number is not valid</exception>
    public static OrganizationNumber Parse(string value)
    {
        return TryParse(value, out var organizationNumber)
            ? organizationNumber
            : throw new FormatException($"Invalid organization number format: {value}");
    }

    /// <summary>
    /// Attempt to parse an organization number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <param name="organizationNumber">The resulting <see cref="OrganizationNumber"/> instance</param>
    /// <returns><c>true</c> on successful parse, <c>false</c> otherwise</returns>
    public static bool TryParse(string? value, out OrganizationNumber organizationNumber)
    {
        organizationNumber = default;

        if (string.IsNullOrWhiteSpace(value))
            return false;

        // Either local="991825827" or international="0192:991825827"
        if (value.Length != 9 && value.Length != 14)
            return false;

        string local;
        string international;
        if (value.Length == 9)
        {
            local = value;
            international = "0192:" + value;
        }
        else
        {
            if (!value.StartsWith("0192:", StringComparison.Ordinal))
                return false;
            local = value.Substring(5);
            international = value;
        }

        ReadOnlySpan<int> weights = [3, 2, 7, 6, 5, 4, 3, 2];

        int sum = 0;
        for (int i = 0; i < local.Length - 1; i++)
        {
            if (!int.TryParse(local.AsSpan(i, 1), CultureInfo.InvariantCulture, out int currentDigit))
                return false;
            sum += currentDigit * weights[i];
        }

        int ctrlDigit = 11 - (sum % 11);
        if (ctrlDigit == 11)
        {
            ctrlDigit = 0;
        }

        if (!int.TryParse(local.AsSpan(local.Length - 1, 1), CultureInfo.InvariantCulture, out var lastDigit))
            return false;

        if (lastDigit != ctrlDigit)
            return false;

        organizationNumber = new OrganizationNumber(local, international);
        return true;
    }

    /// <inheritdoc/>
    public bool Equals(OrganizationNumber other) => _local == other._local;

    /// <summary>
    /// Indicates whether the current object is equal to the provided string value.
    /// </summary>
    /// <param name="other">A <see cref="string"/> to compare with this object.</param>
    /// <returns>true if the current object is equal to the other parameter; otherwise, false</returns>
    public bool Equals(string? other) => _local == other || _international == other;

    /// <inheritdoc/>
    public override bool Equals(object? obj) =>
        obj is OrganizationNumber other && Equals(other) || obj is string str && Equals(str);

    /// <inheritdoc/>
    public override int GetHashCode() => _local.GetHashCode();

    /// <summary>
    /// Returns a string representation of the <see cref="OrganizationNumberFormat.Local"/> organization number.
    /// </summary>
    public override string ToString() => _local;

    /// <summary>
    /// Determines whether two specified instances of <see cref="OrganizationNumber"/> are equal.
    /// </summary>
    public static bool operator ==(OrganizationNumber left, OrganizationNumber right) => left.Equals(right);

    /// <summary>
    /// Determines whether two specified instances of <see cref="OrganizationNumber"/> are not equal.
    /// </summary>
    public static bool operator !=(OrganizationNumber left, OrganizationNumber right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="OrganizationNumber"/> is equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator ==(OrganizationNumber left, string right) => left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="OrganizationNumber"/> is not equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator !=(OrganizationNumber left, string right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is equal to the specified <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator ==(string left, OrganizationNumber right) => right.Equals(left);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is not equal to the specified <see cref="OrganizationNumber"/>.
    /// </summary>
    public static bool operator !=(string left, OrganizationNumber right) => !right.Equals(left);

    /// <summary>
    /// Implicit conversion from <see cref="OrganizationNumber"/> to string.
    /// </summary>
    /// <param name="organizationNumber">The organization number instance</param>
    public static implicit operator string(OrganizationNumber organizationNumber)
    {
        return organizationNumber._local;
    }
}
