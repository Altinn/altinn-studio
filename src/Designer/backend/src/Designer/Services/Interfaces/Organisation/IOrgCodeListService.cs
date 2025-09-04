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
    /// Get all code list ids from the org repository
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
    /// <returns>The code list</returns>
    public Task<List<OptionListData>> GetCodeLists(string org, string developer, CancellationToken cancellationToken = default);

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

    /// <summary>
    /// Gets all code lists from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The code list</returns>
    public Task<List<CodeListData>> GetCodeListsNew(string org, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new code list in the org repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<CodeListData>> CreateCodeListNew(string org, string developer, string codeListId, CodeList codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing code list with new contents.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<CodeListData>> UpdateCodeListNew(string org, string developer, string codeListId, CodeList codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new code list in the org repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="payload">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<CodeListData>> UploadCodeListNew(string org, string developer, IFormFile payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a code list from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<CodeListData>> DeleteCodeListNew(string org, string developer, string codeListId, CancellationToken cancellationToken = default);
}
