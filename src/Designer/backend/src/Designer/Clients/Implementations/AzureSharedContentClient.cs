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
using Altinn.Common.AccessToken.Configuration;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class AzureSharedContentClient(HttpClient httpClient, ILogger<AzureSharedContentClient> logger, IOptions<KeyVaultSettings> kvSettings, IOptions<SharedContentClientSettings> sharedContentClientSettings) : ISharedContentClient
{
    private int _currentVersion = int.Parse(InitialVersion);
    private readonly Dictionary<string, string> _fileNamesAndContent = [];
    private readonly string _sharedContentBaseUri = Path.Join(sharedContentClientSettings.Value.StorageAccountUrl, sharedContentClientSettings.Value.StorageContainerName);
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

        // Sanity check
        string rootIndexUri = Path.Join(_sharedContentBaseUri, IndexFileName);
        HttpResponseMessage rootIndexResponse = await httpClient.GetAsync(rootIndexUri, cancellationToken);
        ThrowIfUnhealthyEndpoint(rootIndexResponse);

        using TempFileCreatorHelper tempFileHelper = new();

        await HandleOrganizationIndex(orgName, rootIndexResponse, cancellationToken);
        string organisationDirectory = orgName;

        await HandleResourceTypeIndex(orgName, organisationDirectory, cancellationToken);

        string codeListDirectory = Path.Join(organisationDirectory, CodeListDirectoryName);
        await HandleResourceIndex(orgName, codeListId, codeListDirectory, cancellationToken);

        string versionDirectory = Path.Join(codeListDirectory, codeListId);
        await HandleVersionIndex(orgName, codeListId, versionDirectory, cancellationToken);

        CreateCodeListFile(codeList, versionDirectory);

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
                    await blobClient.UploadAsync(content, cancellationToken);
                }
                finally
                {
                    semaphore.Release();
                }

            }, cancellationToken));
        }

        Task.WaitAll(tasks, cancellationToken);
    }

    private BlobContainerClient GetContainerClient()
    {
        string containerName = sharedContentClientSettings.Value.StorageContainerName;
        string accountUrl = sharedContentClientSettings.Value.StorageAccountUrl;
        ClientSecretCredential credentials = new(kvSettings.Value.TenantId, kvSettings.Value.ClientId, kvSettings.Value.ClientSecret);
        BlobContainerClient containerClient = new BlobServiceClient(new Uri($"{accountUrl}"), credentials).GetBlobContainerClient(containerName);
        return containerClient;
    }

    private void CreateCodeListFile(CodeList codeList, string versionDirectory)
    {
        string codeListFileName = $"{_currentVersion}.json";
        var codeListContents = new SharedCodeList(codeList.Codes, codeList.TagNames);
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);
        string combinedPath = Path.Join(versionDirectory, codeListFileName);
        _fileNamesAndContent[combinedPath] = contentsString;
    }

    private async Task HandleVersionIndex(string orgName, string codeListId, string versionDirectory, CancellationToken cancellationToken)
    {
        string versionIndexUri = Path.Join(_sharedContentBaseUri, orgName, CodeListDirectoryName, codeListId, IndexFileName);
        HttpResponseMessage versionIndexResponse = await httpClient.GetAsync(versionIndexUri, cancellationToken);
        string combinedPath = Path.Join(versionDirectory, IndexFileName);

        if (versionIndexResponse.StatusCode == HttpStatusCode.OK)
        {
            string versionIndexContent = await versionIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<int>? versions = JsonSerializer.Deserialize<List<int>>(versionIndexContent);
            GetCurrentVersion(versions);

            if (versions is not null)
            {
                versions.Add(_currentVersion);
                string contents = JsonSerializer.Serialize(versions);
                _fileNamesAndContent[combinedPath] = contents;
            }
            else
            {
                string contents = JsonSerializer.Serialize<List<string>>([_currentVersion.ToString()]);
                _fileNamesAndContent[combinedPath] = contents;
            }
        }

        if (versionIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([InitialVersion]);
            _fileNamesAndContent[combinedPath] = contents;
        }
    }

    private async Task HandleResourceIndex(string orgName, string codeListId, string codeListDirectory, CancellationToken cancellationToken)
    {
        string codeListIdIndexUri = Path.Join(_sharedContentBaseUri, orgName, CodeListDirectoryName, IndexFileName);
        HttpResponseMessage codeListIdIndexResponse = await httpClient.GetAsync(codeListIdIndexUri, cancellationToken);

        string combinedPath = Path.Join(codeListDirectory, IndexFileName);
        if (codeListIdIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([codeListId]);
            _fileNamesAndContent[combinedPath] = contents;
        }
        else
        {
            string codeListIdIndexContent = await codeListIdIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? codeListIds = JsonSerializer.Deserialize<List<string>>(codeListIdIndexContent);
            if (codeListIds?.Contains(codeListId) is false)
            {
                codeListIds.Add(codeListId);
                string contents = JsonSerializer.Serialize(codeListIds);
                _fileNamesAndContent[combinedPath] = contents;
            }
        }
    }

    private async Task HandleResourceTypeIndex(string orgName, string organisationDirectory, CancellationToken cancellationToken)
    {
        string resourceTypeIndexUri = Path.Join(_sharedContentBaseUri, orgName, IndexFileName);
        HttpResponseMessage resourceTypeIndexResponse = await httpClient.GetAsync(resourceTypeIndexUri, cancellationToken);

        string combinedPath = Path.Join(organisationDirectory, IndexFileName);
        if (resourceTypeIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([CodeListDirectoryName]);
            _fileNamesAndContent[combinedPath] = contents;
        }
        else
        {
            string resourceTypeIndexContent = await resourceTypeIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? resourceTypes = JsonSerializer.Deserialize<List<string>>(resourceTypeIndexContent);
            if (resourceTypes?.Contains(CodeListDirectoryName) is false)
            {
                resourceTypes.Add(CodeListDirectoryName);
                string contents = JsonSerializer.Serialize(resourceTypes);
                _fileNamesAndContent[combinedPath] = contents;
            }
        }
    }

    private async Task HandleOrganizationIndex(string orgName, HttpResponseMessage rootIndexResponse, CancellationToken cancellationToken)
    {
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

    private void ThrowIfUnhealthyEndpoint(HttpResponseMessage rootIndexResponse)
    {
        if (rootIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            logger.LogError($"Shared content storage container not found, class: {nameof(AzureSharedContentClient)}");
            throw new InvalidOperationException("Request failed.");
        }
    }

    private void GetCurrentVersion(List<int>? versions)
    {
        int? latestVersion = versions?.Max();
        if (latestVersion is not null)
        {
            _currentVersion = (int)latestVersion + 1;
        }
    }

    private const string InitialVersion = "1";
    private const string CodeListDirectoryName = "code_lists";
    private const string IndexFileName = "_index.json";
}
