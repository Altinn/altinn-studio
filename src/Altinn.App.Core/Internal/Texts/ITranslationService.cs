using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Describes the public methods of a translation service
/// </summary>
public interface ITranslationService
{
    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <param name="customTextParameters">Dictionary of extra parameters for rendering this text <see cref="ValidationIssue.CustomTextParameters"/></param>
    /// <returns>The value of the text resource in the specified language</returns>
    Task<string?> TranslateTextKey(
        string key,
        string? language,
        Dictionary<string, string>? customTextParameters = null
    );

    /// <summary>
    /// Translates the specified text key using the provided layout evaluator state and component context to support dynamic variable replacement.
    ///
    /// Language is determined from the state, and if no language is set, 'nb' (Norwegian Bokmål) will be used by default.
    /// </summary>
    /// <param name="key">The identifier of the text resource to be translated.</param>
    /// <param name="state">The layout evaluator state containing shared data required for translation.</param>
    /// <param name="context">The component context in which the translation is being performed.</param>
    /// <param name="customTextParameters">Dictionary of extra parameters for rendering this text <see cref="ValidationIssue.CustomTextParameters"/></param>
    /// <returns>The translated text value, or null if the key cannot be translated.</returns>
    Task<string?> TranslateTextKey(
        string key,
        LayoutEvaluatorState state,
        ComponentContext? context,
        Dictionary<string, string>? customTextParameters = null
    );

    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource. If null, returns null.</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <returns>The value of the text resource in the specified language or null</returns>
    /// <exception cref="ArgumentException">If the text resource with the specified key does not exist</exception>
    Task<string?> TranslateTextKeyLenient(string? key, string? language);

    /// <summary>
    /// Get the first matching text resource value for the specified keys in the specified language.
    /// </summary>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <param name="keys">Array of keys to search for</param>
    /// <returns>The value of the first matching text resource in the specified language or null</returns>
    Task<string?> TranslateFirstMatchingTextKey(string? language, params string[] keys);
}
