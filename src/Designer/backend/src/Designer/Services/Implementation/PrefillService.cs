#nullable disable
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Implementation of the <see cref="IPrefillService"/> providing methods to read and write
/// the prefill configuration file (&lt;model&gt;.prefill.json) belonging to a data model.
/// </summary>
public class PrefillService : IPrefillService
{
    private const string SchemaFileSuffix = ".schema.json";
    private const string PrefillFileSuffix = ".prefill.json";

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="PrefillService"/> class.
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">
    /// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
    /// </param>
    public PrefillService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    /// <inheritdoc/>
    public async Task<string> GetPrefill(
        AltinnRepoEditingContext altinnRepoEditingContext,
        string modelPath,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        ValidateModelPath(modelPath);
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );
        string prefillFilePath = GetPrefillFilePath(modelPath);

        if (!altinnAppGitRepository.FileExistsByRelativePath(prefillFilePath))
        {
            return null;
        }

        return await altinnAppGitRepository.ReadTextByRelativePathAsync(prefillFilePath, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task SavePrefill(
        AltinnRepoEditingContext altinnRepoEditingContext,
        string modelPath,
        string jsonContent,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        ValidateModelPath(modelPath);
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );
        string prefillFilePath = GetPrefillFilePath(modelPath);

        await altinnAppGitRepository.WriteTextByRelativePathAsync(
            prefillFilePath,
            jsonContent,
            true,
            cancellationToken
        );
    }

    private static string GetPrefillFilePath(string modelPath)
    {
        return modelPath.Replace(SchemaFileSuffix, PrefillFileSuffix);
    }

    private static void ValidateModelPath(string modelPath)
    {
        if (string.IsNullOrWhiteSpace(modelPath) || modelPath.Contains(".."))
        {
            throw new ArgumentException($"Invalid model path: {modelPath}", nameof(modelPath));
        }

        // Repository-relative paths (e.g. AltinnCoreFile.RepositoryRelativeUrl, which is what the
        // frontend sends as modelPath) conventionally start with a single leading slash. That leading
        // separator is stripped in GitRepository.GetAbsoluteFileOrDirectoryPathSanitized before the path
        // is resolved, so it must be stripped here too before checking for an actually rooted path
        // (e.g. a Windows drive path or a UNC/double-slash path), otherwise every legitimate model path
        // would be rejected.
        string pathWithoutLeadingSeparator =
            modelPath.StartsWith('/') || modelPath.StartsWith('\\') ? modelPath[1..] : modelPath;

        if (Path.IsPathRooted(pathWithoutLeadingSeparator))
        {
            throw new ArgumentException($"Invalid model path: {modelPath}", nameof(modelPath));
        }
    }
}
