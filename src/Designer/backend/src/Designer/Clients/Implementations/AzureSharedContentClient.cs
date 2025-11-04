#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.SharedContent;
using Azure;
using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class AzureSharedContentClient : ISharedContentClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureSharedContentClient> _logger;
    private readonly SharedContentClientSettings _sharedContentClientSettings;
    private readonly string _sharedContentBaseUri;

    private const string InitialVersion = "1";
    private const string CodeListsSegment = "code_lists";
    private const string IndexFileName = "_index.json";
    private const string LatestCodeListFileName = "_latest.json";

    internal string CurrentVersion = InitialVersion;
    internal readonly Dictionary<string, string> FileNamesAndContent = [];

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true
    };

    public AzureSharedContentClient(HttpClient httpClient, ILogger<AzureSharedContentClient> logger, SharedContentClientSettings sharedContentClientSettings)
    {
        _httpClient = httpClient;
        _logger = logger;
        _sharedContentClientSettings = sharedContentClientSettings;

        string storageAccountUrl = sharedContentClientSettings.StorageAccountUrl;
        string storageContainerName = sharedContentClientSettings.StorageContainerName;

        if (string.IsNullOrWhiteSpace(storageAccountUrl) || string.IsNullOrWhiteSpace(storageContainerName))
        {
            throw new ArgumentException("StorageAccountUrl and StorageContainerName are required");
        }
        _sharedContentBaseUri = CombineWithDelimiter(storageAccountUrl, storageContainerName);
    }

    public async Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        BlobContainerClient containerClient = GetContainerClient();
        await ThrowIfUnhealthy(containerClient, cancellationToken);

        string resourceTypeIndexPrefix = orgName;
        string resourceIndexPrefix = CombineWithDelimiter(orgName, CodeListsSegment);
        string versionIndexPrefix = CombineWithDelimiter(orgName, CodeListsSegment, codeListId);

        Task organisationIndexTask = PrepareOrganisationIndexFile(orgName, cancellationToken);
        Task resourceTypeTask = PrepareResourceTypeIndexFile(resourceTypeIndexPrefix, CodeListsSegment, cancellationToken);
        Task resourceTask = PrepareResourceIndexFile(resourceIndexPrefix, codeListId, cancellationToken);
        Task versionTask =  PrepareVersionIndexFile(versionIndexPrefix, cancellationToken);
        await Task.WhenAll(organisationIndexTask, resourceTypeTask, resourceTask, versionTask);

        string codeListFolderPath = CombineWithDelimiter(orgName, CodeListsSegment, codeListId);
        CreateCodeListFiles(codeList, codeListFolderPath, versionIndexPrefix);

        await UploadBlobs(containerClient, cancellationToken);
    }

    internal async Task PrepareOrganisationIndexFile(string orgName, CancellationToken cancellationToken = default)
    {
        string url = CombineWithDelimiter(_sharedContentBaseUri, IndexFileName);
        string path = IndexFileName; // No prefix since it's on root.
        using HttpResponseMessage response = await _httpClient.GetAsync(new Uri(url), cancellationToken);

        await HandleResponse(response, orgName, path, cancellationToken);
    }

    internal async Task PrepareResourceTypeIndexFile(string resourceTypeIndexPrefix, string resourceType, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(resourceTypeIndexPrefix, IndexFileName);
        string url = CombineWithDelimiter(_sharedContentBaseUri, path);
        using HttpResponseMessage response = await _httpClient.GetAsync(new Uri(url), cancellationToken);

        string content = CombineWithDelimiter(resourceTypeIndexPrefix, resourceType);
        await HandleResponse(response, content, path, cancellationToken);
    }

    internal async Task PrepareResourceIndexFile(string resourceIndexPrefix, string resourceId, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(resourceIndexPrefix, IndexFileName);
        string url = CombineWithDelimiter(_sharedContentBaseUri, path);
        using HttpResponseMessage response = await _httpClient.GetAsync(new Uri(url), cancellationToken);

        string content = CombineWithDelimiter(resourceIndexPrefix, resourceId);
        await HandleResponse(response, content, path, cancellationToken);
    }

    internal async Task PrepareVersionIndexFile(string versionIndexPrefix, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(versionIndexPrefix, IndexFileName);
        string uri = CombineWithDelimiter(_sharedContentBaseUri, path);
        using HttpResponseMessage response = await _httpClient.GetAsync(new Uri(uri), cancellationToken);

        string content = CombineWithDelimiter(versionIndexPrefix, JsonFileName(InitialVersion));

        switch (response.StatusCode)
        {
            case HttpStatusCode.OK:
                await HandleVersionIndexSuccess(response, versionIndexPrefix, path, cancellationToken);
                break;
            case HttpStatusCode.NotFound:
                AddIndexFile(path, [content]);
                break;
            default:
                _logger.LogError("Unexpected response status code {StatusCode}, in {Client}", response.StatusCode, nameof(AzureSharedContentClient));
                throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    private async Task HandleResponse(HttpResponseMessage response, string content, string path, CancellationToken cancellationToken = default)
    {
        switch (response.StatusCode)
        {
            case HttpStatusCode.OK:
                await UpdateIndexFileFromResponse(response, content, path, cancellationToken);
                break;
            case HttpStatusCode.NotFound:
                AddIndexFile(path, [content]);
                break;
            default:
                _logger.LogError("Unexpected response status code {StatusCode}, in {Client}", response.StatusCode, nameof(AzureSharedContentClient));
                throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    private async Task UpdateIndexFileFromResponse(
        HttpResponseMessage response,
        string content,
        string indexFilePath,
        CancellationToken cancellationToken = default
    )
    {
        string indexFileString = await response.Content.ReadAsStringAsync(cancellationToken);

        if (string.IsNullOrEmpty(indexFileString))
        {
            AddIndexFile(indexFilePath, [content]);
            return;
        }

        IndexFile? indexFile = JsonSerializer.Deserialize<IndexFile?>(indexFileString, s_jsonOptions);
        List<string>? prefixes = indexFile?.Prefixes;

        if (prefixes is null)
        {
            AddIndexFile(indexFilePath, [content]);
            return;
        }

        if (prefixes.Contains(content) is false)
        {
            prefixes.Add(content);
            AddIndexFile(indexFilePath, prefixes);
        }
    }

    private async Task HandleVersionIndexSuccess(
        HttpResponseMessage response,
        string versionIndexPrefix,
        string versionIndexPath,
        CancellationToken cancellationToken = default
    )
    {
        string versionsIndexString = await response.Content.ReadAsStringAsync(cancellationToken);

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
            string versionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(CurrentVersion));
            versions.Add(versionWithPrefix);
            AddIndexFile(versionIndexPath, versions);
        }
        else
        {
            string initialVersionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(InitialVersion));
            AddIndexFile(versionIndexPath, [initialVersionWithPrefix]);
        }
    }

    internal void AddIndexFile(string indexPath, List<string> prefixes)
    {
        IndexFile index = new(Prefixes: prefixes);
        string contents = JsonSerializer.Serialize(index, s_jsonOptions);
        FileNamesAndContent[indexPath] = contents;
    }

    internal void CreateCodeListFiles(CodeList codeList, string codeListFolderPath, string versionPrefix)
    {
        string version = CombineWithDelimiter(versionPrefix, JsonFileName(CurrentVersion));
        SharedCodeList codeListContents = new(
            Codes: codeList.Codes,
            Version: version,
            Source: codeList.Source,
            TagNames: codeList.TagNames
        );
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);

        string codeListFileName = JsonFileName(CurrentVersion);
        string codeListFilePath = CombineWithDelimiter(codeListFolderPath, codeListFileName);
        FileNamesAndContent[codeListFilePath] = contentsString;

        string latestCodeListFilePath = CombineWithDelimiter(codeListFolderPath, LatestCodeListFileName);
        FileNamesAndContent[latestCodeListFilePath] = contentsString;
    }

    internal async Task UploadBlobs(BlobContainerClient containerClient, CancellationToken cancellationToken = default)
    {
        ParallelOptions options = new() { MaxDegreeOfParallelism = 10, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(FileNamesAndContent, options, async (fileNameAndContent, token) =>
        {
            BlobClient blobClient = containerClient.GetBlobClient(fileNameAndContent.Key);
            BinaryData content = BinaryData.FromString(fileNameAndContent.Value);
            await blobClient.UploadAsync(content, overwrite: true, token);
        });
    }

    internal async Task ThrowIfUnhealthy(BlobContainerClient containerClient, CancellationToken cancellationToken = default)
    {
        try
        {
            Response<bool> exists = await containerClient.ExistsAsync(cancellationToken);
            if (exists.Value is false)
            {
                _logger.LogError("Shared content storage container '{ContainerName}' does not exist. Client: {Client}", containerClient.Name, nameof(BlobContainerClient));
                throw new InvalidOperationException($"Container not found, class: {nameof(AzureSharedContentClient)}");
            }
        }
        catch (Exception ex) when (ex is RequestFailedException or AggregateException)
        {
            _logger.LogError(ex, "Shared content storage check failed in {Class}", nameof(AzureSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    /// <summary>
    /// Combines with forward slash delimiter, no trailing slash.
    /// </summary>
    /// <param name="segments">Segments to join</param>
    internal static string CombineWithDelimiter(params string?[] segments)
    {
        IEnumerable<string?> nonNulls = segments.Where(segment => string.IsNullOrWhiteSpace(segment) is false);
        return string.Join('/', nonNulls.Select(segment => segment?.Trim('/')));
    }

    internal static string JsonFileName(string filename) => $"{filename}.json";

    internal void SetCurrentVersion(List<string> versionPrefixes)
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

            _logger.LogWarning("Could not parse version string to int: {VersionString}, class: {Class}", versionAsString, nameof(AzureSharedContentClient));
        }

        if (versions.Count == 0) { return; }

        int version = versions.Max();
        CurrentVersion = (version + 1).ToString();
    }

    private BlobContainerClient GetContainerClient()
    {
        string storageContainerName = _sharedContentClientSettings.StorageContainerName;
        string storageAccountUrl = _sharedContentClientSettings.StorageAccountUrl;
        BlobServiceClient blobServiceClient = new(new Uri(storageAccountUrl), new DefaultAzureCredential());
        return blobServiceClient.GetBlobContainerClient(storageContainerName);
    }
}
