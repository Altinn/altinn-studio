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
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class AzureSharedContentClient(
    HttpClient httpClient,
    ILogger<AzureSharedContentClient> logger,
    IOptions<SharedContentClientSettings> sharedContentClientSettings
) : ISharedContentClient
{
    private const string InitialVersion = "1";
    private const string CodeList = "code_lists";
    private const string IndexFileName = "_index.json";
    private const string LatestCodeListFileName = "_latest.json";

    private string _currentVersion = InitialVersion;
    private readonly Dictionary<string, string> _fileNamesAndContent = [];
    private readonly string _sharedContentBaseUri = CombineWithDelimiter(
        sharedContentClientSettings.Value.StorageAccountUrl, sharedContentClientSettings.Value.StorageContainerName);

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
        if (_sharedContentBaseUri is null)
        {
            throw new ConfigurationErrorsException("Base url for the content library must be set before publishing.");
        }

        string resourceTypeIndexPrefix = orgName;
        string resourceIndexPrefix = CombineWithDelimiter(orgName, CodeList);
        string versionIndexPrefix = CombineWithDelimiter(orgName, CodeList, codeListId);

        await HandleOrganizationIndex(orgName, cancellationToken);
        await HandleResourceTypeIndex(resourceTypeIndexPrefix, CodeList, cancellationToken);
        await HandleResourceIndex(resourceIndexPrefix, codeListId, cancellationToken);
        await HandleVersionIndex(versionIndexPrefix, cancellationToken);

        string codeListFolderPath = CombineWithDelimiter(orgName, CodeList, codeListId);
        CreateCodeListFiles(codeList, codeListFolderPath, versionIndexPrefix);

        BlobContainerClient containerClient = GetContainerClient();
        List<Task> tasks = PrepareBlobTasks(containerClient, cancellationToken);
        Task.WaitAll(tasks, cancellationToken);
    }

    private async Task HandleOrganizationIndex(string orgName, CancellationToken cancellationToken)
    {
        string rootIndexPath = CombineWithDelimiter(_sharedContentBaseUri, IndexFileName);
        HttpResponseMessage rootIndexResponse = await httpClient.GetAsync(new Uri(rootIndexPath), cancellationToken);
        ThrowIfUnhealthyEndpoint(rootIndexResponse);

        string rootIndexContent = await rootIndexResponse.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrEmpty(rootIndexContent))
        {
            AddIndexFile(rootIndexPath, [orgName]);
        }
        else
        {
            IndexFile? organizationsIndex = JsonSerializer.Deserialize<IndexFile>(rootIndexContent, s_jsonOptions);
            List<string>? organizations = organizationsIndex?.Prefixes;
            if (organizations?.Contains(orgName) is false)
            {
                organizations.Add(orgName);
                AddIndexFile(rootIndexPath, organizations);
            }
        }
    }

    private async Task HandleResourceTypeIndex(string resourceTypeIndexPrefix, string resourceType, CancellationToken cancellationToken)
    {
        string resourceTypeIndexPath = CombineWithDelimiter(resourceTypeIndexPrefix, IndexFileName);
        string resourceTypeIndexUri = CombineWithDelimiter(_sharedContentBaseUri, resourceTypeIndexPath);
        HttpResponseMessage resourceTypeIndexResponse = await httpClient.GetAsync(new Uri(resourceTypeIndexUri), cancellationToken);

        string resourceTypeWithPrefix = CombineWithDelimiter(resourceTypeIndexPrefix, resourceType);

        if (resourceTypeIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            AddIndexFile(resourceTypeIndexPath, [resourceTypeWithPrefix]);
        }
        else
        {
            string resourceTypeIndexContent = await resourceTypeIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            IndexFile? resourceTypesIndex = JsonSerializer.Deserialize<IndexFile>(resourceTypeIndexContent, s_jsonOptions);
            List<string>? resourceTypes = resourceTypesIndex?.Prefixes;
            if (resourceTypes?.Contains(resourceTypeWithPrefix) is false)
            {
                resourceTypes.Add(resourceTypeWithPrefix);
                AddIndexFile(resourceTypeIndexPath, resourceTypes);
            }
        }
    }

    private async Task HandleResourceIndex(string resourceIndexPrefix, string resourceId, CancellationToken cancellationToken)
    {
        string resourceIndexPath = CombineWithDelimiter(resourceIndexPrefix, IndexFileName);
        string codeListIdIndexUri = CombineWithDelimiter(_sharedContentBaseUri, resourceIndexPath);
        HttpResponseMessage codeListIdIndexResponse = await httpClient.GetAsync(new Uri(codeListIdIndexUri), cancellationToken);

        string resourceIdWithPrefix = CombineWithDelimiter(resourceIndexPrefix, resourceId);

        if (codeListIdIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            AddIndexFile(resourceIndexPath, [resourceIdWithPrefix]);
        }
        else
        {
            string codeListIdIndexContent = await codeListIdIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            IndexFile? resourceTypesIndex = JsonSerializer.Deserialize<IndexFile>(codeListIdIndexContent, s_jsonOptions);
            List<string>? codeListIds = resourceTypesIndex?.Prefixes;
            if (codeListIds?.Contains(resourceIdWithPrefix) is false)
            {
                codeListIds.Add(resourceIdWithPrefix);
                AddIndexFile(resourceIndexPath, codeListIds);
            }
        }
    }

    private async Task HandleVersionIndex(string versionIndexPrefix, CancellationToken cancellationToken)
    {
        string versionIndexPath = CombineWithDelimiter(versionIndexPrefix, IndexFileName);
        string versionIndexUri = CombineWithDelimiter(_sharedContentBaseUri, versionIndexPath);
        HttpResponseMessage versionIndexResponse = await httpClient.GetAsync(new Uri(versionIndexUri), cancellationToken);

        string initialVersionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(InitialVersion));

        if (versionIndexResponse.StatusCode == HttpStatusCode.OK)
        {
            string versionIndexContent = await versionIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            IndexFile? versionsIndex = JsonSerializer.Deserialize<IndexFile>(versionIndexContent, s_jsonOptions);
            List<string>? versions = versionsIndex?.Prefixes;

            SetCurrentVersion(versions);

            if (versions is not null)
            {
                string versionWithPrefix = CombineWithDelimiter(versionIndexPrefix, JsonFileName(_currentVersion));
                versions.Add(versionWithPrefix);
                AddIndexFile(versionIndexPath, versions);
            }
            else
            {
                AddIndexFile(versionIndexPath, [initialVersionWithPrefix]);
            }
        }

        if (versionIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            AddIndexFile(versionIndexPath, [initialVersionWithPrefix]);
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
        var codeListContents = new SharedCodeList(
            Codes: codeList.Codes,
            Version: version,
            Source: codeList.Source,
            TagNames: codeList.TagNames
        );
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);

        string codeListFileName = JsonFileName(_currentVersion);
        string codeListFilePath = CombineWithDelimiter(codeListFolderPath, codeListFileName);
        _fileNamesAndContent[codeListFilePath] = contentsString;

        string lastestCodeListFilePath = CombineWithDelimiter(codeListFolderPath, LatestCodeListFileName);
        _fileNamesAndContent[lastestCodeListFilePath] = contentsString;
    }

    private List<Task> PrepareBlobTasks(BlobContainerClient containerClient, CancellationToken cancellationToken = default)
    {
        SemaphoreSlim semaphore = new(10); // We allocate 10 simultaneous tasks as max, even though current total is lower
        List<Task> tasks = [];

        foreach (KeyValuePair<string, string> fileNameAndContent in _fileNamesAndContent)
        {
            BlobClient blobClient = containerClient.GetBlobClient(fileNameAndContent.Key);
            var content = BinaryData.FromString(fileNameAndContent.Value);
            tasks.Add(Task.Run(async () =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    await blobClient.UploadAsync(content, overwrite: true, cancellationToken);
                }
                finally
                {
                    semaphore.Release();
                }

            }, cancellationToken));
        }

        return tasks;
    }

    private void ThrowIfUnhealthyEndpoint(HttpResponseMessage rootIndexResponse)
    {
        if (rootIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            logger.LogError($"Shared content storage container not found, class: {nameof(AzureSharedContentClient)}");
            throw new InvalidOperationException("Request failed.");
        }
    }

    /// <summary>
    /// Combines with forward slash delimiter, no trailing slash.
    /// </summary>
    /// <param name="segments">Segments to join</param>
    private static string CombineWithDelimiter(params string[] segments)
    {
        return string.Join("/", segments.Select(segment => segment.Trim('/')));
    }

    private static string JsonFileName(string filename) => $"{filename}.json";

    private void SetCurrentVersion(List<string>? input)
    {
        if (input is null)
        {
            return;
        }
        IEnumerable<string?> versionsAsString = input.Select(Path.GetFileNameWithoutExtension);
        List<int> versions = [];

        foreach (string? versionAsString in versionsAsString)
        {
            if (versionAsString is not null)
            {
                versions.Add(int.Parse(versionAsString));
            }
        }

        int version = versions.Max();
        _currentVersion = (version + 1).ToString();
    }

    private BlobContainerClient GetContainerClient()
    {
        string storageContainerName = sharedContentClientSettings.Value.StorageContainerName;
        string storageAccountUrl = sharedContentClientSettings.Value.StorageAccountUrl;
        BlobServiceClient blobServiceClient = new(new Uri(storageAccountUrl), new DefaultAzureCredential());
        return blobServiceClient.GetBlobContainerClient(storageContainerName);
    }
}
