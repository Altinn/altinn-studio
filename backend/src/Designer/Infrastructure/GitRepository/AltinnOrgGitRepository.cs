using System;
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
    private const string TextResourceFileNamePattern = "resource.??.json";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
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

    public List<string> GetLanguages()
    {
        string[] languageFilePaths = GetFilesByRelativeDirectory(LanguageResourceFolderName, TextResourceFileNamePattern);

        List<string> languages = languageFilePaths
            .Select(Path.GetFileName)
            .Select(fileName => fileName.Split('.')[1])
            .ToList();

        languages.Sort(StringComparer.Ordinal);
        return languages;
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
        if (!TextResourceFileExists(languageCode))
        {
            throw new NotFoundException("Text resource file not found.");
        }

        string resourcePath = GetPathToTextResourceFromLanguageCode(languageCode);
        string fileContent = await ReadTextByRelativePathAsync(resourcePath, cancellationToken);
        TextResource textResource = JsonSerializer.Deserialize<TextResource>(fileContent, s_jsonOptions);

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
        string textsFileRelativeFilePath = GetPathToTextResourceFromLanguageCode(languageCode);
        string texts = JsonSerializer.Serialize(jsonTexts, s_jsonOptions);
        await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts, true, cancellationToken);
    }

    /// <summary>
    /// Checks if a text resource file corresponding to the specified language code exists.
    /// </summary>
    /// <param name="languageCode">The language code corresponding to the text resource file.</param>
    public bool TextResourceFileExists(string languageCode)
    {
        string path = GetPathToTextResourceFromLanguageCode(languageCode);
        return FileExistsByRelativePath(path);
    }

    /// <summary>
    /// Gets all code list Ids
    /// </summary>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of code list Ids</returns>
    public List<string> GetCodeListIds(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFolder = Path.Combine(CodeListFolderPath);
        if (!DirectoryExistsByRelativePath(codeListFolder))
        {
            return [];
        }

        string[] fileNames = GetFilesByRelativeDirectoryAscSorted(codeListFolder, "*.json");
        IEnumerable<string> codeListIds = fileNames.Select(Path.GetFileNameWithoutExtension);
        return codeListIds.ToList();
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

        string codeListFilePath = GetCodeListFilePath(codeListId);
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }
        string fileContent = await ReadTextByRelativePathAsync(codeListFilePath, cancellationToken);
        List<Option> codeList = JsonSerializer.Deserialize<List<Option>>(fileContent, s_jsonOptions);

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

        string payloadString = JsonSerializer.Serialize(codeList, s_jsonOptions);

        string codeListFilePath = GetCodeListFilePath(codeListId);
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

        string codeListString = JsonSerializer.Serialize(codeList, s_jsonOptions);

        string codeListFilePath = GetCodeListFilePath(codeListId);
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

        string codeListFilePath = GetCodeListFilePath(codeListId);
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }

        DeleteFileByRelativePath(codeListFilePath);
    }

    public void UpdateCodeListId(string codeListId, string newCodeListId)
    {
        string currentFilePath = GetCodeListFilePath(codeListId);
        string newFilePath = GetCodeListFilePath(newCodeListId);
        string destinationFileName = GetCodeListFileName(newCodeListId);
        MoveFileByRelativePath(currentFilePath, newFilePath, destinationFileName);
    }
    private static string GetPathToTextResourceFromLanguageCode(string languageCode)
    {
        string fileName = GetTextResourceFileName(languageCode);
        return GetPathToTextResourceFileFromFilename(fileName);
    }

    private static string GetCodeListFilePath(string codeListId)
    {
        return Path.Combine(CodeListFolderPath, GetCodeListFileName(codeListId));
    }

    private static string GetTextResourceFileName(string languageCode)
    {
        return $"resource.{languageCode}.json";
    }

    private static string GetCodeListFileName(string codeListId)
    {
        return $"{codeListId}.json";
    }

    private static string GetPathToTextResourceFileFromFilename(string fileName)
    {
        return string.IsNullOrEmpty(fileName) ? LanguageResourceFolderName : Path.Combine(LanguageResourceFolderName, fileName);
    }
}
