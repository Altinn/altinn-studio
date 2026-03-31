using System.Globalization;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Features.Notifications.Texts;

internal static class NotificationTexts
{
    internal static string ReplaceTokens(
        string text,
        string? appId,
        string? title,
        string? instanceOwnerName,
        string? serviceOwnerName,
        string? orgNumber,
        string? nationalIndentityNumber,
        DateTime? dueDateTime
    )
    {
        (string? appName, _) =
            appId?.Split('/') is string[] groups && groups.Length >= 2 ? (groups[1], groups[0]) : (null, null);
        string? formattedDate = GetPrintableDateTime(dueDateTime);

        return text.Replace(ReplacementTokens.AppName, title ?? appName ?? string.Empty)
            .Replace(ReplacementTokens.InstanceOwnerName, instanceOwnerName ?? string.Empty)
            .Replace(ReplacementTokens.ServiceOwnerName, serviceOwnerName ?? string.Empty)
            .Replace(ReplacementTokens.OrgNumber, orgNumber ?? string.Empty)
            .Replace(ReplacementTokens.NationalIdentityNumber, nationalIndentityNumber ?? string.Empty)
            .Replace(ReplacementTokens.SocialSecurityNumber, nationalIndentityNumber ?? string.Empty) // Was available in prerelease
            .Replace(ReplacementTokens.DueDate, formattedDate ?? string.Empty);
    }

    internal static string? GetPrintableDateTime(DateTime? dueDateTime)
    {
        if (!dueDateTime.HasValue)
            return null;

        var norwegianTz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");
        var localTime = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(dueDateTime.Value, DateTimeKind.Utc),
            norwegianTz
        );

        return localTime.ToString("dd-MM-yyyy HH:mm:ss", CultureInfo.InvariantCulture);
    }

    internal static string GetDefaultSubject(string? language)
    {
        return language switch
        {
            LanguageConst.En => "New form created in Altinn",
            _ => "Nytt skjema opprettet i Altinn",
        };
    }

    internal static string GetDefaultBody(
        string? language,
        string? appid,
        string? serviceOwnerName,
        string? instanceOwnerName,
        string? orgNumber,
        string? nationalIndentityNumber,
        DateTime? dueDate
    )
    {
        List<string> parts = [];
        (string? appName, _) =
            appid?.Split('/') is string[] groups && groups.Length >= 2 ? (groups[1], groups[0]) : (null, null);

        parts.Add(
            string.IsNullOrWhiteSpace(serviceOwnerName)
                ? language switch
                {
                    LanguageConst.En => "A new form has been created",
                    LanguageConst.Nn => "Eit nytt skjema har blitt opprettet",
                    _ => "Det har blitt opprettet et nytt skjema",
                }
                : language switch
                {
                    LanguageConst.En => $"{serviceOwnerName} has created a new form",
                    LanguageConst.Nn => $"{serviceOwnerName} har opprettet eit nytt skjema",
                    _ => $"{serviceOwnerName} har opprettet et nytt skjema",
                }
        );

        if (string.IsNullOrWhiteSpace(appName) is false)
        {
            parts.Add($"({appName})");
        }

        if (string.IsNullOrWhiteSpace(instanceOwnerName) is false)
        {
            parts.Add($"for {instanceOwnerName}");
        }

        if (string.IsNullOrWhiteSpace(orgNumber) is false)
        {
            parts.Add(
                language switch
                {
                    LanguageConst.En => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"for organization with organization number {orgNumber}"
                        : $"with organization number {orgNumber}",
                    LanguageConst.Nn => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"avgiver med organisasjonsnummer {orgNumber}"
                        : $"med organisasjonsnummer {orgNumber}",
                    _ => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"avgiver med organisasjonsnummer {orgNumber}"
                        : $"med organisasjonsnummer {orgNumber}",
                }
            );
        }

        // Org number should never be set if social security number is set, but the model allows it - so we have a fail safe to avoid corrupted notifications
        if (string.IsNullOrWhiteSpace(nationalIndentityNumber) is false && string.IsNullOrWhiteSpace(orgNumber))
        {
            parts.Add(
                language switch
                {
                    LanguageConst.En => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"person with social security number {nationalIndentityNumber}"
                        : $"with social security number {nationalIndentityNumber}",
                    LanguageConst.Nn => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"avgiver med fødselsnummer {nationalIndentityNumber}"
                        : $"med fødselsnummer {nationalIndentityNumber}",
                    _ => string.IsNullOrWhiteSpace(instanceOwnerName)
                        ? $"avgiver med fødselsnummer {nationalIndentityNumber}"
                        : $"med fødselsnummer {nationalIndentityNumber}",
                }
            );
        }

        if (dueDate is not null)
        {
            var formattedDate = dueDate.Value.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
            parts.Add(
                language switch
                {
                    LanguageConst.En => $"with due date {formattedDate}",
                    LanguageConst.Nn => $"med frist {formattedDate}",
                    _ => $"med frist {formattedDate}",
                }
            );
        }

        parts.Add(
            language switch
            {
                LanguageConst.En => "- open your Altinn inbox to view the form.",
                LanguageConst.Nn => "- opne innboksen i Altinn for å sjå skjemaet.",
                _ => "- åpne innboksen i Altinn for å se skjemaet.",
            }
        );

        return string.Join(" ", parts);
    }
}
