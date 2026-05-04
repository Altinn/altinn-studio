using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Interface to talk to the text repository
/// </summary>
public interface ITextRepository
{
    /// <summary>
    /// Gets a text resource
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the app</param>
    /// <param name="language">the language. Must be a two letter ISO name.</param>
    /// <returns>the text resource</returns>
    Task<TextResource> Get(string org, string app, string language);

    /// <summary>
    /// Gets a list of text resources based on appId.
    /// </summary>
    /// <param name="appIds">List of application ids e.g. ttd/apps-test</param>
    /// <param name="language">the language. Must be a two letter ISO name.</param>
    /// <returns>the list of text resource</returns>
    Task<List<TextResource>> Get(List<string> appIds, string language);

    /// <summary>
    /// Creates a text resource
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the app</param>
    /// <param name="textResource">the text resource to be created</param>
    /// <returns>the created text resource</returns>
    Task<TextResource> Create(string org, string app, TextResource textResource);

    /// <summary>
    /// Updates a text resource
    /// </summary>
    /// <param name="org">the org </param>
    /// <param name="app">the app </param>
    /// <param name="textResource">the text resource object to be updated</param>
    /// <returns>the updated text resource</returns>
    Task<TextResource> Update(string org, string app, TextResource textResource);

    /// <summary>
    /// Deletes a text resource
    /// </summary>
    /// <param name="org">the org</param>
    /// <param name="app">the app</param>
    /// <param name="language">the language. Must be a two letter ISO name.</param>
    /// <returns>if the item is deleted or not</returns>
    Task<bool> Delete(string org, string app, string language);
}
