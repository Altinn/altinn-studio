using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Exceptions.OrgLibrary;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class OrgLibraryService(IGitea gitea, ISourceControl sourceControl, IAltinnGitRepositoryFactory altinnGitRepositoryFactory, ParallelismSettings parallelismSettings) : IOrgLibraryService
{
    private const string DefaultCommitMessage = "Update code lists.";
    private const string JsonExtension = ".json";

    /// <inheritdoc />
    public async Task<GetSharedResourcesResponse> GetSharedResourcesByPath(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repository = GetStaticContentRepo(org);
        List<FileSystemObject> directoryContent = await GetDirectoryContent(org, path, reference, cancellationToken);

        ConcurrentBag<LibraryFile> libraryFiles = [];

        int maxParallellism = parallelismSettings.FetchFilesFromGitea;
        ParallelOptions options = new() { MaxDegreeOfParallelism = maxParallellism, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(directoryContent, options,
            async (FileSystemObject fileSystemObject, CancellationToken token) =>
            {
                string? fileExtension = Path.GetExtension(fileSystemObject.Name);
                switch (fileExtension)
                {
                    case JsonExtension:
                        FileSystemObject file = await gitea.GetFileAsync(org, repository, fileSystemObject.Path, reference, token);
                        AddJsonFile(file, libraryFiles);
                        break;
                    default:
                        AddOtherFile(fileSystemObject, libraryFiles);
                        break;
                }
            }
        );

        string baseCommitSha = await gitea.GetLatestCommitOnBranch(org, repository, reference, cancellationToken);

        return new GetSharedResourcesResponse(Files: [.. libraryFiles], CommitSha: baseCommitSha);
    }

    /// <inheritdoc />
    public async Task UpdateSharedResourcesByPath(string org, string developer, UpdateSharedResourceRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        ValidateCommitMessage(request.CommitMessage);
        string repositoryName = GetStaticContentRepo(org);

        await sourceControl.CloneIfNotExists(org, repositoryName);
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repositoryName, developer);

        string latestCommitSha = await gitea.GetLatestCommitOnBranch(org, repositoryName, General.DefaultBranch, cancellationToken);
        if (latestCommitSha == request.BaseCommitSha)
        {
            await HandleCommit(editingContext, request, cancellationToken);
        }
        else
        {
            await HandleDivergentCommit(editingContext, request, cancellationToken);
        }
        bool pushOk = await sourceControl.Push(org, repositoryName);
        if (!pushOk)
        {
            throw new InvalidOperationException($"Push failed for {org}/{repositoryName}. Remote rejected the update.");
        }
    }

    internal async Task HandleCommit(AltinnRepoEditingContext editingContext, UpdateSharedResourceRequest request, CancellationToken cancellationToken = default)
    {
        sourceControl.CheckoutRepoOnBranch(editingContext, General.DefaultBranch);
        await UpdateFiles(editingContext, request, cancellationToken);
        sourceControl.CommitToLocalRepo(editingContext, request.CommitMessage ?? DefaultCommitMessage);
    }

    internal async Task HandleDivergentCommit(AltinnRepoEditingContext editingContext, UpdateSharedResourceRequest request, CancellationToken cancellationToken = default)
    {
        string branchName = editingContext.Developer;
        sourceControl.DeleteLocalBranchIfExists(editingContext, branchName);
        sourceControl.CreateLocalBranch(editingContext, branchName, request.BaseCommitSha);
        sourceControl.CheckoutRepoOnBranch(editingContext, branchName);

        await UpdateFiles(editingContext, request, cancellationToken);

        sourceControl.CommitToLocalRepo(editingContext, request.CommitMessage ?? DefaultCommitMessage);
        sourceControl.RebaseOntoDefaultBranch(editingContext);
        sourceControl.CheckoutRepoOnBranch(editingContext, General.DefaultBranch);
        sourceControl.MergeBranchIntoHead(editingContext, branchName);
        sourceControl.DeleteLocalBranchIfExists(editingContext, branchName);
    }

    internal async Task<List<FileSystemObject>> GetDirectoryContent(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        List<FileSystemObject> files = [];
        string repository = GetStaticContentRepo(org);

        List<FileSystemObject> directoryContent = await gitea.GetDirectoryAsync(org, repository, path, reference, cancellationToken);

        foreach (FileSystemObject element in directoryContent)
        {
            if (element.Type == "file")
            {
                files.Add(element);
            }

            if (element.Type == "dir")
            {
                string directoryPath = string.IsNullOrEmpty(path) ? element.Name : $"{path.TrimEnd('/')}/{element.Name}";
                List<FileSystemObject> directoryFiles = await GetDirectoryContent(org, directoryPath, reference, cancellationToken);
                files.AddRange(directoryFiles);
            }
        }

        return files;
    }


    internal async Task UpdateFiles(AltinnRepoEditingContext editingContext, UpdateSharedResourceRequest request, CancellationToken cancellationToken)
    {
        ParallelOptions options = new() { MaxDegreeOfParallelism = 25, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(request.Files, options,
            async (FileMetadata fileMetadata, CancellationToken token) =>
            {
                await UpdateFile(editingContext.Org, editingContext.Developer, fileMetadata, token);
            }
        );
    }

    internal async Task UpdateFile(string org, string developer, FileMetadata fileMetadata, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnGitRepository altinnOrgGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, repo, developer);

        if (fileMetadata.Encoding?.Equals("base64", StringComparison.OrdinalIgnoreCase) is true)
        {
            byte[] data = Convert.FromBase64String(fileMetadata.Content);
            using MemoryStream stream = new(data);
            await altinnOrgGitRepository.WriteStreamByRelativePathAsync(fileMetadata.Path, stream, createDirectory: true, cancellationToken);
        }
        else
        {
            await altinnOrgGitRepository.WriteTextByRelativePathAsync(fileMetadata.Path, fileMetadata.Content, createDirectory: true, cancellationToken);
        }
    }

    internal static void ValidateCommitMessage(string? commitMessage)
    {
        if (commitMessage is null)
        {
            return; // Default message will be used
        }
        if (commitMessage.Trim().Length == 0)
        {
            throw new IllegalCommitMessageException("The commit message cannot be whitespace only.");
        }
        if (InputValidator.IsValidGiteaCommitMessage(commitMessage) is false)
        {
            throw new IllegalCommitMessageException("The commit message is invalid. It must be between 1 and 5120 characters and not contain null characters.");
        }
    }

    private static void AddJsonFile(FileSystemObject jsonFile, ConcurrentBag<LibraryFile> libraryFiles)
    {
        string contentType = Path.GetExtension(jsonFile.Name);
        LibraryFile libraryFile = new(
            Path: jsonFile.Path,
            ContentType: contentType,
            Content: jsonFile.Content,
            Url: null
        );
        libraryFiles.Add(libraryFile);
    }

    private static void AddOtherFile(FileSystemObject otherFile, ConcurrentBag<LibraryFile> libraryFiles)
    {
        string contentType = Path.GetExtension(otherFile.Name);
        LibraryFile libraryFile = new(
            Path: otherFile.Path,
            ContentType: contentType,
            Content: null,
            Url: otherFile.HtmlUrl
        );
        libraryFiles.Add(libraryFile);
    }

    private static string GetStaticContentRepo(string org)
    {
        return $"{org}-content";
    }
}
