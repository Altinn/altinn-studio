using System.Text.RegularExpressions;

namespace Altinn.App.Core.Models;

#pragma warning disable CA1000

/// <summary>
/// Specification details for language code ISO 639-1
/// </summary>
public readonly partial struct Iso6391 : ILanguageCodeStandard
{
    /// <inheritdoc/>
    public static LanguageCodeValidationResult Validate(string code)
    {
        string? errorMessage = null;
        if (string.IsNullOrWhiteSpace(code))
            errorMessage = "Code value cannot be empty.";
        else if (code.Length != 2)
            errorMessage = $"Invalid code length. Received {code.Length} characters, expected 2 (ISO 639-1).";
        else if (ValidationRegex().IsMatch(code) is false)
            errorMessage = "Code value must only contain letters.";

        return new LanguageCodeValidationResult(errorMessage is null, errorMessage);
    }

    [GeneratedRegex(@"^[a-zA-Z]{2}$")]
    private static partial Regex ValidationRegex();
}

/// <summary>
/// Specifications for language code standards
/// </summary>
public interface ILanguageCodeStandard
{
    /// <summary>
    /// Validation instructions for the language code implementation
    /// </summary>
    /// <param name="code">The code to validate, e.g. "no" in the case of ISO 639-1</param>
    static abstract LanguageCodeValidationResult Validate(string code);
};

/// <summary>
/// The result of a language code validation
/// </summary>
/// <param name="IsValid">Is the code valid?</param>
/// <param name="ErrorMessage">If not valid, what is the reason given?</param>
public sealed record LanguageCodeValidationResult(bool IsValid, string? ErrorMessage);

/// <summary>
/// Represents a language code
/// </summary>
public readonly struct LanguageCode<TLangCodeStandard> : IEquatable<LanguageCode<TLangCodeStandard>>
    where TLangCodeStandard : struct, ILanguageCodeStandard
{
    /// <summary>
    /// The language code value
    /// </summary>
    public string Value { get; }

    private LanguageCode(string code)
    {
        Value = code.ToLowerInvariant();
    }

    /// <summary>
    /// Parses a language code
    /// </summary>
    /// <param name="code">The language code</param>
    /// <exception cref="FormatException">The language code format is invalid</exception>
    public static LanguageCode<TLangCodeStandard> Parse(string code)
    {
        LanguageCodeValidationResult validationResult = TryParse(code, out var instance);

        return validationResult.IsValid
            ? instance
            : throw new FormatException($"Invalid language code format: {validationResult.ErrorMessage}");
    }

    /// <summary>
    /// Attempts to parse a language code
    /// </summary>
    /// <param name="code">The code to parse</param>
    /// <param name="result">The resulting <see cref="LanguageCodeValidationResult"/></param>
    public static LanguageCodeValidationResult TryParse(string code, out LanguageCode<TLangCodeStandard> result)
    {
        var validationResult = TLangCodeStandard.Validate(code);
        if (!validationResult.IsValid)
        {
            result = default;
            return validationResult;
        }

        result = new LanguageCode<TLangCodeStandard>(code);
        return new LanguageCodeValidationResult(true, null);
    }

    /// <summary>
    /// Determines whether the specified object is equal to the current object
    /// </summary>
    public bool Equals(LanguageCode<TLangCodeStandard> other) => Value == other.Value;

    /// <summary>
    /// Determines whether the specified object is equal to the current object
    /// </summary>
    public override bool Equals(object? obj) => obj is LanguageCode<TLangCodeStandard> other && Equals(other);

    /// <summary>
    /// Returns the hash code for the language code value
    /// </summary>
    public override int GetHashCode() => Value.GetHashCode();

    /// <summary>
    /// Returns a string representation of the language code
    /// </summary>
    public override string ToString() => Value;

    /// <summary>
    /// Determines whether two specified instances of <see cref="LanguageCode{TLangCodeStandard}"/> are equal
    /// </summary>
    public static bool operator ==(LanguageCode<TLangCodeStandard> left, LanguageCode<TLangCodeStandard> right) =>
        left.Equals(right);

    /// <summary>
    /// Determines whether two specified instances of <see cref="LanguageCode{TLangCodeStandard}"/> are not equal
    /// </summary>
    public static bool operator !=(LanguageCode<TLangCodeStandard> left, LanguageCode<TLangCodeStandard> right) =>
        !left.Equals(right);

    /// <summary>
    /// Implicit conversion from <see cref="LanguageCode{TLangCodeStandard}"/> to string
    /// </summary>
    /// <param name="languageCode">The language code instance</param>
    public static implicit operator string(LanguageCode<TLangCodeStandard> languageCode)
    {
        return languageCode.Value;
    }
}
