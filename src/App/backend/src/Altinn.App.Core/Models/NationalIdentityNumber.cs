using System.Globalization;

namespace Altinn.App.Core.Models;

/// <summary>
/// <p>Represents a Norwegian national identity number.</p>
/// <p>Note: The validation in this type is hard coded to the Norwegian national identity number format.</p>
/// </summary>
public readonly struct NationalIdentityNumber : IEquatable<NationalIdentityNumber>
{
    /// <summary>
    /// The national identity number value.
    /// </summary>
    public string Value { get; }

    private NationalIdentityNumber(string nationalIdentityNumber)
    {
        Value = nationalIdentityNumber;
    }

    /// <summary>
    /// Parses a national identity number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <exception cref="FormatException">The number is not valid</exception>
    public static NationalIdentityNumber Parse(string value)
    {
        return TryParse(value, out var nationalIdentityNumber)
            ? nationalIdentityNumber
            : throw new FormatException($"Invalid national identity number format: {value}");
    }

    /// <summary>
    /// Attempt to parse a national identity number.
    /// </summary>
    /// <param name="value">The value to parse</param>
    /// <param name="nationalIdentityNumber">The resulting <see cref="NationalIdentityNumber"/> instance</param>
    /// <returns><c>true</c> on successful parse, <c>false</c> otherwise</returns>
    public static bool TryParse(string value, out NationalIdentityNumber nationalIdentityNumber)
    {
        nationalIdentityNumber = default;

        if (value.Length != 11)
            return false;

        ReadOnlySpan<int> weightsDigit10 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
        ReadOnlySpan<int> weightsDigit11 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

        int sum10 = 0;
        int sum11 = 0;

        for (int i = 0; i < 11; i++)
        {
            if (!int.TryParse(value.AsSpan(i, 1), CultureInfo.InvariantCulture, out int currentDigit))
                return false;

            if (i < 9)
            {
                sum10 += currentDigit * weightsDigit10[i];
                sum11 += currentDigit * weightsDigit11[i];
                continue;
            }

            if (i == 9)
            {
                var ctrl10 = Mod11(sum10) switch
                {
                    11 => 0,
                    var result => result,
                };

                if (ctrl10 != currentDigit)
                    return false;

                sum11 += ctrl10 * weightsDigit11[i];
            }

            if (i == 10)
            {
                var ctrl11 = Mod11(sum11) switch
                {
                    11 => 0,
                    var result => result,
                };

                if (ctrl11 != currentDigit)
                    return false;
            }
        }

        nationalIdentityNumber = new NationalIdentityNumber(value);
        return true;
    }

    private static int Mod11(int value)
    {
        return 11 - (value % 11);
    }

    /// <inheritdoc/>
    public bool Equals(NationalIdentityNumber other) => Value == other.Value;

    /// <summary>
    /// Indicates whether the current object is equal to the provided string value.
    /// </summary>
    /// <param name="other">A <see cref="string"/> to compare with this object.</param>
    /// <returns>true if the current object is equal to the other parameter; otherwise, false</returns>
    public bool Equals(string? other) => Value == other;

    /// <inheritdoc/>
    public override bool Equals(object? obj) =>
        obj is NationalIdentityNumber other && Equals(other) || obj is string otherString && Equals(otherString);

    /// <inheritdoc/>
    public override int GetHashCode() => Value.GetHashCode();

    /// <summary>
    /// Returns a string representation of the national identity number.
    /// </summary>
    public override string ToString() => Value;

    /// <summary>
    /// Determines whether two specified instances of <see cref="NationalIdentityNumber"/> are equal.
    /// </summary>
    public static bool operator ==(NationalIdentityNumber left, NationalIdentityNumber right) => left.Equals(right);

    /// <summary>
    /// Determines whether two specified instances of <see cref="NationalIdentityNumber"/> are not equal.
    /// </summary>
    public static bool operator !=(NationalIdentityNumber left, NationalIdentityNumber right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="NationalIdentityNumber"/> is equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator ==(NationalIdentityNumber left, string right) => left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="NationalIdentityNumber"/> is not equal to the specified <see cref="string"/>.
    /// </summary>
    public static bool operator !=(NationalIdentityNumber left, string right) => !left.Equals(right);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is equal to the specified <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator ==(string left, NationalIdentityNumber right) => right.Equals(left);

    /// <summary>
    /// Determines whether the specified <see cref="string"/> is not equal to the specified <see cref="NationalIdentityNumber"/>.
    /// </summary>
    public static bool operator !=(string left, NationalIdentityNumber right) => !right.Equals(left);

    /// <summary>
    /// Implicit conversion from <see cref="NationalIdentityNumber"/> to string.
    /// </summary>
    /// <param name="nationalIdentityNumber">The national identity number instance</param>
    public static implicit operator string(NationalIdentityNumber nationalIdentityNumber)
    {
        return nationalIdentityNumber.Value;
    }
}
