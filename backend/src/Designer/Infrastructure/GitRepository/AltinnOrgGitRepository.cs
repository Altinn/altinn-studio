using System.IO;
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

    private static string GetPathToJsonTextsFile(string fileName)
    {
        return string.IsNullOrEmpty(fileName) ? LanguageResourceFolderName : Path.Combine(LanguageResourceFolderName, fileName);
    }
}
