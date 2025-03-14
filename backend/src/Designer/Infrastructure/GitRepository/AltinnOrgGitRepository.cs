using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using LibGit2Sharp;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

public class AltinnOrgGitRepository : AltinnGitRepository
{
    private const string CodeListFolderPath = "Codelists/";
    private const string LanguageResourceFolderName = "Texts/";


    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="AltinnOrgGitRepository"/> class.
    /// </summary>
    /// <param name="org">Organization owning the repository identified by it's short name.</param>
    /// <param name="repository">Repository name to search for schema files.</param>
    /// <param name="developer">Developer that is working on the repository.</param>
    /// <param name="repositoriesRootDirectory">Base path (full) for where the repository resides on-disk.</param>
    /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
    public AltinnOrgGitRepository(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory) : base(org, repository, developer, repositoriesRootDirectory, repositoryDirectory)
    {
    }

    /// <summary>
    /// Returns a specific text resource based on language code.
    /// </summary>
    /// <param name="languageCode">Language code</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The text file as a <see cref="TextResource"/></returns>
    /// <remarks>
    /// Format of the <see cref="TextResource"/> is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
    /// </remarks>
    public async Task<TextResource> GetText(string languageCode, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string resourcePath = GetPathToJsonTextsFile($"resource.{languageCode}.json");
        if (!FileExistsByRelativePath(resourcePath))
        {
            throw new NotFoundException("Text resource file not found.");
        }
        string fileContent = await ReadTextByRelativePathAsync(resourcePath, cancellationToken);
        TextResource textResource = JsonSerializer.Deserialize<TextResource>(fileContent, JsonOptions);

        return textResource;
    }

    /// <summary>
    /// Saves the text resource based on language code.
    /// </summary>
    /// <param name="languageCode">Language code</param>
    /// <param name="jsonTexts">text resource</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public async Task SaveText(string languageCode, TextResource jsonTexts, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string fileName = $"resource.{languageCode}.json";
        string textsFileRelativeFilePath = GetPathToJsonTextsFile(fileName);
        string texts = JsonSerializer.Serialize(jsonTexts, JsonOptions);
        await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts, true, cancellationToken);
    }

    /// <summary>
    /// Gets all code list Ids
    /// </summary>
    /// <returns>A list of code list Ids</returns>
    public string[] GetCodeListIds(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFolder = Path.Combine(CodeListFolderPath);
        if (!DirectoryExistsByRelativePath(codeListFolder))
        {
            return [];
        }

        string[] fileNames = GetFilesByRelativeDirectoryAscSorted(codeListFolder, "*.json");
        IEnumerable<string> codeListIds = fileNames.Select(Path.GetFileNameWithoutExtension);
        return codeListIds.ToArray();
    }

    /// <summary>
    /// Gets a specific code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to fetch.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The code list as a string.</returns>
    public async Task<List<Option>> GetCodeList(string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFilePath = Path.Combine(CodeListFolderPath, $"{codeListId}.json");
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }
        string fileContent = await ReadTextByRelativePathAsync(codeListFilePath, cancellationToken);
        List<Option> codeList = JsonSerializer.Deserialize<List<Option>>(fileContent, JsonOptions);

        return codeList;
    }

    /// <summary>
    /// Creates a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to create.</param>
    /// <param name="codeList">The code list contents.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public async Task CreateCodeList(string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string payloadString = JsonSerializer.Serialize(codeList, JsonOptions);

        string codeListFilePath = Path.Combine(CodeListFolderPath, $"{codeListId}.json");
        await WriteTextByRelativePathAsync(codeListFilePath, payloadString, true, cancellationToken);
    }

    /// <summary>
    /// Updates a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the cost list to update.</param>
    /// <param name="codeList">The code list contents.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public async Task UpdateCodeList(string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListString = JsonSerializer.Serialize(codeList, JsonOptions);

        string codeListFilePath = Path.Combine(CodeListFolderPath, $"{codeListId}.json");
        await WriteTextByRelativePathAsync(codeListFilePath, codeListString, false, cancellationToken);
    }

    /// <summary>
    /// Deletes a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the cost list to be deleted.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public void DeleteCodeList(string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFilePath = Path.Combine(CodeListFolderPath, $"{codeListId}.json");
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }

        DeleteFileByRelativePath(codeListFilePath);
    }

    private static string GetPathToJsonTextsFile(string fileName)
    {
        return string.IsNullOrEmpty(fileName) ? LanguageResourceFolderName : Path.Combine(LanguageResourceFolderName, fileName);
    }
}
