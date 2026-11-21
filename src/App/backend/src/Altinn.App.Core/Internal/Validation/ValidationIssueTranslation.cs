using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.UserAction;
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

    /// <summary>
    /// Translates the validation issues of a failed user action, as validation does, and sets the first one as the
    /// result's <see cref="UserActionResult.Error"/> when the action did not set one.
    /// </summary>
    /// <returns>The issues to return to the client, or null when the result has none.</returns>
    public static async Task<List<ValidationIssueWithSource>?> TranslateUserActionFailure(
        this ITranslationService translationService,
        UserActionResult result,
        string? language
    )
    {
        if (result.ValidationIssues is not { Count: > 0 } issues)
        {
            return null;
        }

        await translationService.TranslateValidationIssues(issues, language);
        var first = issues[0];
        result.Error ??= new ActionError
        {
            Code = first.Code,
            Message = first.Description ?? first.CustomTextKey ?? first.Code ?? string.Empty,
        };

        // An action is not a validator: its issues are never re-evaluated by incremental validation, so the client
        // must not expect a later incremental update to remove them.
        return issues
            .Select(issue =>
                ValidationIssueWithSource.FromIssue(issue, ValidationIssueSources.Custom, noIncrementalUpdates: true)
            )
            .ToList();
    }

    private static async Task Translate(ITranslationService translationService, ValidationIssue issue, string? language)
    {
        if (string.IsNullOrEmpty(issue.Description) && !string.IsNullOrEmpty(issue.CustomTextKey))
        {
            // TODO: Translate with the context from issue.DataElementId and issue.Field, so the text can use data model
            // variables from the right data element and repeating group row. Only the language is used for now.
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
            // File validation runs before the data element exists, and during instantiation before the instance exists.
            // There is no instance data, data element or field to translate with, so only the language is used.
            issue.Description =
                await translationService.TranslateTextKey(issue.CustomTextKey, language, issue.CustomTextParameters)
                ?? issue.Description;
        }
    }
}
