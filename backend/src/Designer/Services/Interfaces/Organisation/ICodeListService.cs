using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Interfaces.Organisation;

public interface ICodeListService
{
    /// <summary>
    /// Gets a list of file names from the Options folder representing the available options lists.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <returns>Options lists</returns>
    public string[] GetCodeListIds(string org, string repo, string developer);

    /// <summary>
    /// Gets an options list from the app repository with the specified optionListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list to fetch</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The options list</returns>
    public Task<List<Option>> GetCodeList(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets an options list from the app repository with the specified optionListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The options list</returns>
    public Task<List<OptionListData>> GetCodeLists(string org, string repo, string developer, CancellationToken cancellationToken = default);

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
    public Task<List<OptionListData>> CreateCodeList(string org, string repo, string developer, string optionsListId, List<Option> payload, CancellationToken cancellationToken = default);

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
    public Task<List<OptionListData>> UpdateCodeList(string org, string repo, string developer, string optionsListId, List<Option> payload, CancellationToken cancellationToken = default);

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
    public Task<List<OptionListData>> UploadCodeList(string org, string repo, string developer, string optionsListId, IFormFile payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes an options list from the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list</param>
    public void DeleteCodeList(string org, string repo, string developer, string optionsListId);

    /// <summary>
    /// Checks if an options list exists in the app repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Name of the options list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<bool> CodeListExists(string org, string repo, string developer, string optionsListId, CancellationToken cancellationToken = default);
}
