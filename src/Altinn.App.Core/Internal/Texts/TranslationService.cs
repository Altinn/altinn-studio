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
    public async Task<string> TranslateTextKey(string key, string? language)
    {
        language = language ?? LanguageConst.Nb;
        TextResource? textResource = await _appResources.GetTexts(_org, _app, language);

        if (textResource == null && language != LanguageConst.Nb)
        {
            textResource = await _appResources.GetTexts(_org, _app, LanguageConst.Nb);
        }

        if (textResource == null)
        {
            throw new ArgumentException($"Could not locate text resource file with language = \"{language}\"");
        }

        var value = textResource.Resources.Find(resource => resource.Id == key)?.Value;

        if (value == null)
        {
            throw new ArgumentException($"Text resource with id = {key} does not exist");
        }

        return value;
    }
}
