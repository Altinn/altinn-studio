using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Exceptions.OrgLibrary;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class OrgLibraryService(IGitea gitea, ISourceControl sourceControl, IAltinnGitRepositoryFactory altinnGitRepositoryFactory) : IOrgLibraryService
{
    private const string DefaultCommitMessage = "Update code lists.";

    /// <inheritdoc />
    public async Task<GetSharedResourcesResponse> GetSharedResourcesByPath(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repository = GetStaticContentRepo(org);
        List<FileSystemObject> jsonFiles = [];
        List<FileSystemObject> directoryContent = await GetDirectoryContent(org, path, reference, cancellationToken);

        List<string> jsonFilePaths = [];
        List<FileSystemObject> otherFiles = [];
        foreach (FileSystemObject fileSystemObject in directoryContent)
        {
            string? fileExtension = Path.GetExtension(fileSystemObject.Name);
            switch (fileExtension)
            {
                case ".json":
                    jsonFilePaths.Add(fileSystemObject.Path);
                    break;
                default:
                    otherFiles.Add(fileSystemObject);
                    break;
            }
        }

        ParallelOptions options = new() { MaxDegreeOfParallelism = 25, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(jsonFilePaths, options,
            async (string filePath, CancellationToken token) =>
            {
                FileSystemObject file = await gitea.GetFileAsync(org, repository, filePath, reference, token);
                jsonFiles.Add(file);
            }
        );

        List<LibraryFile> libraryFiles = [];
        AddJsonFiles(jsonFiles, libraryFiles);
        AddOtherFiles(otherFiles, libraryFiles);

        string baseCommitSha = await gitea.GetLatestCommitOnBranch(org, repository, reference, cancellationToken);

        return new GetSharedResourcesResponse(Files: libraryFiles, CommitSha: baseCommitSha);
    }

    private static void AddJsonFiles(List<FileSystemObject> jsonFiles, List<LibraryFile> libraryFiles)
    {
        foreach (FileSystemObject jsonFile in jsonFiles)
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
    }

    private static void AddOtherFiles(List<FileSystemObject> otherFiles, List<LibraryFile> libraryFiles)
    {
        foreach (FileSystemObject file in otherFiles)
        {
            string contentType = Path.GetExtension(file.Name);
            LibraryFile libraryFile = new(
                Path: file.Path,
                ContentType: contentType,
                Content: null,
                Url: file.HtmlUrl
            );
            libraryFiles.Add(libraryFile);
        }
    }

    private async Task<List<FileSystemObject>> GetDirectoryContent(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default)
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
                string directoryPath = Path.Combine(path ?? "", element.Name);
                List<FileSystemObject> directoryFiles = await GetDirectoryContent(org, directoryPath, reference, cancellationToken);
                files.AddRange(directoryFiles);
            }
        }

        return files;
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

    private async Task UpdateFiles(AltinnRepoEditingContext editingContext, UpdateSharedResourceRequest request, CancellationToken cancellationToken)
    {
        ParallelOptions options = new() { MaxDegreeOfParallelism = 25, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(request.Files, options,
            async (FileMetadata fileMetadata, CancellationToken token) =>
            {
                await UpdateFile(editingContext.Org, editingContext.Developer, fileMetadata.Path, fileMetadata.Content, cancellationToken);
            }
        );
    }

    internal async Task UpdateFile(string org, string developer, string path, string content, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string repo = GetStaticContentRepo(org);
        AltinnGitRepository altinnOrgGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, repo, developer);

        await altinnOrgGitRepository.WriteTextByRelativePathAsync(path, content, createDirectory: true, cancellationToken);
    }

    internal static void ValidateCommitMessage(string? commitMessage)
    {
        if (string.IsNullOrWhiteSpace(commitMessage))
        {
            return;
        }
        if (InputValidator.IsValidGiteaCommitMessage(commitMessage) is false)
        {
            throw new IllegalCommitMessageException("The commit message is invalid. It must be between 1 and 5120 characters and not contain null characters.");
        }
    }

    private static string GetStaticContentRepo(string org)
    {
        return $"{org}-content";
    }
}
