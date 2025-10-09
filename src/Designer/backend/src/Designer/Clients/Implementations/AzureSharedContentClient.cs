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
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Logging;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class AzureSharedContentClient(HttpClient httpClient, ILogger logger) : ISharedContentClient
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly ILogger _logger = logger;

    private int _currentVersion = int.Parse(InitialVersion);

    private Dictionary<string, string> _fileNamesAndContent = [];

    private const string SharedContentBaseUri = "https://<account>.blob.core.windows.net"; // should be a secret!

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        AllowTrailingCommas = true
    };

    public async Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        BlobContainerClient containerClient = GetContainerClient();

        // Sanity check
        string rootIndexUri = Path.Join(SharedContentBaseUri, IndexFileName);
        HttpResponseMessage rootIndexResponse = await _httpClient.GetAsync(rootIndexUri, cancellationToken);
        ThrowIfUnhealthyEndpoint(rootIndexResponse);

        using TempFileCreatorHelper tempFileHelper = new();

        await HandleOrganizationIndex(orgName, rootIndexResponse, tempFileHelper, cancellationToken);
        string organisationDirectory = orgName;

        await HandleResourceTypeIndex(orgName, tempFileHelper, organisationDirectory, cancellationToken);

        string codeListDirectory = Path.Join(organisationDirectory, CodeListDirectoryName);
        await HandleResourceIndex(orgName, codeListId, tempFileHelper, codeListDirectory, cancellationToken);

        string versionDirectory = Path.Join(codeListDirectory, codeListId);
        await HandleVersionIndex(orgName, codeListId, tempFileHelper, versionDirectory, cancellationToken);

        await CreateCodeListFile(codeList, tempFileHelper, versionDirectory);

        List<string> allFiles = tempFileHelper.GetAllFilePaths();



        foreach (var file in allFiles)
        {
            var blobClient = containerClient.GetBlobClient(file);
            // blobClient.UploadAsync()
        }

        // var blobClient = containerClient.GetBlobClient();

        // await service.

        // Upload temp files to storage container
        /*
         * Iterate through all files in LocalTemporaryDirectoryName recursively and create a request to azure for each file.
         */

        /*
         * Use SAS token to get write access, should be stored in the key vault in production.
         */
    }

    private static BlobContainerClient GetContainerClient()
    {
        string? containerName = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONTAINER_NAME");
        string? accountUrl = Environment.GetEnvironmentVariable("AZURE_STORAGE_ACCOUNT_URL");
        string? sasToken = Environment.GetEnvironmentVariable("AZURE_SAS_TOKEN");
        BlobContainerClient containerClient = new BlobServiceClient(new Uri($"{accountUrl}?{sasToken}")).GetBlobContainerClient(containerName);
        return containerClient;
    }

    private async Task CreateCodeListFile(CodeList codeList, TempFileCreatorHelper tempFileHelper, string versionDirectory)
    {
        string codeListFileName = $"{_currentVersion}.json";
        var codeListContents = new SharedCodeList(codeList.Codes, codeList.TagNames);
        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);
        await tempFileHelper.CreateFileOnPath(versionDirectory, codeListFileName, contentsString);
    }

    private async Task HandleVersionIndex(string orgName, string codeListId, TempFileCreatorHelper tempFileHelper, string versionDirectory, CancellationToken cancellationToken)
    {
        string versionIndexUri = Path.Join(SharedContentBaseUri, orgName, CodeListDirectoryName, codeListId, IndexFileName);
        HttpResponseMessage versionIndexResponse = await _httpClient.GetAsync(versionIndexUri, cancellationToken);

        if (versionIndexResponse.StatusCode == HttpStatusCode.OK)
        {
            string versionIndexContent = await versionIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<int>? versions = JsonSerializer.Deserialize<List<int>>(versionIndexContent);
            GetCurrentVersion(versions);

            if (versions is not null)
            {
                versions.Add(_currentVersion);
                string contents = JsonSerializer.Serialize(versions);
                await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
            }
            else
            {
                string contents = JsonSerializer.Serialize<List<string>>([_currentVersion.ToString()]);
                await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
            }
        }

        if (versionIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([InitialVersion]);
            await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
        }
    }

    private async Task HandleResourceIndex(string orgName, string codeListId, TempFileCreatorHelper tempFileHelper, string codeListDirectory, CancellationToken cancellationToken)
    {
        string codeListIdIndexUri = Path.Join(SharedContentBaseUri, orgName, CodeListDirectoryName, IndexFileName);
        HttpResponseMessage codeListIdIndexResponse = await _httpClient.GetAsync(codeListIdIndexUri, cancellationToken);
        if (codeListIdIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([codeListId]);
            await tempFileHelper.CreateFileOnPath(codeListDirectory, IndexFileName, contents);
        }
        else
        {
            string codeListIdIndexContent = await codeListIdIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? codeListIds = JsonSerializer.Deserialize<List<string>>(codeListIdIndexContent);
            if (codeListIds?.Contains(codeListId) is false)
            {
                codeListIds.Add(codeListId);
                string contents = JsonSerializer.Serialize(codeListIds);
                await tempFileHelper.CreateFileOnPath(codeListDirectory, IndexFileName, contents);
            }
        }
    }

    private async Task HandleResourceTypeIndex(string orgName, TempFileCreatorHelper tempFileHelper, string organisationDirectory, CancellationToken cancellationToken)
    {
        string resourceTypeIndexUri = Path.Join(SharedContentBaseUri, orgName, IndexFileName);
        HttpResponseMessage resourceTypeIndexResponse = await _httpClient.GetAsync(resourceTypeIndexUri, cancellationToken);
        if (resourceTypeIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([CodeListDirectoryName]);
            await tempFileHelper.CreateFileOnPath(organisationDirectory, IndexFileName, contents);
        }
        else
        {
            string resourceTypeIndexContent = await resourceTypeIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<string>? resourceTypes = JsonSerializer.Deserialize<List<string>>(resourceTypeIndexContent);
            if (resourceTypes?.Contains(CodeListDirectoryName) is false)
            {
                resourceTypes.Add(CodeListDirectoryName);
                string contents = JsonSerializer.Serialize(resourceTypes);
                await tempFileHelper.CreateFileOnPath(organisationDirectory, IndexFileName, contents);
            }
        }
    }

    private static async Task HandleOrganizationIndex(string orgName, HttpResponseMessage rootIndexResponse, TempFileCreatorHelper tempFileHelper, CancellationToken cancellationToken)
    {
        string rootIndexContent = await rootIndexResponse.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrEmpty(rootIndexContent))
        {
            await UpdateOrganizationIndexFile(tempFileHelper, [orgName]);
        }
        else
        {
            List<string>? organizations = JsonSerializer.Deserialize<List<string>>(rootIndexContent);
            if (organizations?.Contains(orgName) is false)
            {
                organizations.Add(orgName);
                await UpdateOrganizationIndexFile(tempFileHelper, organizations);
            }
        }
    }

    private void ThrowIfUnhealthyEndpoint(HttpResponseMessage rootIndexResponse)
    {
        if (rootIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogError($"Shared content storage container not found, class: {nameof(AzureSharedContentClient)}");
            throw new InvalidOperationException("Request failed.");
        }
    }

    private static async Task UpdateOrganizationIndexFile(TempFileCreatorHelper tempFileHelper, List<string> organizations)
    {
        string fileContents = JsonSerializer.Serialize(organizations, s_jsonOptions);
        await tempFileHelper.CreateFileOnPath("", IndexFileName, fileContents);
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
