using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Computes a person's age in whole years on a reference date from an opaque
/// identifier and a named decoder. Decoders supported in the image today:
/// <list type="bullet">
///   <item><c>fnr-no</c>: 11-digit Norwegian fødselsnummer with D-number handling.</item>
/// </list>
/// New decoders are added by extending the switch in <see cref="DecodeBirthdate"/>.
/// </summary>
public sealed partial class AgeFromIdTool : ITool
{
    public string Name => "age_from_id";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var id = arguments.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        var refDateStr = arguments.TryGetProperty("reference_date", out var rdEl) ? rdEl.GetString() : null;
        var decoder = arguments.TryGetProperty("decoder", out var decEl) ? decEl.GetString() : null;

        if (string.IsNullOrEmpty(decoder))
            return new { error = "Missing required argument 'decoder' (supported: 'fnr-no')." };

        var birthdate = DecodeBirthdate(id, decoder);
        if (birthdate is null)
            return new { error = $"Could not decode id '{id}' with decoder '{decoder}'." };

        if (!DateOnly.TryParseExact(refDateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var refDate))
            return new { error = $"Invalid reference_date (expected YYYY-MM-DD): '{refDateStr}'" };

        var age = refDate.Year - birthdate.Value.Year;
        if ((refDate.Month, refDate.Day).CompareTo((birthdate.Value.Month, birthdate.Value.Day)) < 0)
            age--;

        return new
        {
            age,
            birthdate = birthdate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        };
    }

    private static DateOnly? DecodeBirthdate(string? id, string decoder) => decoder switch
    {
        "fnr-no" => DecodeNorwegianFnr(id),
        _ => null,
    };

    [GeneratedRegex(@"^\d{11}$")]
    private static partial Regex FnrRegex();

    internal static DateOnly? DecodeNorwegianFnr(string? fnr)
    {
        if (string.IsNullOrEmpty(fnr) || !FnrRegex().IsMatch(fnr))
            return null;

        var day = int.Parse(fnr.AsSpan(0, 2), CultureInfo.InvariantCulture);
        var month = int.Parse(fnr.AsSpan(2, 2), CultureInfo.InvariantCulture);
        var yy = int.Parse(fnr.AsSpan(4, 2), CultureInfo.InvariantCulture);
        var indiv = int.Parse(fnr.AsSpan(6, 3), CultureInfo.InvariantCulture);

        int year;
        if (indiv <= 499)
            year = 1900 + yy;
        else if (indiv <= 749 && yy >= 54)
            year = 1800 + yy;
        else if (indiv <= 999 && yy <= 39)
            year = 2000 + yy;
        else if (indiv >= 900 && yy >= 40)
            year = 1900 + yy;
        else
            year = 1900 + yy;

        if (day > 40)
            day -= 40;

        try
        {
            return new DateOnly(year, month, day);
        }
        catch (ArgumentOutOfRangeException)
        {
            return null;
        }
    }
}
