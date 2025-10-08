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
using Microsoft.Extensions.Logging;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.Studio.Designer.Clients.Implementations;

public class AzureSharedContentClient: ISharedContentClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;

    private const string SharedContentBaseUri = "https://<account>.blob.core.windows.net"; // should be a secret!

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        AllowTrailingCommas = true
    };

    public AzureSharedContentClient(HttpClient httpClient, ILogger logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    // /{org-shortName}/{resourceType}/{resourceId}/{version}.json

    public async Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default)
    {
        // Sanity check
        string rootIndexUri = Path.Join(SharedContentBaseUri, IndexFileName);
        HttpResponseMessage rootIndexResponse = await _httpClient.GetAsync(rootIndexUri, cancellationToken);
        if (rootIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogError($"Shared content storage container not found, class: {nameof(AzureSharedContentClient)}");
            throw new InvalidOperationException("Request failed.");
        }

        using TempFileCreatorHelper tempFileHelper = new();

        // Organisation
        string rootIndexContent = await rootIndexResponse.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrEmpty(rootIndexContent))
        {
            await UpdateOrganizationIndexFile(tempFileHelper, [orgName]);
        }
        else
        {
            List<string>? organizations = JsonSerializer.Deserialize<List<string>>(rootIndexContent);
            if (organizations?.Any(org => org == orgName) is false)
            {
                organizations.Add(orgName);
                await UpdateOrganizationIndexFile(tempFileHelper, organizations);
            }
        }

        // ResourceType
        string organisationDirectory = Path.Join(LocalTemporaryDirectoryName, orgName);
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
            if (resourceTypes?.Any(resourceType => resourceType == CodeListDirectoryName) is false)
            {
                resourceTypes.Add(CodeListDirectoryName);
                string contents = JsonSerializer.Serialize(resourceTypes);
                await tempFileHelper.CreateFileOnPath(organisationDirectory, IndexFileName, contents);
            }
        }

        // ResourceId
        string codeListDirectory = Path.Join(organisationDirectory, CodeListDirectoryName);
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
            if (codeListIds?.Any(id => id == codeListId) is false)
            {
                codeListIds.Add(codeListId);
                string contents = JsonSerializer.Serialize(codeListIds);
                await tempFileHelper.CreateFileOnPath(codeListDirectory, IndexFileName, contents);
            }
        }

        // Version
        int version = int.Parse(InitialVersion);
        string versionDirectory = Path.Join(codeListDirectory, codeListId);
        string versionIndexUri = Path.Join(SharedContentBaseUri, orgName, CodeListDirectoryName, codeListId, IndexFileName);
        HttpResponseMessage versionIndexResponse = await _httpClient.GetAsync(versionIndexUri, cancellationToken);
        if (versionIndexResponse.StatusCode == HttpStatusCode.NotFound)
        {
            string contents = JsonSerializer.Serialize<List<string>>([InitialVersion]);
            await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
        }
        else
        {
            string versionIndexContent = await versionIndexResponse.Content.ReadAsStringAsync(cancellationToken);
            List<int>? versions = JsonSerializer.Deserialize<List<int>>(versionIndexContent);
            int? latestVersion = versions?.Max();
            if (latestVersion is not null)
            {
                version = (int)latestVersion + 1;
            }

            if (versions is null)
            {
                string contents = JsonSerializer.Serialize<List<string>>([version.ToString()]);
                await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
            }
            else
            {
                versions.Add(version);
                string contents = JsonSerializer.Serialize(versions);
                await tempFileHelper.CreateFileOnPath(versionDirectory, IndexFileName, contents);
            }
        }

        // CodeList
        string codeListFileName = $"{version}.json";
        var codeListContents = codeList.TagNames is not null
            ? new { codeList.Codes, TagNames = (List<string>?)codeList.TagNames }
            : new { codeList.Codes, TagNames = (List<string>?)null};

        string contentsString = JsonSerializer.Serialize(codeListContents, s_jsonOptions);
        await tempFileHelper.CreateFileOnPath(versionDirectory, codeListFileName, contentsString);


        // Upload temp files to storage container
        /*
         * Iterate through all files in LocalTemporaryDirectoryName recursively and create a request to azure for each file.
         */

        /*
         * Use SAS token to get write access, should be stored in the key vault in production.
         */
    }


    private static async Task UpdateOrganizationIndexFile(TempFileCreatorHelper tempFileHelper, List<string> organizations)
    {
        string fileContents = JsonSerializer.Serialize(organizations, s_jsonOptions);
        await tempFileHelper.CreateFileOnPath(LocalTemporaryDirectoryName, IndexFileName, fileContents);
    }

    private static string LocalTemporaryDirectoryName => Path.Join(Directory.GetCurrentDirectory(), "temp"); // TODO Move to TempFileCreatorHelper and generate GUID to make sure users have their own temp files.
    private const string InitialVersion = "1";
    private const string CodeListDirectoryName = "code_lists";
    private const string IndexFileName = "_index.json";
}
