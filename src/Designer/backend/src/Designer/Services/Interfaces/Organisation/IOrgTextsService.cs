#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces.Organisation;

public interface IOrgTextsService
{
    /// <summary>
    /// Gets texts file in organisation repository according to specified language Code.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The text file</returns>
    public Task<TextResource> GetText(string org, string developer, string languageCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves text resource.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="textResource">The text resource to be saved</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task SaveText(string org, string developer, TextResource textResource, string languageCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates values for specified keys in the text resource.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="keysTexts">KeysTexts</param>
    /// <param name="languageCode">LanguageCode</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task UpdateTextsForKeys(string org, string developer, Dictionary<string, string> keysTexts, string languageCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets ids for all text resources.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of text IDs.</returns>
    public Task<List<string>> GetTextIds(string org, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets languages based on the text resource file names.
    /// </summary>
    /// <param name="org">Organisation.</param>
    /// <param name="developer">Username of developer.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of language codes.</returns>
    public List<string> GetLanguages(string org, string developer, CancellationToken cancellationToken = default);
}
