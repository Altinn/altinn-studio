using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling options lists.
/// </summary>
public interface IOptionsService
{
    /// <summary>
    /// Gets a list of file names from the Options folder representing the available options lists.
    /// </summary>
    /// <param name="org"></param>
    /// <param name="repo"></param>
    /// <param name="developer"></param>
    /// <returns></returns>
    public string[] GetOptionListIds(string org, string repo, string developer);

    /// <summary>
    /// Gets a options file from the app repository with the specified optionListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionListId">Name of the options list to fetch</param>
    /// <returns>The options list as a dictionary</returns>
    public Task<List<Option>> GetOptions(string org, string repo, string developer, string optionListId);

    /// <summary>
    /// Creates a new options file in the app repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionListId">Name of the new options list</param>
    /// <param name="payload">The options list contents</param>
    public Task<List<Option>> UpdateOptions(string org, string repo, string developer, string optionListId, List<Option> payload);

    /// <summary>
    /// Deletes an options file from the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionListId">Name of the new options list</param>
    public void DeleteOptions(string org, string repo, string developer, string optionListId);
}
