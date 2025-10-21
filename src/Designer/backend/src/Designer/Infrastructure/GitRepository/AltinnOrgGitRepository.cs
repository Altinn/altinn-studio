#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using LibGit2Sharp;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository;

public partial class AltinnOrgGitRepository : AltinnGitRepository
{
    private const string CodeListFolder = "CodeLists/";
    private const string CodeListWithTextResourcesFolder = "CodeListsWithTextResources/";
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
        if (!DirectoryExistsByRelativePath(LanguageResourceFolderName))
        {
            return [];
        }

        string[] languageFilePaths = GetFilesByRelativeDirectory(LanguageResourceFolderName, TextResourceFileNamePattern);

        var languageCodes = new List<string>();

        foreach (string filePath in languageFilePaths)
        {
            string fileName = Path.GetFileNameWithoutExtension(filePath);
            if (fileName == null)
            {
                continue;
            }

            Match match = LanguageCodeRegex().Match(fileName);
            if (!match.Success)
            {
                continue;
            }

            languageCodes.Add(match.Groups["lang"].Value);
        }

        return [.. languageCodes];
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

        string resourcePath = TextResourceFilePath(languageCode);
        string fileContent = await ReadTextByRelativePathAsync(resourcePath, cancellationToken);
        TextResource? textResource = JsonSerializer.Deserialize<TextResource>(fileContent, s_jsonOptions);

        if (textResource is null)
        {
            throw new InvalidOperationException("Text resource file was empty.");
        }

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
        string textsFileRelativeFilePath = TextResourceFilePath(languageCode);
        string texts = JsonSerializer.Serialize(jsonTexts, s_jsonOptions);
        await WriteTextByRelativePathAsync(textsFileRelativeFilePath, texts, true, cancellationToken);
    }

    /// <summary>
    /// Checks if a text resource file corresponding to the specified language code exists.
    /// </summary>
    /// <param name="languageCode">The language code corresponding to the text resource file.</param>
    public bool TextResourceFileExists(string languageCode)
    {
        string path = TextResourceFilePath(languageCode);
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

        if (!DirectoryExistsByRelativePath(CodeListWithTextResourcesFolder))
        {
            return [];
        }

        string[] fileNames = GetFilesByRelativeDirectoryAscSorted(CodeListWithTextResourcesFolder, "*.json");
        return [.. fileNames
            .Select(Path.GetFileNameWithoutExtension)
            .OfType<string>()];
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

        string codeListFilePath = CodeListWithTextResourcesFilePath(codeListId);
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }
        string fileContent = await ReadTextByRelativePathAsync(codeListFilePath, cancellationToken);
        List<Option>? codeList = JsonSerializer.Deserialize<List<Option>>(fileContent, s_jsonOptions);

        if (codeList is null)
        {
            throw new InvalidOperationException("No codes found in codelist.");
        }

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

        string codeListFilePath = CodeListWithTextResourcesFilePath(codeListId);
        await WriteTextByRelativePathAsync(codeListFilePath, payloadString, true, cancellationToken);
    }

    /// <summary>
    /// Updates a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to update.</param>
    /// <param name="codeList">The code list contents.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public async Task UpdateCodeList(string codeListId, List<Option> codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListString = JsonSerializer.Serialize(codeList, s_jsonOptions);

        string codeListFilePath = CodeListWithTextResourcesFilePath(codeListId);
        await WriteTextByRelativePathAsync(codeListFilePath, codeListString, false, cancellationToken);
    }

    /// <summary>
    /// Updates a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to update.</param>
    /// <param name="codeList">The code list contents.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public async Task UpdateCodeListNew(string codeListId, CodeList? codeList, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFilePath = CodeListFilePath(codeListId);

        if (codeList is null)
        {
            DeleteFileIfExists(codeListFilePath);
        }
        else
        {
            string codeListString = JsonSerializer.Serialize(codeList, s_jsonOptions);
            await WriteTextByRelativePathAsync(codeListFilePath, codeListString, true, cancellationToken);
        }
    }

    /// <summary>
    /// Renames a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to be renamed.</param>
    /// <param name="newCodeListId">The new name of the code list.</param>
    /// <exception cref="NotFoundException">File not found</exception>
    /// <exception cref="InvalidOperationException">Target code list name already exists.</exception>
    public void UpdateCodeListId(string codeListId, string newCodeListId)
    {
        string currentFilePath = CodeListWithTextResourcesFilePath(codeListId);
        if (!FileExistsByRelativePath(currentFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }

        string newFilePath = CodeListWithTextResourcesFilePath(newCodeListId);
        if (FileExistsByRelativePath(newFilePath))
        {
            throw new InvalidOperationException($"code list file {newCodeListId}.json already exists.");
        }

        string destinationFileName = CodeListFileName(newCodeListId);
        MoveFileByRelativePath(currentFilePath, newFilePath, destinationFileName);
    }

    /// <summary>
    /// Deletes a code list with the provided id.
    /// </summary>
    /// <param name="codeListId">The name of the code list to be deleted.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    public void DeleteCodeList(string codeListId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string codeListFilePath = CodeListWithTextResourcesFilePath(codeListId);
        if (!FileExistsByRelativePath(codeListFilePath))
        {
            throw new NotFoundException($"code list file {codeListId}.json was not found.");
        }

        DeleteFileByRelativePath(codeListFilePath);
    }

    private void DeleteFileIfExists(string filePath)
    {
        if (FileExistsByRelativePath(filePath))
        {
            DeleteFileByRelativePath(filePath);
        }
    }

    private static string TextResourceFilePath(string languageCode)
    {
        string fileName = TextResourceFileName(languageCode);
        return PathToTextResourceFileFromFilename(fileName);
    }

    private static string CodeListWithTextResourcesFilePath(string codeListId)
    {
        return Path.Join(CodeListWithTextResourcesFolder, CodeListFileName(codeListId));
    }

    private static string CodeListFilePath(string codeListId)
    {
        return Path.Join(CodeListFolder, CodeListFileName(codeListId));
    }

    private static string TextResourceFileName(string languageCode)
    {
        return $"resource.{languageCode}.json";
    }

    private static string CodeListFileName(string codeListId)
    {
        return $"{codeListId}.json";
    }

    private static string PathToTextResourceFileFromFilename(string fileName)
    {
        return string.IsNullOrEmpty(fileName) ? LanguageResourceFolderName : Path.Join(LanguageResourceFolderName, fileName);
    }

    [GeneratedRegex(@"^resource\.(?<lang>[A-Za-z]{2,3})$")]
    private static partial Regex LanguageCodeRegex();
}
