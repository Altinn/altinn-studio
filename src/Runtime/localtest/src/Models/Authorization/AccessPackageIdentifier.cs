#nullable enable

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Authorization.Models;

/// <summary>
/// A string value identifier of an access package.
/// </summary>
[JsonConverter(typeof(JsonConverter))]
[ExcludeFromCodeCoverage]
public class AccessPackageIdentifier
    : ISpanParsable<AccessPackageIdentifier>,
    ISpanFormattable
{
    private readonly string _value;

    private AccessPackageIdentifier(string value)
    {
        _value = value;
    }

    /// <summary>
    /// Creates a new <see cref="AccessPackageIdentifier"/> from the specified value without validation.
    /// </summary>
    /// <param name="value">The package identifier.</param>
    /// <returns>A <see cref="AccessPackageIdentifier"/>.</returns>
    public static AccessPackageIdentifier CreateUnchecked(string value)
        => new(value);

    /// <inheritdoc cref="IParsable{TSelf}.Parse(string, IFormatProvider?)"/>
    public static AccessPackageIdentifier Parse(string s)
        => Parse(s, provider: null);

    /// <inheritdoc/>
    public static AccessPackageIdentifier Parse(string s, IFormatProvider? provider)
        => TryParse(s, provider, out var result)
        ? result
        : throw new FormatException("Invalid package");

    /// <inheritdoc cref="ISpanParsable{TSelf}.Parse(ReadOnlySpan{char}, IFormatProvider?)"/>
    public static AccessPackageIdentifier Parse(ReadOnlySpan<char> s)
        => Parse(s, provider: null);

    /// <inheritdoc/>
    public static AccessPackageIdentifier Parse(ReadOnlySpan<char> s, IFormatProvider? provider)
        => TryParse(s, provider, out var result)
        ? result
        : throw new FormatException("Invalid package");

    /// <inheritdoc/>
    public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, [MaybeNullWhen(false)] out AccessPackageIdentifier result)
        => TryParse(s.AsSpan(), s, out result);

    /// <inheritdoc/>
    public static bool TryParse(ReadOnlySpan<char> s, IFormatProvider? provider, [MaybeNullWhen(false)] out AccessPackageIdentifier result)
        => TryParse(s, original: null, out result);

    private static bool TryParse(ReadOnlySpan<char> s, string? original, [MaybeNullWhen(false)] out AccessPackageIdentifier result)
    {
        result = new AccessPackageIdentifier(original ?? new string(s));
        return true;
    }

    /// <inheritdoc/>
    public override string ToString()
        => _value;

    /// <inheritdoc cref="IFormattable.ToString(string?, IFormatProvider?)"/>
    public string ToString(string? format)
        => _value;

    /// <inheritdoc/>
    public string ToString(string? format, IFormatProvider? formatProvider)
        => _value;

    /// <inheritdoc/>
    public bool TryFormat(Span<char> destination, out int charsWritten, ReadOnlySpan<char> format, IFormatProvider? provider)
    {
        if (destination.Length < _value.Length)
        {
            charsWritten = 0;
            return false;
        }

        _value.AsSpan().CopyTo(destination);
        charsWritten = _value.Length;
        return true;
    }

    private sealed class JsonConverter : JsonConverter<AccessPackageIdentifier>
    {
        public override AccessPackageIdentifier? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var str = reader.GetString();
            if (!TryParse(str, null, out var result))
            {
                throw new JsonException("Invalid package");
            }

            return result;
        }

        public override void Write(Utf8JsonWriter writer, AccessPackageIdentifier value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value._value);
        }
    }
}
