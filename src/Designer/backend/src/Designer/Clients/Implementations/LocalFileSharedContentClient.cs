using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.SharedContent;
using Microsoft.Extensions.Logging;
using Quartz.Util;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class LocalFileSharedContentClient(ILogger<LocalFileSharedContentClient> logger) : ISharedContentClient
{

    private const string InitialVersion = "1";
    private const string CodeListsSegment = "code_lists";
    private const string IndexFileName = "_index.json";
    private const string LatestCodeListFileName = "_latest.json";

    private readonly ConcurrentDictionary<string, string> _fileNamesAndContent = [];
    private string _currentVersion = InitialVersion;
    private readonly string _basePath = Path.Join(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "altinn", "published_resources");

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true
    };

    public async Task<string> PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        orgName.ValidPathSegment(nameof(orgName));
        codeListId.ValidPathSegment(nameof(codeListId));

        string resourceTypeIndexPrefix = orgName;
        string resourceIndexPrefix = CombineWithDelimiter(orgName, CodeListsSegment);
        string versionIndexPrefix = CombineWithDelimiter(orgName, CodeListsSegment, codeListId);

        Task organisationIndexTask = PrepareOrganisationIndexFile(orgName, cancellationToken);
        Task resourceTypeTask = PrepareResourceTypeIndexFile(resourceTypeIndexPrefix, CodeListsSegment, cancellationToken);
        Task resourceTask = PrepareResourceIndexFile(resourceIndexPrefix, codeListId, cancellationToken);
        Task versionTask = PrepareVersionIndexFile(versionIndexPrefix, cancellationToken);
        await Task.WhenAll(organisationIndexTask, resourceTypeTask, resourceTask, versionTask);

        string codeListFolderPath = CombineWithDelimiter(orgName, CodeListsSegment, codeListId);
        CreateCodeListFiles(codeList, codeListFolderPath, versionIndexPrefix);

        await UploadFiles(cancellationToken);
        return _currentVersion;
    }

    private async Task PrepareOrganisationIndexFile(string content, CancellationToken cancellationToken = default)
    {
        string path = IndexFileName; // No prefix since it's on root.
        try
        {
            await UpdateIndexFile(content, path, cancellationToken);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            AddIndexFile(path, [content]);
        }
        catch (Exception ex) when (ex is IOException)
        {
            logger.LogError("Issues with the file format when getting files, in {Client}", nameof(LocalFileSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(LocalFileSharedContentClient)}", ex);
        }
    }

    private async Task PrepareResourceTypeIndexFile(string pathPrefix, string resourceType, CancellationToken cancellationToken = default)
    {
        string content = CombineWithDelimiter(pathPrefix, resourceType);
        string path = CombineWithDelimiter(pathPrefix, IndexFileName);
        try
        {
            await UpdateIndexFile(content, path, cancellationToken);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            AddIndexFile(path, [content]);
        }
        catch (Exception ex) when (ex is IOException)
        {
            logger.LogError("Issues with the file format when getting files, in {Client}", nameof(LocalFileSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(LocalFileSharedContentClient)}", ex);
        }
    }

    private async Task PrepareResourceIndexFile(string pathPrefix, string resourceId, CancellationToken cancellationToken = default)
    {
        string content = CombineWithDelimiter(pathPrefix, resourceId);
        string path = CombineWithDelimiter(pathPrefix, IndexFileName);
        try
        {
            await UpdateIndexFile(content, path, cancellationToken);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            AddIndexFile(path, [content]);
        }
        catch (Exception ex) when (ex is IOException)
        {
            logger.LogError("Issues with the file format when getting files, in {Client}", nameof(LocalFileSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(LocalFileSharedContentClient)}", ex);
        }
    }

    private async Task PrepareVersionIndexFile(string pathPrefix, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(pathPrefix, IndexFileName);
        try
        {
            await UpdateCurrentVersion(pathPrefix, path, cancellationToken);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            AddIndexFile(path, [CombineWithDelimiter(pathPrefix, JsonFileName(InitialVersion))]);
        }
        catch (Exception ex) when (ex is IOException)
        {
            logger.LogError("File is empty or doesn't exist, in {Client}", nameof(LocalFileSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(LocalFileSharedContentClient)}", ex);
        }
    }

    private async Task UpdateCurrentVersion(
        string versionIndexPrefix,
        string versionIndexPath,
        CancellationToken cancellationToken
    )
    {
        string? versionsIndexString = await ReadFileByRelativePathAsync(versionIndexPath, cancellationToken);
        if (string.IsNullOrEmpty(versionsIndexString))
        {
            AddIndexFile(versionIndexPath, [CombineWithDelimiter(versionIndexPrefix, JsonFileName(InitialVersion))]);
            return;
        }

        IndexFile? versionsIndex = JsonSerializer.Deserialize<IndexFile?>(versionsIndexString, s_jsonOptions);
        List<string>? versions = versionsIndex?.Prefixes;

        if (versions is not null)
        {
            SetCurrentVersion(versions);
            string versionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(_currentVersion));
            versions.Add(versionWithPrefix);
            AddIndexFile(versionIndexPath, versions);
        }
        else
        {
            string initialVersionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(InitialVersion));
            AddIndexFile(versionIndexPath, [initialVersionWithPrefix]);
        }
    }

    private async Task UpdateIndexFile(
        string prefix,
        string indexFilePath,
        CancellationToken cancellationToken = default
    )
    {
        string? indexFileString = await ReadFileByRelativePathAsync(indexFilePath, cancellationToken);
        if (indexFileString is null)
        {
            AddIndexFile(indexFilePath, [prefix]);
        }
        else
        {
            IndexFile? indexFile = JsonSerializer.Deserialize<IndexFile?>(indexFileString, s_jsonOptions);

            List<string>? prefixes = indexFile?.Prefixes;

            if (prefixes is null)
            {
                AddIndexFile(indexFilePath, [prefix]);
                return;
            }

            if (prefixes.Contains(prefix) is false)
            {
                prefixes.Add(prefix);
                AddIndexFile(indexFilePath, prefixes);
            }
        }
    }

    private void AddIndexFile(string indexPath, List<string> prefixes)
    {
        IndexFile index = new(Prefixes: prefixes);
        string contents = JsonSerializer.Serialize(index, s_jsonOptions);
        _fileNamesAndContent[indexPath] = contents;
    }

    private void CreateCodeListFiles(CodeList codeList, string codeListFolderPath, string versionPrefix)
    {
        string version = CombineWithDelimiter(versionPrefix, JsonFileName(_currentVersion));
        SharedCodeList codeListContents = new(
            Codes: codeList.Codes,
            Version: version,
            Source: codeList.Source,
            TagNames: codeList.TagNames
        );
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);

        string codeListFileName = JsonFileName(_currentVersion);
        string codeListFilePath = CombineWithDelimiter(codeListFolderPath, codeListFileName);
        _fileNamesAndContent[codeListFilePath] = contentsString;

        string latestCodeListFilePath = CombineWithDelimiter(codeListFolderPath, LatestCodeListFileName);
        _fileNamesAndContent[latestCodeListFilePath] = contentsString;
    }

    private async Task UploadFiles(CancellationToken cancellationToken = default)
    {
        ParallelOptions options = new() { MaxDegreeOfParallelism = 10, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(_fileNamesAndContent, options, async (fileNameAndContent, token) =>
        {
            string relativePath = fileNameAndContent.Key;
            string text = fileNameAndContent.Value;
            await WriteTextByRelativePathAsync(relativePath, text, token);
        });
    }

    /// <summary>
    /// Combines with forward slash delimiter, no trailing slash.
    /// </summary>
    /// <param name="segments">Segments to join</param>
    private static string CombineWithDelimiter(params string?[] segments)
    {
        IEnumerable<string?> nonNulls = segments.Where(segment => string.IsNullOrWhiteSpace(segment) is false);
        return string.Join('/', nonNulls.Select(segment => segment?.Trim('/')));
    }

    private static string JsonFileName(string filename) => $"{filename}.json";

    private void SetCurrentVersion(List<string> versionPrefixes)
    {
        IEnumerable<string?> versionsAsString = versionPrefixes.Select(Path.GetFileNameWithoutExtension);
        List<int> versions = [];

        foreach (string? versionAsString in versionsAsString)
        {
            if (versionAsString is null) { continue; }

            bool success = int.TryParse(versionAsString, out int versionAsInt);
            if (success)
            {
                versions.Add(versionAsInt);
                continue;
            }

            logger.LogWarning("Could not parse version string to int: {VersionString}, class: {Class}", versionAsString, nameof(LocalFileSharedContentClient));
        }

        if (versions.Count == 0) { return; }

        int version = versions.Max();
        _currentVersion = (version + 1).ToString();
    }

    private async Task<string?> ReadFileByRelativePathAsync(string relativeFilePath, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string absoluteFilePath = Path.Join(_basePath, relativeFilePath);
        ValidatePathIsSubPath(absoluteFilePath);

        try
        {
            File.SetAttributes(absoluteFilePath, FileAttributes.Normal);
            return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8, cancellationToken);
        }
        catch (Exception ex) when (ex is IOException)
        {
            await Task.Delay(1000, cancellationToken);
            File.SetAttributes(absoluteFilePath, FileAttributes.Normal);
            return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8, cancellationToken);
        }
    }

    private async Task WriteTextByRelativePathAsync(string relativePath, string text, CancellationToken cancellationToken = default)
    {
        string absoluteFilePath = Path.Join(_basePath, relativePath);
        ValidatePathIsSubPath(absoluteFilePath);

        var fileInfo = new FileInfo(absoluteFilePath);
        if (Directory.Exists(fileInfo.Directory?.FullName) is false && fileInfo.Directory is not null)
        {
            Directory.CreateDirectory(fileInfo.Directory.FullName);
        }

        byte[] encodedText = Encoding.UTF8.GetBytes(text);
        await using FileStream sourceStream = new(absoluteFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
        await sourceStream.WriteAsync(encodedText.AsMemory(0, encodedText.Length), cancellationToken);
    }

    public async Task<List<string>> GetPublishedResourcesForOrg(string orgName, string path = "", CancellationToken cancellationToken = default)
    {
        orgName.ValidPathSegment(nameof(orgName));
        if (path.IsNullOrWhiteSpace() is false)
        {
            path.ValidatePath(nameof(path));
        }

        cancellationToken.ThrowIfCancellationRequested();
        string prefix = Path.Join(_basePath, orgName, path);
        ValidatePathIsSubPath(prefix);

        try
        {
            IEnumerable<string> directoryFiles = Directory.GetFiles(prefix, "*", SearchOption.AllDirectories);
            return directoryFiles
                .Select(file => Path.GetRelativePath(prefix, file).Replace("\\", "/"))
                .ToList();
        }
        catch (Exception ex) when (ex is DirectoryNotFoundException)
        {
            return await Task.FromResult<List<string>>([]);
        }
    }

    private void ValidatePathIsSubPath(string path)
    {
        string fullBasePath = Path.GetFullPath(_basePath);
        string normalizedFilePath = Path.GetFullPath(path);
        if (!normalizedFilePath.StartsWith(fullBasePath + Path.DirectorySeparatorChar) && normalizedFilePath != fullBasePath)
        {
            throw new UnauthorizedAccessException("Attempted path traversal or access outside permitted directory.");
        }
    }
}
