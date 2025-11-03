#nullable disable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Http;

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
    public string[] GetOptionsListIds(string org, string repo, string developer);

    /// <summary>
    /// Gets an options list from the app repository with the specified optionListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list to fetch</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The options list</returns>
    public Task<List<Option>> GetOptionsList(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all option lists from the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>All option lists</returns>
    public Task<List<OptionListData>> GetOptionLists(string org, string repo, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new options list in the app repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the new options list</param>
    /// <param name="payload">The options list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<Option>> CreateOrOverwriteOptionsList(string org, string repo, string developer, string optionsListId, List<Option> payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new option to the option list.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the new options list</param>
    /// <param name="payload">The options list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<Option>> UploadNewOption(string org, string repo, string developer, string optionsListId, IFormFile payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes an options list from the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list</param>
    public void DeleteOptionsList(string org, string repo, string developer, string optionsListId);

    /// <summary>
    /// Checks if an options list exists in the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<bool> OptionsListExists(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the name of the options list by changing the filename.
    /// </summary>
    /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="optionsListId">Name of the options list</param>
    /// <param name="newOptionsListId">The new name of the options list file.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public void UpdateOptionsListId(AltinnRepoEditingContext altinnRepoEditingContext, string optionsListId, string newOptionsListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Imports a code list from the static content repository associated with a provided organisation.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionListId">Name of the option list</param>
    /// <param name="overwriteTextResources">Override existing text resources</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The imported option list, null if option list id already exists</returns>
    public Task<(List<OptionListData>, Dictionary<string, TextResource>)> ImportOptionListFromOrg(string org, string repo, string developer, string optionListId, bool overwriteTextResources, CancellationToken cancellationToken = default);
}
