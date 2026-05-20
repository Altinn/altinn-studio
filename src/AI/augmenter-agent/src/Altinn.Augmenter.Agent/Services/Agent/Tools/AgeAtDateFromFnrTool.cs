using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Computes a person's age in whole years on a reference date, given an
/// 11-digit Norwegian fødselsnummer. Century derived from the individual-number
/// per Skatteetaten's rules; D-numbers (day + 40) are handled.
/// </summary>
public sealed partial class AgeAtDateFromFnrTool : ITool
{
    public string Name => "age_at_date_from_fnr";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var fnr = arguments.TryGetProperty("fnr", out var fnrEl) ? fnrEl.GetString() : null;
        var refDateStr = arguments.TryGetProperty("reference_date", out var rdEl) ? rdEl.GetString() : null;

        var birthdate = TryDecodeBirthdate(fnr);
        if (birthdate is null)
            return new { error = $"Invalid fnr (expected 11 digits): '{fnr}'" };

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

    [GeneratedRegex(@"^\d{11}$")]
    private static partial Regex FnrRegex();

    internal static DateOnly? TryDecodeBirthdate(string? fnr)
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
