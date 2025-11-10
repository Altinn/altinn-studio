using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;

namespace Altinn.Studio.Designer.Services.Implementation.Organisation;

public class OrgLibraryService(IGitea gitea, ISourceControl sourceControl, ISharedContentClient sharedContentClient) : IOrgLibraryService
{
    private readonly ISourceControl _sourceControl = sourceControl;
    private readonly ISharedContentClient _sharedContentClient = sharedContentClient;

    private const string DefaultCommitMessage = "Update code lists.";
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true
    };

    /// <inheritdoc />
    public async Task<GetSharedResourcesResponse> GetSharedResourcesByPath(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        string repository = GetStaticContentRepo(org);
        List<FileSystemObject> files = [];
        List<FileSystemObject> directoryContent = await GetDirectoryContent(org, path, reference, cancellationToken);

        IEnumerable<string> filePaths = directoryContent
            .Where(f => string.Equals(Path.GetExtension(f.Name), ".json"))
            .Select(f => f.Path);

        ParallelOptions options = new() { MaxDegreeOfParallelism = 25, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(filePaths, options, async (filePath, token) =>
        {
            FileSystemObject file = await gitea.GetFileAsync(org, repository, filePath, reference, token);
            files.Add(file);
        });

        List<LibraryFile> listOfLibraryFiles = [];
        foreach (FileSystemObject file in files)
        {
            string contentType = Path.GetExtension(file.Name);
            LibraryFile libraryFile = new(
                Path: file.Path,
                ContentType: contentType,
                Content: file.Content,
                Url: null
            );
            listOfLibraryFiles.Add(libraryFile);
        }

        // Missing handling of non-json files. They should return the url.

        string baseCommitSha = await gitea.GetLatestCommitOnBranch(org, repository, reference, cancellationToken);

        return new GetSharedResourcesResponse(Files: listOfLibraryFiles, CommitSha: baseCommitSha);
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
        await Task.CompletedTask;
        throw new NotImplementedException();
    }


    private static string GetStaticContentRepo(string org)
    {
        return $"{org}-content";
    }
}
