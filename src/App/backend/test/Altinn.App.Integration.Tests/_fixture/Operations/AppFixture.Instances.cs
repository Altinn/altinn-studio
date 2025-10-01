using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Integration.Tests.AppFixture;

namespace Altinn.App.Integration.Tests;

public partial class AppFixture : IAsyncDisposable
{
    private InstancesOperations? _instances;
    internal InstancesOperations Instances
    {
        get
        {
            _instances ??= new InstancesOperations(this);
            return _instances;
        }
    }

    internal sealed class InstancesOperations(AppFixture fixture)
    {
        private readonly AppFixture _fixture = fixture;

        public async Task<ApiResponse> PostSimplified(string token, InstansiationInstance instansiation)
        {
            var client = _fixture.GetAppClient();
            var endpoint = $"/ttd/{_fixture._app}/instances/create";
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var payload = JsonSerializer.Serialize(instansiation, _jsonSerializerOptions);
            request.Content = new StringContent(payload, new MediaTypeHeaderValue("application/json"));
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> Get(string token, ReadApiResponse<Instance> instanceData)
        {
            var client = _fixture.GetAppClient();
            if (instanceData.Data.Model is null)
                throw new InvalidOperationException("Instance data model is null");
            var instance = instanceData.Data.Model;
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            var endpoint = $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}";
            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<InstanceDownload> Download(string token, ReadApiResponse<Instance> instanceData)
        {
            var instance = instanceData.Data.Model;
            var data = new List<InstanceDataDownload>(instance?.Data.Count ?? 0);
            if (instance is null)
                return new InstanceDownload(instanceData, data);

            var client = _fixture.GetAppClient();
            using var instanceResponse = await Get(token, instanceData);
            using var readInstance = await instanceResponse.Read<Instance>();
            instance = readInstance.Data.Model;
            if (instance is null)
                throw new InvalidOperationException("Reloaded instance data model is null");
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);

            // Get application metadata to determine data types
            var appMetadataResponse = await _fixture.ApplicationMetadata.Get();
            var appMetadataResult = await appMetadataResponse.Read<Application>();
            if (appMetadataResult.Data.Model is null)
                throw new InvalidOperationException("Failed to retrieve application metadata");
            var applicationMetadata = appMetadataResult.Data.Model;

            for (int i = 0; i < instance.Data.Count; i++)
            {
                var dataElement = instance.Data[i];
                var dataGuid = Guid.Parse(dataElement.Id);
                var endpoint = $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}";

                // Find the data type configuration
                var dataType = applicationMetadata.DataTypes.Find(dt => dt.Id == dataElement.DataType);
                if (dataType == null)
                    throw new InvalidOperationException(
                        $"Data type '{dataElement.DataType}' not found in application metadata"
                    );

                using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                if (dataType.AppLogic?.ClassRef is not null)
                    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                else
                    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/octet-stream"));

                var response = await client.SendAsync(request);

                try
                {
                    // Check if it's form data (has AppLogic.ClassRef) or binary data
                    if (dataType.AppLogic?.ClassRef is not null)
                    {
                        var dataResponse = new ApiResponse(_fixture, response);
                        var readResponse = await dataResponse.Read<Argon.JToken>(); // Argon is being used by VerifyTests for JSON
                        var formData = new InstanceDataDownload.Form(i, dataGuid, dataType.Id, readResponse);
                        data.Add(formData);
                    }
                    else
                    {
                        // This is binary data (attachment)
                        var dataResponse = new ApiResponse(_fixture, response);
                        var readResponse = await dataResponse.Read<byte[]>();
                        var binaryData = new InstanceDataDownload.Binary(i, dataGuid, dataType.Id, readResponse);
                        data.Add(binaryData);
                    }
                }
                catch (Exception)
                {
                    response.Dispose();
                    throw;
                }
            }

            return new InstanceDownload(readInstance, data);
        }

        public async Task<ApiResponse> PatchFormData(
            string token,
            ReadApiResponse<Instance> instanceData,
            DataPatchRequestMultiple dataPatchRequestMultiple,
            string? language = null
        )
        {
            var client = _fixture.GetAppClient();
            if (instanceData.Data.Model is null)
                throw new InvalidOperationException("Instance data model is null");
            var instance = instanceData.Data.Model;
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            var endpoint = $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data";
            if (language is not null)
                endpoint += $"?language={language}";
            using var request = new HttpRequestMessage(HttpMethod.Patch, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var payload = JsonSerializer.Serialize(dataPatchRequestMultiple, _jsonSerializerOptions);
            request.Content = new StringContent(payload, new MediaTypeHeaderValue("application/json"));
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> ValidateInstance(
            string token,
            ReadApiResponse<Instance> instanceData,
            string? ignoredValidators = null,
            bool? onlyIncrementalValidators = null,
            string? language = null
        )
        {
            var client = _fixture.GetAppClient();
            if (instanceData.Data.Model is null)
                throw new InvalidOperationException("Instance data model is null");
            var instance = instanceData.Data.Model;
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            var endpoint = $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/validate";

            var queryParams = new List<string>();
            if (ignoredValidators is not null)
                queryParams.Add($"ignoredValidators={Uri.EscapeDataString(ignoredValidators)}");
            if (onlyIncrementalValidators is not null)
                queryParams.Add(
                    $"onlyIncrementalValidators={onlyIncrementalValidators.Value.ToString().ToLowerInvariant()}"
                );
            if (language is not null)
                queryParams.Add($"language={Uri.EscapeDataString(language)}");

            if (queryParams.Count > 0)
                endpoint += "?" + string.Join("&", queryParams);

            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> Post(string token, Instance instanceTemplate)
        {
            var client = _fixture.GetAppClient();
            var endpoint = $"/ttd/{_fixture._app}/instances";
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var payload = JsonSerializer.Serialize(instanceTemplate, _jsonSerializerOptions);
            request.Content = new StringContent(payload, new MediaTypeHeaderValue("application/json"));
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> PostMultipart(
            string token,
            Instance? instanceTemplate = null,
            Dictionary<string, (string content, string contentType)>? dataParts = null
        )
        {
            var client = _fixture.GetAppClient();
            var endpoint = $"/ttd/{_fixture._app}/instances";
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var multipartContent = new MultipartFormDataContent();

            // Add instance template part if provided
            if (instanceTemplate is not null)
            {
                var instanceJson = JsonSerializer.Serialize(instanceTemplate, _jsonSerializerOptions);
                multipartContent.Add(new StringContent(instanceJson, Encoding.UTF8, "application/json"), "instance");
            }

            // Add data parts if provided
            if (dataParts is not null)
            {
                foreach (var (partName, (content, contentType)) in dataParts)
                {
                    multipartContent.Add(new StringContent(content, Encoding.UTF8, contentType), partName);
                }
            }

            request.Content = multipartContent;
            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> ProcessNext(
            string token,
            ReadApiResponse<Instance> instanceData,
            ProcessNext? processNext = null,
            string? elementId = null,
            string? language = null
        )
        {
            var client = _fixture.GetAppClient();
            if (instanceData.Data.Model is null)
                throw new InvalidOperationException("Instance data model is null");
            var instance = instanceData.Data.Model;
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            var endpoint = $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next";

            var queryParams = new List<string>();
            if (elementId is not null)
                queryParams.Add($"elementId={Uri.EscapeDataString(elementId)}");
            if (language is not null)
                queryParams.Add($"language={Uri.EscapeDataString(language)}");

            if (queryParams.Count > 0)
                endpoint += "?" + string.Join("&", queryParams);

            using var request = new HttpRequestMessage(HttpMethod.Put, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            if (processNext is not null)
            {
                var payload = JsonSerializer.Serialize(processNext, _jsonSerializerOptions);
                request.Content = new StringContent(payload, new MediaTypeHeaderValue("application/json"));
            }

            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }

        public async Task<ApiResponse> PostData(
            string token,
            ReadApiResponse<Instance> instanceData,
            string dataType,
            byte[] data,
            string contentType,
            string filename,
            bool useNewEndpoint = false
        )
        {
            var client = _fixture.GetAppClient();
            if (instanceData.Data.Model is null)
                throw new InvalidOperationException("Instance data model is null");
            var instance = instanceData.Data.Model;
            var instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);

            var endpoint = useNewEndpoint
                ? $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/type/{dataType}"
                : $"/ttd/{_fixture._app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data?dataType={dataType}";

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Content = new ByteArrayContent(data);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            request.Content.Headers.TryAddWithoutValidation("Content-Disposition", $"attachment; filename={filename}");

            var response = await client.SendAsync(request);
            return new ApiResponse(_fixture, response);
        }
    }
}

internal sealed record InstanceDownload(ReadApiResponse<Instance> Instance, IReadOnlyList<InstanceDataDownload> Data)
    : IDisposable
{
    public void Dispose()
    {
        Instance.Dispose();
        foreach (var data in Data)
            data.Dispose();
    }

    public async Task Verify(
        ScopedVerifier verifier,
        object? parameters = null,
        bool skipInstanceInSnapshot = false,
        [CallerFilePath] string sourceFile = ""
    )
    {
        var scrubbers = new Scrubbers(StringScrubber: Scrubbers.InstanceStringScrubber(Instance));
        if (!skipInstanceInSnapshot)
        {
            await verifier
                .Verify(
                    Instance,
                    snapshotName: "Download-Instance",
                    scrubbers: scrubbers,
                    parameters: parameters,
                    sourceFile: sourceFile
                )
                .ScrubMember<DataElement>(d => d.Size); // PDF varies in size
        }
        foreach (var data in Data)
        {
            switch (data)
            {
                case InstanceDataDownload.Form form:
                    await verifier.Verify(
                        form.Data,
                        snapshotName: $"Download-Data[{data.Index}]",
                        scrubbers: scrubbers,
                        parameters: parameters,
                        sourceFile: sourceFile
                    );
                    break;
                case InstanceDataDownload.Binary binary:
                    var finalScrubbers = scrubbers;
                    if (data.DataType == "ref-data-as-pdf")
                    {
                        // Special handling for PDF data types
                        var contentLength = binary.Data.Response.Content.Headers.ContentLength!.Value.ToString();
                        finalScrubbers = scrubbers.WithStringScrubber(v => v.Replace(contentLength, "<contentLength>"));
                        finalScrubbers = finalScrubbers.WithHeadersScrubber(kvp =>
                        {
                            // We ignore these headers for PDF snapshots because
                            // PDF output is not deterministic and ASP.NET core is not determnistic
                            // in how it serves the PDF stream in the response
                            if (kvp.Key is "Transfer-Encoding" or "Content-Length")
                                return null;
                            return kvp;
                        });
                        binary.Data.IncludeBodyInSnapshot = false; // Avoid non-determnistic PDF snapshots
                    }

                    await verifier.Verify(
                        binary.Data,
                        snapshotName: data.DataType == "ref-data-as-pdf"
                            ? "Download-PDF"
                            : $"Download-Data[{data.Index}]",
                        scrubbers: finalScrubbers,
                        parameters: parameters,
                        sourceFile: sourceFile
                    );
                    break;
                default:
                    throw new InvalidOperationException($"Unknown data type: {data.GetType()}");
            }
        }
    }
}

internal abstract record InstanceDataDownload(int Index, Guid Id, string DataType) : IDisposable
{
    public abstract void Dispose();

    internal sealed record Form(int Index, Guid Id, string DataType, ReadApiResponse<Argon.JToken> Data)
        : InstanceDataDownload(Index, Id, DataType)
    {
        public override void Dispose() => Data.Dispose();
    }

    internal sealed record Binary(int Index, Guid Id, string DataType, ReadApiResponse<byte[]> Data)
        : InstanceDataDownload(Index, Id, DataType)
    {
        public override void Dispose() => Data.Dispose();
    }
}
