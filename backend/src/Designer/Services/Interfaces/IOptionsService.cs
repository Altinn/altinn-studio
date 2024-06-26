using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling options lists.
/// </summary>
public interface IOptionsService
{
    /// <summary>
    /// Gets a options file from the app repository with the specified optionsListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list to fetch</param>
    /// <returns>The options list as a dictionary</returns>
    public Task<List<Dictionary<string, string>>> GetOptionsList(string org, string repo, string developer, string optionsListId);

    /// <summary>
    /// Creates a new options file in the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the new options list</param>
    /// <param name="optionsListPayload">The options list contents</param>
    public Task<List<Dictionary<string, string>>> CreateOrOverwriteOptionsList(string org, string repo, string developer, string optionsListId, List<Dictionary<string, string>> optionsListPayload);
}
