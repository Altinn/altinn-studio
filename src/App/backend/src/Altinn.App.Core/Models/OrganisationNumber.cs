using System.Globalization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents the format of an organisation number.
/// </summary>
public enum OrganisationNumberFormat
{
    /// <summary>
    /// Represents only the locally recognised organisation number, e.g. "991825827".
    /// </summary>
    Local,

    /// <summary>
    /// Represents only the locally recognised organisation number, e.g. "0192:991825827".
    /// </summary>
    International,
}

/// <summary>
/// <p>Represents a Norwegian organisation number.</p>
/// <p>Note: The validation in this type is hard coded to the Norwegian organisation number format.</p>
/// </summary>
public readonly struct OrganisationNumber : IEquatable<OrganisationNumber>
{
    private readonly string _local;
    private readonly string _international;

    /// <summary>
    /// Gets the organisation number as a string in the specified format.
    /// </summary>
    /// <param name="format">The format to get</param>
    /// <exception cref="ArgumentOutOfRangeException">Invalid format provided</exception>
    public string Get(OrganisationNumberFormat format) =>
        format switch
        {
            OrganisationNumberFormat.Local => _local,
            OrganisationNumberFormat.International => _international,
            _ => throw new ArgumentOutOfRangeException(nameof(format)),
        };

    private OrganisationNumber(string local, string international)
    {
        _local = local;
        _international = international;
    }

    /// <summary>
    /// Parses an organisation number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <exception cref="FormatException">The organisation number is not valid</exception>
    public static OrganisationNumber Parse(string value)
    {
        return TryParse(value, out var organisationNumber)
            ? organisationNumber
            : throw new FormatException($"Invalid organisation number format: {value}");
    }

    /// <summary>
    /// Attempt to parse an organisation number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <param name="organisationNumber">The resulting <see cref="OrganisationNumber"/> instance</param>
    /// <returns><c>true</c> on successful parse, <c>false</c> otherwise</returns>
    public static bool TryParse(string? value, out OrganisationNumber organisationNumber)
    {
        organisationNumber = default;

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

        organisationNumber = new OrganisationNumber(local, international);
        return true;
    }

    /// <inheritdoc/>
    public bool Equals(OrganisationNumber other) => _local == other._local;

    /// <summary>
    /// Indicates whether the current object is equal to the provided string value.
    /// </summary>
    /// <param name="other">A <see cref="string"/> to compare with this object.</param>
    /// <returns>true if the current object is equal to the other parameter; otherwise, false</returns>
    public bool Equals(string? other) => _local == other || _international == other;

    /// <inheritdoc/>
    public override bool Equals(object? obj) =>
        obj is OrganisationNumber other && Equals(other) || obj is string str && Equals(str);

    /// <inheritdoc/>
    public override int GetHashCode() => _local.GetHashCode();

    /// <summary>
    /// Returns a string representation of the <see cref="OrganisationNumberFormat.Local"/> organisation number.
    /// </summary>
    public override string ToString() => _local;

    /// <summary>
    /// Determines whether two specified instances of <see cref="OrganisationNumber"/> are equal.
    /// </summary>
    public static bool operator ==(OrganisationNumber left, OrganisationNumber right) => left.Equals(right);

    /// <summary>
    /// Determines whether two specified instances of <see cref="OrganisationNumber"/> are not equal.
    /// </summary>
    public static bool operator !=(OrganisationNumber left, OrganisationNumber right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="OrganisationNumber"/> is equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator ==(OrganisationNumber left, string right) => left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="OrganisationNumber"/> is not equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator !=(OrganisationNumber left, string right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is equal to the specified <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator ==(string left, OrganisationNumber right) => right.Equals(left);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is not equal to the specified <see cref="OrganisationNumber"/>.
    /// </summary>
    public static bool operator !=(string left, OrganisationNumber right) => !right.Equals(left);

    /// <summary>
    /// Implicit conversion from <see cref="OrganisationNumber"/> to string.
    /// </summary>
    /// <param name="organisationNumber">The organisation number instance</param>
    public static implicit operator string(OrganisationNumber organisationNumber)
    {
        return organisationNumber._local;
    }
}
