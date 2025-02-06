using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Organisation;

public interface IOrgTextsService
{
    /// <summary>
    /// Gets texts file in old format in app repository according to
    /// specified languageCode.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <returns>The text file</returns>
    public Task<TextResource> GetText(string org, string repo, string developer, string languageCode);

    /// <summary>
    /// Saves text resource in old format.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="textResource">The text resource to be saved</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <returns></returns>
    public Task SaveText(string org, string repo, string developer, TextResource textResource, string languageCode);

    /// <summary>
    /// Updates values for specified keys in the text resouce.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="keysTexts">KeysTexts</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <returns></returns>
    public Task UpdateTextsForKeys(string org, string repo, string developer, Dictionary<string, string> keysTexts, string languageCode);
}
