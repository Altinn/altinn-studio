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
            issue.Description = await Translate(
                translationService,
                issue.Description,
                issue.CustomTextKey,
                issue.CustomTextParameters,
                language
            );
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
            issue.Description = await Translate(
                translationService,
                issue.Description,
                issue.CustomTextKey,
                issue.CustomTextParameters,
                language
            );
        }
    }

    private static async Task<string?> Translate(
        ITranslationService translationService,
        string? description,
        string? customTextKey,
        Dictionary<string, string>? customTextParameters,
        string? language
    )
    {
        if (!string.IsNullOrEmpty(description) || string.IsNullOrEmpty(customTextKey))
        {
            return description;
        }

        return await translationService.TranslateTextKey(customTextKey, language, customTextParameters) ?? description;
    }
}
