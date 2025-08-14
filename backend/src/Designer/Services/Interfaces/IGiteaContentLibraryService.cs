using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IGiteaContentLibraryService
{
    /// <summary>
    /// Retrieves a code list from the content repository from Gitea with the specified optionListId.
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <param name="codeListId">The name of the code list to fetch.</param>
    /// <returns>The code list</returns>
    public Task<List<Option>> GetCodeList(string orgName, string codeListId);
    /// <summary>
    ///
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <param name="codeListId">The name of the code list to check if already exists.</param>
    /// <returns></returns>
    public Task<bool> CodeListExists(string orgName, string codeListId);
    /// <summary>
    /// Retrieves a list of file names from the CodeLists folder in the content repository in Gitea.
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <returns>A list of code list ids.</returns>
    public Task<List<string>> GetCodeListIds(string orgName);
    /// <summary>
    /// Retrieves the language codes from the content repository from Gitea.
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <returns>Language codes</returns>
    public Task<List<string>> GetLanguages(string orgName);
    /// <summary>
    /// Retrieves the text file in the content repository from Gitea
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <param name="languageCode">The language code for the text resource.</param>
    /// <returns>The text file</returns>
    public Task<TextResource> GetTextResource(string orgName, string languageCode);
    /// <summary>
    /// Retrieves ids for all text resource elements in the content repository from Gitea.
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <returns>A list of text IDs.</returns>
    public Task<List<string>> GetTextIds(string orgName);
    /// <summary>
    /// Gets the commit SHA for a code list on the default/master branch in the content repository from Gitea.
    /// </summary>
    /// <param name="orgName">The name of the organisation.</param>
    /// <param name="codeListId">The name of the code list.</param>
    /// <returns>Commit SHA</returns>
    public Task<string> GetCommitShaForCodeList(string orgName, string codeListId);
}
