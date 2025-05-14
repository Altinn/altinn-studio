using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Translation service
/// </summary>
internal class TranslationService : ITranslationService
{
    private readonly string _org;
    private readonly string _app;
    private readonly IAppResources _appResources;

    /// <inheritdoc/>
    public TranslationService(AppIdentifier appIdentifier, IAppResources appResources)
    {
        _org = appIdentifier.Org;
        _app = appIdentifier.App;
        _appResources = appResources;
    }

    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <returns>The value of the text resource in the specified language</returns>
    public async Task<string?> TranslateTextKey(string key, string? language)
    {
        language ??= LanguageConst.Nb;
        TextResource? textResource = await _appResources.GetTexts(_org, _app, language);

        if (textResource is null && language != LanguageConst.Nb)
        {
            textResource = await _appResources.GetTexts(_org, _app, LanguageConst.Nb);
        }

        if (textResource is null)
        {
            return null;
        }

        var value = textResource.Resources.Find(resource => resource.Id == key)?.Value;

        if (value == null)
        {
            return null;
        }

        return value;
    }

    /// <summary>
    /// Get the first matching text resource value for the specified keys in the specified language.
    /// </summary>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <param name="keys">Array of keys to search for</param>
    /// <returns>The value of the first matching text resource in the specified language or null</returns>
    public async Task<string?> TranslateFirstMatchingTextKey(string? language, params string[] keys)
    {
        language ??= LanguageConst.Nb;
        foreach (var key in keys)
        {
            TextResource? textResource = await _appResources.GetTexts(_org, _app, language);

            if (textResource is null && language != LanguageConst.Nb)
            {
                textResource = await _appResources.GetTexts(_org, _app, LanguageConst.Nb);
            }
            var value = textResource?.Resources.Find(resource => resource.Id == key)?.Value;
            if (value is not null)
            {
                return value;
            }
        }
        return null;
    }

    /// <summary>
    /// Get the translated value of a text resource
    /// </summary>
    /// <param name="key">Id of the text resource. If null, returns null.</param>
    /// <param name="language">Language for the text. If omitted, 'nb' will be used</param>
    /// <returns>The value of the text resource in the specified language or null</returns>
    /// <exception cref="ArgumentException">If the text resource with the specified key does not exist</exception>
    public async Task<string?> TranslateTextKeyLenient(string? key, string? language)
    {
        if (string.IsNullOrEmpty(key))
        {
            return null;
        }

        return await TranslateTextKey(key, language);
    }
}
