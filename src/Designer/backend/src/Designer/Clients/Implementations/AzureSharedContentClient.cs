#nullable enable
using System;
using System.Collections.Generic;
using System.Configuration;
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

public class AzureSharedContentClient(
    HttpClient httpClient,
    ILogger<AzureSharedContentClient> logger,
    SharedContentClientSettings sharedContentClientSettings
) : ISharedContentClient
{
    private const string InitialVersion = "1";
    private const string CodeList = "code_lists";
    private const string IndexFileName = "_index.json";
    private const string LatestCodeListFileName = "_latest.json";

    internal string CurrentVersion = InitialVersion;
    internal readonly Dictionary<string, string> FileNamesAndContent = [];

    private readonly string _sharedContentBaseUri = CombineWithDelimiter(
        sharedContentClientSettings.StorageAccountUrl, sharedContentClientSettings.StorageContainerName);

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        AllowTrailingCommas = true
    };

    public async Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_sharedContentBaseUri))
        {
            throw new ConfigurationErrorsException("Base url for the content library must be set before publishing.");
        }

        BlobContainerClient containerClient = GetContainerClient();
        await ThrowIfUnhealthy(containerClient, cancellationToken);

        string resourceTypeIndexPrefix = orgName;
        string resourceIndexPrefix = CombineWithDelimiter(orgName, CodeList);
        string versionIndexPrefix = CombineWithDelimiter(orgName, CodeList, codeListId);

        await HandleOrganizationIndex(orgName, cancellationToken);
        await HandleResourceTypeIndex(resourceTypeIndexPrefix, CodeList, cancellationToken);
        await HandleResourceIndex(resourceIndexPrefix, codeListId, cancellationToken);
        await HandleVersionIndex(versionIndexPrefix, cancellationToken);

        string codeListFolderPath = CombineWithDelimiter(orgName, CodeList, codeListId);
        CreateCodeListFiles(codeList, codeListFolderPath, versionIndexPrefix);

        await UploadBlobs(containerClient, cancellationToken);
    }

    internal async Task HandleOrganizationIndex(string orgName, CancellationToken cancellationToken = default)
    {
        string url = CombineWithDelimiter(_sharedContentBaseUri, IndexFileName);
        string path = IndexFileName; // No prefix since it's on root.
        HttpResponseMessage response = await httpClient.GetAsync(new Uri(url), cancellationToken);

        await HandleResponse(response, orgName, path, cancellationToken);
    }

    internal async Task HandleResourceTypeIndex(string resourceTypeIndexPrefix, string resourceType, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(resourceTypeIndexPrefix, IndexFileName);
        string url = CombineWithDelimiter(_sharedContentBaseUri, path);
        HttpResponseMessage response = await httpClient.GetAsync(new Uri(url), cancellationToken);

        string content = CombineWithDelimiter(resourceTypeIndexPrefix, resourceType);
        await HandleResponse(response, content, path, cancellationToken);
    }

    internal async Task HandleResourceIndex(string resourceIndexPrefix, string resourceId, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(resourceIndexPrefix, IndexFileName);
        string url = CombineWithDelimiter(_sharedContentBaseUri, path);
        HttpResponseMessage response = await httpClient.GetAsync(new Uri(url), cancellationToken);

        string content = CombineWithDelimiter(resourceIndexPrefix, resourceId);
        await HandleResponse(response, content, path, cancellationToken);
    }

    internal async Task HandleVersionIndex(string versionIndexPrefix, CancellationToken cancellationToken = default)
    {
        string path = CombineWithDelimiter(versionIndexPrefix, IndexFileName);
        string uri = CombineWithDelimiter(_sharedContentBaseUri, path);
        HttpResponseMessage response = await httpClient.GetAsync(new Uri(uri), cancellationToken);

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
                logger.LogError($"Unexpected response code: {response.StatusCode}, class: ${nameof(AzureSharedContentClient)}");
                throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    private async Task HandleResponse(HttpResponseMessage response, string content, string path, CancellationToken cancellationToken = default)
    {
        switch (response.StatusCode)
        {
            case HttpStatusCode.OK:
                await HandleIndexSuccess(response, content, path, cancellationToken);
                break;
            case HttpStatusCode.NotFound:
                AddIndexFile(path, [content]);
                break;
            default:
                logger.LogError($"Unexpected response code: {response.StatusCode}, class: ${nameof(AzureSharedContentClient)}");
                throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    private async Task HandleIndexSuccess(
        HttpResponseMessage response,
        string content,
        string indexFilePath,
        CancellationToken cancellationToken = default
    )
    {
        string indexFileString = await response.Content.ReadAsStringAsync(cancellationToken);
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
        var options = new ParallelOptions { MaxDegreeOfParallelism = 10, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(FileNamesAndContent, options, async (fileNameAndContent, token) =>
        {
            BlobClient blobClient = containerClient.GetBlobClient(fileNameAndContent.Key);
            BinaryData content = BinaryData.FromString(fileNameAndContent.Value);
            await blobClient.UploadAsync(content, overwrite: true, token);
        });
    }

    internal async Task ThrowIfUnhealthy(BlobContainerClient client, CancellationToken cancellationToken = default)
    {
        try
        {
            Response<bool> exists = await client.ExistsAsync(cancellationToken);
            if (exists.Value is false)
            {
                logger.LogError("Shared content storage container does not exist. Client: {Client}", nameof(BlobContainerClient));
                throw new InvalidOperationException($"Container not found, class: {nameof(AzureSharedContentClient)}");
            }
        }
        catch (Exception ex) when (ex is RequestFailedException or AggregateException)
        {
            logger.LogError(ex, "Shared content storage check failed in {Class}", nameof(AzureSharedContentClient));
            throw new InvalidOperationException($"Request failed, class: {nameof(AzureSharedContentClient)}");
        }
    }

    /// <summary>
    /// Combines with forward slash delimiter, no trailing slash.
    /// </summary>
    /// <param name="segments">Segments to join</param>
    internal static string CombineWithDelimiter(params string?[] segments)
    {
        IEnumerable<string?> nonNulls = segments.Where(segment => segment is not null);
        return string.Join('/', nonNulls.Select(segment => segment?.Trim('/')));
    }

    internal static string JsonFileName(string filename) => $"{filename}.json";

    internal void SetCurrentVersion(List<string> versionPrefixes)
    {
        IEnumerable<string?> versionsAsString = versionPrefixes.Select(Path.GetFileNameWithoutExtension);
        List<int> versions = [];

        foreach (string? versionAsString in versionsAsString)
        {
            if (versionAsString is not null)
            {
                versions.Add(int.Parse(versionAsString));
            }
        }

        if (versions.Count == 0) { return; }

        int version = versions.Max();
        CurrentVersion = (version + 1).ToString();
    }

    private BlobContainerClient GetContainerClient()
    {
        string storageContainerName = sharedContentClientSettings.StorageContainerName;
        string storageAccountUrl = sharedContentClientSettings.StorageAccountUrl;
        BlobServiceClient blobServiceClient = new(new Uri(storageAccountUrl), new DefaultAzureCredential());
        return blobServiceClient.GetBlobContainerClient(storageContainerName);
    }
}
