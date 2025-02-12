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
    /// Gets a code list from the app repository with the specified codeListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The code list</returns>
    public Task<List<OptionListData>> GetCodeLists(string org, string repo, string developer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new code list in the app repository.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<Option>> CreateCodeList(string org, string repo, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new option to the code list.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="codeList">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<Option>> UpdateCodeList(string org, string repo, string developer, string codeListId, List<Option> codeList, CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new option to the code list.
    /// If the file already exists, it will be overwritten.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the new code list</param>
    /// <param name="payload">The code list contents</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<List<Option>> UploadCodeList(string org, string repo, string developer, string codeListId, IFormFile payload, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes an code list from the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    public void DeleteCodeList(string org, string repo, string developer, string codeListId);

    /// <summary>
    /// Checks if an code list exists in the org repository.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="codeListId">Name of the code list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public Task<bool> CodeListExists(string org, string repo, string developer, string codeListId, CancellationToken cancellationToken = default);
}
