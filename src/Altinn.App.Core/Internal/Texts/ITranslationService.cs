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
    Task<string> TranslateTextKey(string key, string? language);
}
