using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Fills in the description of validation issues that only carry a text key, so that clients that do not
/// resolve text keys themselves still get a readable message in the requested language.
/// </summary>
internal static class ValidationIssueTranslation
{
    public static async Task TranslateValidationIssues(
        this ITranslationService translationService,
        IEnumerable<ValidationIssue> issues,
        string? language
    )
    {
        foreach (var issue in issues)
        {
            await Translate(translationService, issue, language);
        }
    }

    public static async Task TranslateValidationIssues(
        this ITranslationService translationService,
        IEnumerable<ValidationIssueWithSource> issues,
        string? language
    )
    {
        foreach (var issue in issues)
        {
            await Translate(translationService, issue, language);
        }
    }

    private static async Task Translate(ITranslationService translationService, ValidationIssue issue, string? language)
    {
        if (string.IsNullOrEmpty(issue.Description) && !string.IsNullOrEmpty(issue.CustomTextKey))
        {
            issue.Description =
                await translationService.TranslateTextKey(issue.CustomTextKey, language, issue.CustomTextParameters)
                ?? issue.Description;
        }
    }

    private static async Task Translate(
        ITranslationService translationService,
        ValidationIssueWithSource issue,
        string? language
    )
    {
        if (string.IsNullOrEmpty(issue.Description) && !string.IsNullOrEmpty(issue.CustomTextKey))
        {
            issue.Description =
                await translationService.TranslateTextKey(issue.CustomTextKey, language, issue.CustomTextParameters)
                ?? issue.Description;
        }
    }
}
