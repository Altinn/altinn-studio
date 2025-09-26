#nullable enable
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Services.Interfaces.Organisation;

public interface IOrgCodeListService
{
    /// <summary>
    /// Get all code list ids from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>List of code list ids</returns>
    public List<string> GetCodeListIds(string org, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all code lists from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The code lists</returns>
    public Task<List<OptionListData>> GetCodeLists(string org, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all code lists from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The code list with origin commit SHA.</returns>
    public Task<GetCodeListResponse> GetCodeListsNew(string org, string? reference = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new code list in the org repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<OptionListData>> CreateCodeList(string org, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing code list with new contents.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<OptionListData>> UpdateCodeList(string org, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies batched create/update/delete to the org repo. For deletions, pass a wrapper with CodeList = null.
    /// </summary>
    /// <param name="org"></param>
    /// <param name="developer"></param>
    /// <param name="request">The update request containing org, developer, code list wrappers, commit message, and reference.</param>
    /// <param name="reference"></param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task UpdateCodeListsNew(string org, string developer, UpdateCodeListRequest request, string? reference = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new code list in the org repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="payload">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<OptionListData>> UploadCodeList(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a code list from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<OptionListData>> DeleteCodeList(string org, string developer, string codeListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a code list exists in the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<bool> CodeListExists(string org, string developer, string codeListId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the name of a code list from the org repository by changing the filename.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    /// <param name="newCodeListId">The new name of the code list</param>
    public void UpdateCodeListId(string org, string developer, string codeListId, string newCodeListId);
}
