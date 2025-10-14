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
using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using JsonSerializer = System.Text.Json.JsonSerializer;

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

    private string _currentVersion = InitialVersion;
    private readonly Dictionary<string, string> _fileNamesAndContent = [];
    private readonly string _sharedContentBaseUri = Path.Join(
        sharedContentClientSettings.Value.StorageAccountUrl, sharedContentClientSettings.Value.StorageContainerName);

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        AllowTrailingCommas = true
    };

    public async Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        if (_sharedContentBaseUri is null)
        {
            throw new ConfigurationErrorsException("Base url for the content library must be set before publishing.");
        }

        BlobContainerClient containerClient = GetContainerClient();
        string resourceTypeIndexPath = Path.Join(orgName, IndexFileName);
        string resourceIndexPath = Path.Join(orgName, CodeList, IndexFileName);
        string versionIndexPath = Path.Join(orgName, CodeList, codeListId, IndexFileName);

        await HandleOrganizationIndex(orgName, cancellationToken);
        await HandleResourceTypeIndex(resourceTypeIndexPath, CodeList, cancellationToken);
        await HandleResourceIndex(resourceIndexPath, codeListId, cancellationToken);
        await HandleVersionIndex(versionIndexPath, cancellationToken);

        string codeListFolderPath = Path.Join(orgName, CodeList, codeListId);
        CreateCodeListFile(codeList, codeListFolderPath);

        List<Task> tasks = PrepareBlobTasks(containerClient, cancellationToken);
        Task.WaitAll(tasks, cancellationToken);
    }

    private async Task HandleOrganizationIndex(string orgName, CancellationToken cancellationToken)
    {
        string rootIndexUri = Path.Join(_sharedContentBaseUri, IndexFileName);
        HttpResponseMessage rootIndexResponse = await httpClient.GetAsync(rootIndexUri, cancellationToken);
        ThrowIfUnhealthyEndpoint(rootIndexResponse);

        string rootIndexContent = await rootIndexResponse.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrEmpty(rootIndexContent))
        {
            string contents = JsonSerializer.Serialize<List<string>>([orgName], s_jsonOptions);
            _fileNamesAndContent[IndexFileName] = contents;
        }
        else
        {
            List<string>? organizations = JsonSerializer.Deserialize<List<string>>(rootIndexContent);
            if (organizations?.Contains(orgName) is false)
            {
                organizations.Add(orgName);
                string contents = JsonSerializer.Serialize(organizations, s_jsonOptions);
                _fileNamesAndContent[IndexFileName] = contents;
            }
        }
    }

    private async Task HandleResourceTypeIndex(string resourceTypeIndexPath, string resourceType, CancellationToken cancellationToken)
    {
        string resourceTypeIndexUri = Path.Join(_sharedContentBaseUri, resourceTypeIndexPath);
        HttpResponseMessage resourceTypeIndexResponse = await httpClient.GetAsync(resourceTypeIndexUri, cancellationToken);

        if (resourceTypeIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([resourceType]);
            _fileNamesAndContent[resourceTypeIndexPath] = contents;
        }
        else
        {
            string resourceTypeIndexContent = await resourceTypeIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? resourceTypes = JsonSerializer.Deserialize<List<string>>(resourceTypeIndexContent);
            if (resourceTypes?.Contains(resourceType) is false)
            {
                resourceTypes.Add(resourceType);
                string contents = JsonSerializer.Serialize(resourceTypes);
                _fileNamesAndContent[resourceTypeIndexPath] = contents;
            }
        }
    }

    private async Task HandleResourceIndex(string resourceIndexPath, string resourceId, CancellationToken cancellationToken)
    {
        string codeListIdIndexUri = Path.Join(_sharedContentBaseUri, resourceIndexPath);
        HttpResponseMessage codeListIdIndexResponse = await httpClient.GetAsync(codeListIdIndexUri, cancellationToken);

        if (codeListIdIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([resourceId]);
            _fileNamesAndContent[resourceIndexPath] = contents;
        }
        else
        {
            string codeListIdIndexContent = await codeListIdIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? codeListIds = JsonSerializer.Deserialize<List<string>>(codeListIdIndexContent);
            if (codeListIds?.Contains(resourceId) is false)
            {
                codeListIds.Add(resourceId);
                string contents = JsonSerializer.Serialize(codeListIds);
                _fileNamesAndContent[resourceIndexPath] = contents;
            }
        }
    }

    private async Task HandleVersionIndex(string versionIndexPath, CancellationToken cancellationToken)
    {
        string versionIndexUri = Path.Join(_sharedContentBaseUri, versionIndexPath);
        HttpResponseMessage versionIndexResponse = await httpClient.GetAsync(versionIndexUri, cancellationToken);

        if (versionIndexResponse.StatusCode == HttpStatusCode.OK)
        {
            string versionIndexContent = await versionIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? versions = JsonSerializer.Deserialize<List<string>>(versionIndexContent);

            SetCurrentVersion(versions);

            if (versions is not null)
            {
                versions.Add(_currentVersion);
                string contents = JsonSerializer.Serialize(versions);
                _fileNamesAndContent[versionIndexPath] = contents;
            }
            else
            {
                string contents = JsonSerializer.Serialize<List<string>>([InitialVersion]);
                _fileNamesAndContent[versionIndexPath] = contents;
            }
        }

        if (versionIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([InitialVersion]);
            _fileNamesAndContent[versionIndexPath] = contents;
        }
    }

    private void CreateCodeListFile(CodeList codeList, string codeListFolderPath)
    {
        string codeListFileName = $"{_currentVersion}.json";
        var codeListContents = new SharedCodeList(codeList.Codes, codeList.TagNames);
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);
        string codeListFilePath = Path.Join(codeListFolderPath, codeListFileName);
        _fileNamesAndContent[codeListFilePath] = contentsString;
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

    private void SetCurrentVersion(List<string>? versionsAsString)
    {
        List<int>? versions = versionsAsString?.Select(int.Parse).ToList();
        int? latestVersion = versions?.Max();
        if (latestVersion is not null)
        {
            int version = (int)latestVersion;
            _currentVersion = (version + 1).ToString();
        }
    }

    private BlobContainerClient GetContainerClient()
    {
        string storageContainerName = sharedContentClientSettings.Value.StorageContainerName;
        string storageAccountUrl = sharedContentClientSettings.Value.StorageAccountUrl;
        BlobServiceClient blobServiceClient = new(new Uri(storageAccountUrl), new DefaultAzureCredential());
        return blobServiceClient.GetBlobContainerClient(storageContainerName);
    }
}
