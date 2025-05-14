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
    /// <returns>The value of the text resource in the specified language</returns>
    Task<string?> TranslateTextKey(string key, string? language);

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
