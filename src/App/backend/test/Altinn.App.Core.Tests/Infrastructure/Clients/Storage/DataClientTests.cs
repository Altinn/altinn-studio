using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Infrastructure.Clients.Storage.TestData;
using Altinn.App.PlatformServices.Tests.Data;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public class DataClientTests
{
    [Obsolete("Called by the de-serializer; should only be called by deriving classes for de-serialization purposes")]
    public DataClientTests() { }

    private const string ApiStorageEndpoint = "https://local.platform.altinn.no/api/storage/";
    private static readonly ApplicationMetadata _appMetadata = new("test-org/test-app") { DataTypes = [] };
    private static readonly Authenticated _defaultAuth = TestAuthentication.GetUserAuthentication();

    private static readonly TestTokens _testTokens = new(
        UserToken: JwtToken.Parse(_defaultAuth.Token),
        ServiceOwnerToken: JwtToken.Parse(TestAuthentication.GetServiceOwnerToken()),
        CustomToken: TestAuthentication.GetMaskinportenToken("scope").AccessToken
    );

    // csharpier-ignore
    public static TheoryData<AuthenticationTestCase?> AuthenticationTestCases
    {
        get
        {
            TheoryData<AuthenticationTestCase?> data = new();
            data.Add(null);
            data.Add(new(StorageAuthenticationMethod.CurrentUser(), _testTokens.UserToken));
            data.Add(new(StorageAuthenticationMethod.ServiceOwner(), _testTokens.ServiceOwnerToken));
            data.Add(new(StorageAuthenticationMethod.Custom(() => Task.FromResult(_testTokens.CustomToken)), _testTokens.CustomToken));
            return data;
        }
    }

    [Fact]
    public async Task GuardedDataClient_GetDataBytes_ThrowsWhileInstanceDataUnitOfWorkIsActive()
    {
        var guard = new InstanceDataMutatorStorageAccessGuard();
        var inner = new Mock<IStorageDataClient>(MockBehavior.Strict);
        IDataClient dataClient = new DataClient(inner.Object, guard);

        using IDisposable _ = guard.EnterScope();

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataClient.GetDataBytes(123, Guid.NewGuid(), Guid.NewGuid())
        );
        Assert.Contains("InstanceDataUnitOfWork", exception.Message, StringComparison.Ordinal);
        Assert.Contains("IInstanceDataAccessor/IInstanceDataMutator", exception.Message, StringComparison.Ordinal);
        Assert.Contains("outside the unit of work", exception.Message, StringComparison.Ordinal);
        inner.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GuardedDataClient_GetDataBytes_DelegatesOutsideActiveUnitOfWork()
    {
        var guard = new InstanceDataMutatorStorageAccessGuard();
        var inner = new Mock<IStorageDataClient>(MockBehavior.Strict);
        Guid instanceGuid = Guid.NewGuid();
        Guid dataGuid = Guid.NewGuid();
        byte[] expected = [1, 2, 3];
        inner
            .Setup(x =>
                x.GetDataBytes(
                    123,
                    instanceGuid,
                    dataGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(expected);
        IDataClient dataClient = new DataClient(inner.Object, guard);

        byte[] actual = await dataClient.GetDataBytes(123, instanceGuid, dataGuid);

        Assert.Equal(expected, actual);
        inner.VerifyAll();
    }

    [Fact]
    public void GuardedDataClient_DoesNotExposeInternalStorageInterfaces()
    {
        var guard = new InstanceDataMutatorStorageAccessGuard();
        var inner = new Mock<IStorageDataClient>(MockBehavior.Strict);
        IDataClient dataClient = new DataClient(inner.Object, guard);

        Assert.False(dataClient is IDataClientWithStorageMetadata);
        Assert.False(dataClient is IInstanceMutationClient);
    }

    [Fact]
    public async Task PublicConstructor_WhenGuardServiceIsMissing_DelegatesOutsideActiveUnitOfWork()
    {
        byte[] expected = [4, 5, 6];
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new ByteArrayContent(expected),
                };
            }
        );
        IDataClient dataClient = new DataClient(fixture.BaseHttpClient, fixture.ServiceProvider);

        byte[] actual = await dataClient.GetDataBytes(123, Guid.NewGuid(), Guid.NewGuid());

        Assert.Equal(expected, actual);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task InsertBinaryData_MethodProduceValidPlatformRequest(AuthenticationTestCase? testCase)
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;
        TelemetrySink telemetrySink = new();

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                platformRequest = request;

                DataElement dataElement = new DataElement { Id = "DataElement.Id", InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = JsonContent.Create(dataElement) };
            },
            telemetrySink
        );

        var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));
        var instanceIdentifier = new InstanceIdentifier(323413, Guid.NewGuid());
        Uri expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType=catstories",
            UriKind.RelativeOrAbsolute
        );

        // Act
        DataElement actual = await fixture.DataClient.InsertBinaryData(
            instanceIdentifier.ToString(),
            "catstories",
            "application/pdf",
            "a cats story.pdf",
            stream,
            authenticationMethod: testCase?.AuthenticationMethod
        );

        // Assert
        Assert.NotNull(actual);
        AssertHttpRequest(
            platformRequest,
            expectedUri,
            HttpMethod.Post,
            "a cats story.pdf",
            "application/pdf",
            expectedAuth: testCase?.ExpectedToken
        );

        VerifySettings verifySettings = new();
        verifySettings.UseMethodName(
            $"{nameof(InsertBinaryData_MethodProduceValidPlatformRequest)}_{testCase?.ToString() ?? "DefaultAuth"}"
        );

        await Verify(telemetrySink.GetSnapshot(), verifySettings);
    }

    [Fact]
    public async Task InsertBinaryDataWithStorageMetadata_ParsesETagHeader()
    {
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                DataElement dataElement = new DataElement { Id = "DataElement.Id", InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                var response = new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Created,
                    Content = JsonContent.Create(dataElement),
                };
                response.Headers.ETag = EntityTagHeaderValue.Parse("\"etag-1\"");
                response.Headers.Add("Instance-Version", "21");
                response.Headers.Add("Process-State-Version", "4");
                return response;
            }
        );

        DataElementWithStorageMetadata result = await (
            (IDataClientWithStorageMetadata)fixture.DataClient
        ).InsertBinaryDataWithStorageMetadata(
            "123/3fbf6371-f8ba-4c09-a292-f732d6bf2346",
            "catstories",
            "application/pdf",
            "story.pdf",
            new MemoryStream("hello"u8.ToArray()),
            generatedFromTask: null,
            authenticationMethod: null
        );

        Assert.Equal("\"etag-1\"", result.Metadata.ETag);
        Assert.Equal(21, result.Versions.InstanceVersion);
        Assert.Equal(4, result.Versions.ProcessStateVersion);
    }

    [Fact]
    public async Task UpdateBinaryDataWithStorageMetadata_ParsesVersionHeaders()
    {
        var instanceIdentifier = new InstanceIdentifier("123/3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        var dataGuid = Guid.Parse("d4fd982c-47a6-4040-8f61-a9f56c827b28");
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                DataElement dataElement = new DataElement { Id = dataGuid.ToString(), InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                var response = new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = JsonContent.Create(dataElement),
                };
                response.Headers.ETag = EntityTagHeaderValue.Parse("\"etag-3\"");
                response.Headers.Add("Instance-Version", "22");
                response.Headers.Add("Process-State-Version", "5");
                return response;
            }
        );

        DataElementWithStorageMetadata result = await (
            (IDataClientWithStorageMetadata)fixture.DataClient
        ).UpdateBinaryDataWithStorageMetadata(
            instanceIdentifier,
            "application/pdf",
            "story.pdf",
            dataGuid,
            new MemoryStream("hello"u8.ToArray()),
            authenticationMethod: null
        );

        Assert.Equal("\"etag-3\"", result.Metadata.ETag);
        Assert.Equal(22, result.Versions.InstanceVersion);
        Assert.Equal(5, result.Versions.ProcessStateVersion);
    }

    [Fact]
    public async Task CommitInstanceMutationWithStorageMetadata_SendsMultipartMutationAndParsesMetadata()
    {
        Guid instanceGuid = Guid.Parse("3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        Guid dataGuid = Guid.Parse("d4fd982c-47a6-4040-8f61-a9f56c827b28");
        HttpRequestMessage? platformRequest = null;
        string? requestBody = null;
        string? requestContentType = null;
        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                platformRequest = request;
                requestBody = await request.Content!.ReadAsStringAsync(ct);
                requestContentType = request.Content.Headers.ContentType?.ToString();
                var response = new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(
                        $$"""
                        {
                          "instance": {
                            "id": "123/{{instanceGuid}}",
                            "data": [{ "id": "{{dataGuid}}", "dataType": "catstories" }]
                          },
                          "createdDataElementIds": ["{{dataGuid}}"],
                          "dataElementContentEtags": {
                            "{{dataGuid}}": "\"etag-2\""
                          },
                          "replayed": true
                        }
                        """,
                        Encoding.UTF8,
                        "application/json"
                    ),
                };
                response.Headers.Add("Instance-Version", "30");
                response.Headers.Add("Process-State-Version", "9");
                return response;
            }
        );
        var mutation = new StorageInstanceMutationRequest();
        mutation.CreateDataElements.Add(
            new StorageInstanceMutationCreateDataElement
            {
                DataType = "catstories",
                ContentPartName = "content-create",
                ContentType = "application/pdf",
                Filename = "story.pdf",
            }
        );

        InstanceMutationWithStorageMetadata result = await (
            (IInstanceMutationClient)fixture.DataClient
        ).CommitInstanceMutationWithStorageMetadata(
            123,
            instanceGuid,
            mutation,
            new Dictionary<string, StorageInstanceMutationContent>
            {
                ["content-create"] = new("hello"u8.ToArray(), "application/pdf", "story.pdf"),
            },
            preconditions: new StorageWritePreconditions(ProcessStateVersion: 9)
        );

        AssertHttpRequest(
            platformRequest,
            new Uri($"{ApiStorageEndpoint}instances/123/{instanceGuid}/mutations", UriKind.RelativeOrAbsolute),
            HttpMethod.Post
        );
        Assert.StartsWith("multipart/form-data", requestContentType, StringComparison.Ordinal);
        Assert.Contains("\"createDataElements\"", requestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"dataElementId\"", requestBody, StringComparison.Ordinal);
        Assert.Contains("content-create", requestBody, StringComparison.Ordinal);
        Assert.Equal("9", platformRequest.Headers.GetValues("If-Process-State-Version-Match").Single());
        Assert.False(platformRequest.Headers.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName));
        Assert.Equal($"123/{instanceGuid}", result.Instance.Id);
        Assert.Equal([dataGuid], result.CreatedDataElementIds);
        Assert.Equal("\"etag-2\"", result.DataElementMetadata[dataGuid.ToString()].ETag);
        Assert.Equal(30, result.Metadata.InstanceVersion);
        Assert.Equal(9, result.Metadata.ProcessStateVersion);
        Assert.True(result.Replayed);
    }

    [Fact]
    public async Task CommitInstanceMutationWithStorageMetadata_WhenNoContentParts_SendsJsonMutation()
    {
        Guid instanceGuid = Guid.Parse("3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        HttpRequestMessage? platformRequest = null;
        string? requestBody = null;
        string? requestContentType = null;
        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                platformRequest = request;
                requestBody = await request.Content!.ReadAsStringAsync(ct);
                requestContentType = request.Content.Headers.ContentType?.ToString();
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(
                        $$"""
                        {
                          "instance": {
                            "id": "123/{{instanceGuid}}"
                          },
                          "dataElementContentEtags": {}
                        }
                        """,
                        Encoding.UTF8,
                        "application/json"
                    ),
                };
            }
        );
        var mutation = new StorageInstanceMutationRequest();
        mutation.DataValues["status"] = "paid";

        await ((IInstanceMutationClient)fixture.DataClient).CommitInstanceMutationWithStorageMetadata(
            123,
            instanceGuid,
            mutation,
            new Dictionary<string, StorageInstanceMutationContent>()
        );

        AssertHttpRequest(
            platformRequest,
            new Uri($"{ApiStorageEndpoint}instances/123/{instanceGuid}/mutations", UriKind.RelativeOrAbsolute),
            HttpMethod.Post
        );
        Assert.StartsWith("application/json", requestContentType, StringComparison.Ordinal);
        Assert.Contains("\"dataValues\":{\"status\":\"paid\"}", requestBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CommitInstanceMutationWithStorageMetadata_WhenDeletingInstance_SendsDeleteInstanceMutation()
    {
        Guid instanceGuid = Guid.Parse("3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        string? requestBody = null;
        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                requestBody = await request.Content!.ReadAsStringAsync(ct);
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(
                        $$"""
                        {
                          "instance": {
                            "id": "123/{{instanceGuid}}"
                          },
                          "dataElementContentEtags": {}
                        }
                        """,
                        Encoding.UTF8,
                        "application/json"
                    ),
                };
            }
        );
        var mutation = new StorageInstanceMutationRequest
        {
            DeleteInstance = new StorageInstanceMutationDeleteInstance { Hard = true },
        };

        await ((IInstanceMutationClient)fixture.DataClient).CommitInstanceMutationWithStorageMetadata(
            123,
            instanceGuid,
            mutation,
            new Dictionary<string, StorageInstanceMutationContent>()
        );

        Assert.Contains("\"deleteInstance\":{\"hard\":true}", requestBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task InsertBinaryDataWithStorageMetadata_SendsProcessPreconditionWithoutInstancePrecondition()
    {
        HttpRequestMessage? platformRequest = null;
        await using var fixture = Fixture.Create(
            async (request, _) =>
            {
                platformRequest = request;
                DataElement dataElement = new DataElement { Id = "DataElement.Id", InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.Created,
                    Content = JsonContent.Create(dataElement),
                };
            }
        );

        await ((IDataClientWithStorageMetadata)fixture.DataClient).InsertBinaryDataWithStorageMetadata(
            "123/3fbf6371-f8ba-4c09-a292-f732d6bf2346",
            "catstories",
            "application/pdf",
            "story.pdf",
            new MemoryStream("hello"u8.ToArray()),
            generatedFromTask: null,
            authenticationMethod: null,
            preconditions: new StorageWritePreconditions(ProcessStateVersion: 4)
        );

        Assert.NotNull(platformRequest);
        Assert.Equal("4", platformRequest.Headers.GetValues("If-Process-State-Version-Match").Single());
        Assert.False(platformRequest.Headers.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName));
    }

    [Fact]
    public async Task UpdateBinaryDataWithStorageMetadata_SendsContentAndProcessPreconditionsWithoutInstancePrecondition()
    {
        var instanceIdentifier = new InstanceIdentifier("123/3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        var dataGuid = Guid.Parse("d4fd982c-47a6-4040-8f61-a9f56c827b28");
        HttpRequestMessage? platformRequest = null;
        await using var fixture = Fixture.Create(
            async (request, _) =>
            {
                platformRequest = request;
                DataElement dataElement = new DataElement { Id = dataGuid.ToString(), InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = JsonContent.Create(dataElement),
                };
            }
        );

        await ((IDataClientWithStorageMetadata)fixture.DataClient).UpdateBinaryDataWithStorageMetadata(
            instanceIdentifier,
            "application/pdf",
            "story.pdf",
            dataGuid,
            new MemoryStream("hello"u8.ToArray()),
            authenticationMethod: null,
            preconditions: new StorageWritePreconditions(ProcessStateVersion: 5, ContentETag: "\"etag-3\"")
        );

        Assert.NotNull(platformRequest);
        Assert.Equal("5", platformRequest.Headers.GetValues("If-Process-State-Version-Match").Single());
        Assert.Equal("\"etag-3\"", platformRequest.Headers.IfMatch.Single().ToString());
        Assert.False(platformRequest.Headers.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName));
    }

    [Fact]
    public async Task UpdateBinaryDataWithStorageMetadata_WhenStorageReturnsPreconditionFailed_ThrowsPlatformHttpException()
    {
        var instanceIdentifier = new InstanceIdentifier("123/3fbf6371-f8ba-4c09-a292-f732d6bf2346");
        var dataGuid = Guid.Parse("d4fd982c-47a6-4040-8f61-a9f56c827b28");
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage { StatusCode = HttpStatusCode.PreconditionFailed };
            }
        );

        var exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            ((IDataClientWithStorageMetadata)fixture.DataClient).UpdateBinaryDataWithStorageMetadata(
                instanceIdentifier,
                "application/pdf",
                "story.pdf",
                dataGuid,
                new MemoryStream("hello"u8.ToArray()),
                authenticationMethod: null,
                preconditions: new StorageWritePreconditions(ProcessStateVersion: 5, ContentETag: "\"etag-3\"")
            )
        );

        Assert.Equal(HttpStatusCode.PreconditionFailed, exception.Response.StatusCode);
    }

    [Fact]
    public async Task DeleteDataWithStorageMetadata_ParsesVersionHeaders()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.OK,
                    Headers = { { "Instance-Version", "23" }, { "Process-State-Version", "6" } },
                };
            }
        );

        DeleteDataWithStorageMetadata result = await (
            (IDataClientWithStorageMetadata)fixture.DataClient
        ).DeleteDataWithStorageMetadata(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            delay: false,
            authenticationMethod: null
        );

        Assert.True(result.Deleted);
        Assert.Equal(23, result.Metadata.InstanceVersion);
        Assert.Equal(6, result.Metadata.ProcessStateVersion);
    }

    [Fact]
    public async Task DeleteDataWithStorageMetadata_SendsProcessPreconditionWithoutInstancePrecondition()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        await using var fixture = Fixture.Create(
            async (request, _) =>
            {
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage { StatusCode = HttpStatusCode.OK };
            }
        );

        await ((IDataClientWithStorageMetadata)fixture.DataClient).DeleteDataWithStorageMetadata(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            delay: false,
            authenticationMethod: null,
            preconditions: new StorageWritePreconditions(ProcessStateVersion: 6)
        );

        Assert.NotNull(platformRequest);
        Assert.Equal("6", platformRequest.Headers.GetValues("If-Process-State-Version-Match").Single());
        Assert.False(platformRequest.Headers.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName));
    }

    [Fact]
    public async Task GetDataBytesWithStorageMetadata_ParsesETagHeader()
    {
        byte[] expectedBytes = "hello"u8.ToArray();
        await using var fixture = Fixture.Create(
            async (_, _) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new ByteArrayContent(expectedBytes),
                    Headers = { ETag = EntityTagHeaderValue.Parse("\"etag-2\"") },
                };
            }
        );

        DataBytesWithStorageMetadata result = await (
            (IDataClientWithStorageMetadata)fixture.DataClient
        ).GetDataBytesWithStorageMetadata(
            123,
            Guid.Parse("3fbf6371-f8ba-4c09-a292-f732d6bf2346"),
            Guid.Parse("d4fd982c-47a6-4040-8f61-a9f56c827b28"),
            authenticationMethod: null
        );

        Assert.Equal(expectedBytes, result.Bytes);
        Assert.Equal("\"etag-2\"", result.Metadata.ETag);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task InsertBinaryData_MethodProduceValidPlatformRequest_with_generatedFrom_query_params(
        AuthenticationTestCase? testCase
    )
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                platformRequest = request;

                DataElement dataElement = new DataElement { Id = "DataElement.Id", InstanceGuid = "InstanceGuid" };
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = JsonContent.Create(dataElement) };
            }
        );

        var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));
        var instanceIdentifier = new InstanceIdentifier(323413, Guid.NewGuid());
        Uri expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType=catstories&generatedFromTask=Task_1",
            UriKind.RelativeOrAbsolute
        );

        // Act
        DataElement actual = await fixture.DataClient.InsertBinaryData(
            instanceIdentifier.ToString(),
            "catstories",
            "application/pdf",
            "a cats story.pdf",
            stream,
            "Task_1",
            authenticationMethod: testCase?.AuthenticationMethod
        );

        // Assert
        Assert.NotNull(actual);
        AssertHttpRequest(
            platformRequest,
            expectedUri,
            HttpMethod.Post,
            "a cats story.pdf",
            "application/pdf",
            expectedAuth: testCase?.ExpectedToken
        );
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetFormData_MethodProduceValidPlatformRequest_ReturnedFormIsValid(
        AuthenticationTestCase? testCase
    )
    {
        // Arrange
        HttpRequestMessage? platformRequest = null;

        await using var fixture = Fixture.Create(
            (request, ct) =>
            {
                platformRequest = request;

                HttpResponseMessage response = new()
                {
                    Content = new StringContent(
                        """
                        <?xml version="1.0"?>
                        <Skjema xmlns="urn:no:altinn:skjema:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" skjemanummer="1472" spesifikasjonsnummer="9812" blankettnummer="AFP-01" tittel="Arbeidsgiverskjema AFP" gruppeid="8818">
                            <Foretak-grp-8820 gruppeid="8820">
                                <EnhetNavnEndring-datadef-31 orid="31">Test Test 123</EnhetNavnEndring-datadef-31>
                            </Foretak-grp-8820>
                        </Skjema>
                        """,
                        new MediaTypeHeaderValue("application/xml")
                    ),
                };

                return Task.FromResult(response);
            }
        );

        Guid dataElementGuid = Guid.NewGuid();
        var instanceIdentifier = new InstanceIdentifier(323413, Guid.NewGuid());
        Uri expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataElementGuid}",
            UriKind.RelativeOrAbsolute
        );

        // Act
        object response = await fixture.DataClient.GetFormData(
            instanceIdentifier.InstanceGuid,
            typeof(SkjemaWithNamespace),
            "org",
            "app",
            323413,
            dataElementGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );

        // Assert
        var actual = response as SkjemaWithNamespace;
        Assert.NotNull(actual);
        Assert.NotNull(actual.Foretakgrp8820);
        Assert.NotNull(actual.Foretakgrp8820.EnhetNavnEndringdatadef31);

        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);
    }

    [Fact]
    public async Task InsertBinaryData_PlatformRespondNotOk_ThrowsPlatformException()
    {
        // Arrange
        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.BadRequest };
            }
        );

        var stream = new MemoryStream(Encoding.UTF8.GetBytes("This is not a pdf, but no one here will care."));

        // Act
        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.InsertBinaryData(
                "instanceId",
                "catstories",
                "application/pdf",
                "a cats story.pdf",
                stream,
                generatedFromTask: null,
                authenticationMethod: null,
                CancellationToken.None
            )
        );

        // Assert
        Assert.NotNull(actual);
        Assert.Equal(HttpStatusCode.BadRequest, actual.Response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task UpdateBinaryData_put_updated_data_and_Return_DataElement(AuthenticationTestCase? testCase)
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;
        DataElement expectedDataelement = new DataElement
        {
            Id = instanceIdentifier.ToString(),
            InstanceGuid = instanceIdentifier.InstanceGuid.ToString(),
        };

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                DataElement dataElement = new DataElement
                {
                    Id = instanceIdentifier.ToString(),
                    InstanceGuid = instanceIdentifier.InstanceGuid.ToString(),
                };
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = JsonContent.Create(dataElement) };
            }
        );

        Uri expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );
        var result = await fixture.DataClient.UpdateBinaryData(
            instanceIdentifier,
            "application/json",
            "test.json",
            dataGuid,
            new MemoryStream(),
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        AssertHttpRequest(
            platformRequest,
            expectedUri,
            HttpMethod.Put,
            "test.json",
            "application/json",
            expectedAuth: testCase?.ExpectedToken
        );
        result.Should().BeEquivalentTo(expectedDataelement);
    }

    [Fact]
    public async Task UpdateBinaryData_returns_exception_when_put_to_storage_result_in_servererror()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.UpdateBinaryData(
                instanceIdentifier,
                "application/json",
                "test.json",
                dataGuid,
                new MemoryStream(),
                authenticationMethod: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task UpdateBinaryData_returns_exception_when_put_to_storage_result_in_conflict()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.Conflict };
            }
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.UpdateBinaryData(
                instanceIdentifier,
                "application/json",
                "test.json",
                dataGuid,
                new MemoryStream(),
                authenticationMethod: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetBinaryData_returns_stream_of_binary_data(AuthenticationTestCase? testCase)
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = new StringContent("hello worlds") };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );
        var response = await fixture.DataClient.GetBinaryData(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);
        using StreamReader streamReader = new StreamReader(response);
        var responseString = await streamReader.ReadToEndAsync();

        responseString.Should().BeEquivalentTo("hello worlds");
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetBinaryData_returns_empty_stream_when_storage_returns_notfound(AuthenticationTestCase? testCase)
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );
        var response = await fixture.DataClient.GetBinaryData(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        response.Should().BeNull();
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);
    }

    [Fact]
    public async Task GetBinaryData_throws_PlatformHttpException_when_server_error_returned_from_storage()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.GetBinaryData(
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                dataGuid,
                authenticationMethod: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetBinaryDataStream_returns_stream_of_binary_data_with_unbuffered_response(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = new StringContent("hello streaming world") };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );

        await using var response = await fixture.DataClient.GetBinaryDataStream(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );

        invocations.Should().Be(1);
        platformRequest?.Should().NotBeNull();
        AssertHttpRequest(platformRequest!, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);

        using StreamReader streamReader = new StreamReader(response);
        var responseString = await streamReader.ReadToEndAsync();
        responseString.Should().BeEquivalentTo("hello streaming world");
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetBinaryDataStream_throws_PlatformHttpException_when_data_not_found(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(async () =>
            await fixture.DataClient.GetBinaryDataStream(
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                dataGuid,
                authenticationMethod: testCase?.AuthenticationMethod
            )
        );

        invocations.Should().Be(1);
        platformRequest?.Should().NotBeNull();
        AssertHttpRequest(platformRequest!, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetBinaryDataStream_throws_PlatformHttpException_when_server_error_returned_from_storage()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpResponseSnapshotException>(async () =>
            await fixture.DataClient.GetBinaryDataStream(
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                dataGuid,
                authenticationMethod: null,
                timeout: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task GetBinaryDataList_returns_AttachemtList_when_DataElements_found(AuthenticationTestCase? testCase)
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage()
                {
                    Content = new StringContent(
                        "{\"dataElements\":[{\"Id\":\"aaaa-bbbb-cccc-dddd\",\"Size\":10,\"DataType\":\"cats\"},{\"Id\":\"eeee-ffff-gggg-hhhh\", \"Size\":20,\"DataType\":\"dogs\"}]}"
                    ),
                };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/dataelements",
            UriKind.RelativeOrAbsolute
        );
        var response = await fixture.DataClient.GetBinaryDataList(
            "ttd",
            "app",
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            authenticationMethod: testCase?.AuthenticationMethod,
            CancellationToken.None
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Get, expectedAuth: testCase?.ExpectedToken);

        var expectedList = new List<AttachmentList>()
        {
            new AttachmentList()
            {
                Attachments = new List<Attachment>()
                {
                    new Attachment() { Id = "aaaa-bbbb-cccc-dddd", Size = 10 },
                },
                Type = "cats",
            },
            new AttachmentList()
            {
                Attachments = new List<Attachment>()
                {
                    new Attachment() { Id = "eeee-ffff-gggg-hhhh", Size = 20 },
                },
                Type = "dogs",
            },
            new AttachmentList()
            {
                Attachments = new List<Attachment>()
                {
                    new Attachment() { Id = "eeee-ffff-gggg-hhhh", Size = 20 },
                },
                Type = "attachments",
            },
        };
        response.Should().BeEquivalentTo(expectedList);
    }

    [Fact]
    public async Task GetBinaryDataList_throws_PlatformHttpException_if_non_ok_response()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.GetBinaryDataList(
                "ttd",
                "app",
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        actual.Should().NotBeNull();
        actual.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task DeleteBinaryData_returns_true_when_data_was_deleted()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.OK };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}?delay=False",
            UriKind.RelativeOrAbsolute
        );
        var result = await fixture.DataClient.DeleteData(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            delay: false,
            authenticationMethod: null,
            CancellationToken.None
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Delete);
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteBinaryData_throws_PlatformHttpException_when_dataelement_not_found()
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.NotFound };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}?delay=False",
            UriKind.RelativeOrAbsolute
        );
        var actual = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.DeleteData(
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                dataGuid,
                delay: false,
                authenticationMethod: null,
                CancellationToken.None
            )
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Delete);
        actual.Response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task DeleteData_returns_true_when_data_was_deleted_with_delay_true(AuthenticationTestCase? testCase)
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;

                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.OK };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}?delay=True",
            UriKind.RelativeOrAbsolute
        );
        var result = await fixture.DataClient.DeleteData(
            "ttd",
            "app",
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            dataGuid,
            true,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Delete, expectedAuth: testCase?.ExpectedToken);
        result.Should().BeTrue();
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task UpdateData_serializes_and_updates_formdata(AuthenticationTestCase? testCase)
    {
        ExampleModel exampleModel = new ExampleModel() { Name = "Test", Age = 22 };
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.OK };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );
        await fixture.DataClient.UpdateData(
            exampleModel,
            instanceIdentifier.InstanceGuid,
            exampleModel.GetType(),
            "ttd",
            "app",
            instanceIdentifier.InstanceOwnerPartyId,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        AssertHttpRequest(
            platformRequest,
            expectedUri,
            HttpMethod.Put,
            null,
            "application/xml",
            expectedAuth: testCase?.ExpectedToken
        );
    }

    [Fact]
    public async Task UpdateData_throws_error_if_serilization_fails()
    {
        object exampleModel = new ExampleModel()
        {
            Name = "Test",
            Age = 22,
            ShouldError = true,
        };
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.OK };
            }
        );

        await Assert.ThrowsAsync<TargetInvocationException>(async () =>
            await fixture.DataClient.UpdateData(
                exampleModel,
                instanceIdentifier.InstanceGuid,
                exampleModel.GetType(),
                "ttd",
                "app",
                instanceIdentifier.InstanceOwnerPartyId,
                dataGuid
            )
        );
        invocations.Should().Be(0);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task UpdateData_throws_platformhttpexception_if_platform_request_fails(
        AuthenticationTestCase? testCase
    )
    {
        object exampleModel = new ExampleModel() { Name = "Test", Age = 22 };
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}",
            UriKind.RelativeOrAbsolute
        );
        var result = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.UpdateData(
                exampleModel,
                instanceIdentifier.InstanceGuid,
                typeof(ExampleModel),
                "ttd",
                "app",
                instanceIdentifier.InstanceOwnerPartyId,
                dataGuid,
                authenticationMethod: testCase?.AuthenticationMethod
            )
        );
        invocations.Should().Be(1);
        AssertHttpRequest(
            platformRequest,
            expectedUri,
            HttpMethod.Put,
            null,
            "application/xml",
            expectedAuth: testCase?.ExpectedToken
        );
        result.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task LockDataElement_calls_lock_endpoint_in_storage_and_returns_updated_DataElement(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;
        DataElement dataElement = new() { Id = "67a5ef12-6e38-41f8-8b42-f91249ebcec0", Locked = true };

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{\"id\":\"67a5ef12-6e38-41f8-8b42-f91249ebcec0\",\"locked\":true}"),
                };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock",
            UriKind.RelativeOrAbsolute
        );
        var response = await fixture.DataClient.LockDataElement(
            instanceIdentifier,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        response.Should().BeEquivalentTo(dataElement);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Put, expectedAuth: testCase?.ExpectedToken);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task LockDataElement_throws_platformhttpexception_if_platform_request_fails(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;
        HttpRequestMessage? platformRequest = null;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock",
            UriKind.RelativeOrAbsolute
        );
        var result = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.LockDataElement(
                instanceIdentifier,
                dataGuid,
                authenticationMethod: testCase?.AuthenticationMethod
            )
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Put, expectedAuth: testCase?.ExpectedToken);
        result.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task UnlockDataElement_calls_lock_endpoint_in_storage_and_returns_updated_DataElement(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        HttpRequestMessage? platformRequest = null;
        int invocations = 0;
        DataElement dataElement = new() { Id = "67a5ef12-6e38-41f8-8b42-f91249ebcec0", Locked = true };

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage()
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{\"id\":\"67a5ef12-6e38-41f8-8b42-f91249ebcec0\",\"locked\":true}"),
                };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock",
            UriKind.RelativeOrAbsolute
        );
        var response = await fixture.DataClient.UnlockDataElement(
            instanceIdentifier,
            dataGuid,
            authenticationMethod: testCase?.AuthenticationMethod
        );
        invocations.Should().Be(1);
        response.Should().BeEquivalentTo(dataElement);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Delete, expectedAuth: testCase?.ExpectedToken);
    }

    [Theory]
    [MemberData(nameof(AuthenticationTestCases))]
    public async Task UnlockDataElement_throws_platformhttpexception_if_platform_request_fails(
        AuthenticationTestCase? testCase
    )
    {
        var instanceIdentifier = new InstanceIdentifier("501337/d3f3250d-705c-4683-a215-e05ebcbe6071");
        var dataGuid = new Guid("67a5ef12-6e38-41f8-8b42-f91249ebcec0");
        int invocations = 0;
        HttpRequestMessage? platformRequest = null;

        await using var fixture = Fixture.Create(
            async (request, ct) =>
            {
                invocations++;
                platformRequest = request;
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.InternalServerError };
            }
        );

        var expectedUri = new Uri(
            $"{ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock",
            UriKind.RelativeOrAbsolute
        );
        var result = await Assert.ThrowsAsync<PlatformHttpException>(async () =>
            await fixture.DataClient.UnlockDataElement(
                instanceIdentifier,
                dataGuid,
                authenticationMethod: testCase?.AuthenticationMethod
            )
        );
        invocations.Should().Be(1);
        AssertHttpRequest(platformRequest, expectedUri, HttpMethod.Delete, expectedAuth: testCase?.ExpectedToken);
        result.Response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    private static void AssertHttpRequest(
        [NotNull] HttpRequestMessage? actual,
        Uri expectedUri,
        HttpMethod method,
        string? expectedFilename = null,
        string? expectedContentType = null,
        JwtToken? expectedAuth = null
    )
    {
        Assert.NotNull(actual);
        Assert.Equal(method, actual.Method);

        var authHeader = actual.Headers.Authorization;
        Assert.NotNull(authHeader);
        Assert.Equal("Bearer", authHeader.Scheme);
        Assert.Equal(expectedAuth ?? _defaultAuth.Token, authHeader.Parameter);

        const int uriComparisonIdentical = 0;
        Assert.Equivalent(expectedUri, actual.RequestUri);
        Assert.Equal(
            uriComparisonIdentical,
            Uri.Compare(
                actual.RequestUri,
                expectedUri,
                UriComponents.HttpRequestUrl,
                UriFormat.SafeUnescaped,
                StringComparison.OrdinalIgnoreCase
            )
        );

        if (expectedContentType is not null)
        {
            var actualContentType = actual.Content?.Headers.GetValues("Content-Type").Single();
            Assert.NotNull(actualContentType);
            Assert.Equal(expectedContentType, actualContentType);
        }

        if (expectedFilename is not null)
        {
            var actualContentDisposition = actual.Content?.Headers.GetValues("Content-Disposition").Single();
            Assert.NotNull(actualContentDisposition);
            ContentDispositionHeaderValue
                .Parse(actualContentDisposition)
                .FileName?.Should()
                .BeEquivalentTo(expectedFilename);
        }
    }

    private sealed record Fixture : IAsyncDisposable
    {
        public required IStorageDataClient DataClient { get; init; }
        public required ServiceProvider ServiceProvider { get; init; }
        public required FixtureMocks Mocks { get; init; }
        public required HttpClient BaseHttpClient { get; init; }

        public static Fixture Create(
            Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> dataClientDelegatingHandler,
            TelemetrySink? telemetrySink = null
        )
        {
            var mocks = new FixtureMocks();
            mocks.AppMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(_appMetadata);
            mocks.AuthenticationContextMock.Setup(x => x.Current).Returns(_defaultAuth);
            mocks
                .MaskinportenClientMock.Setup(x =>
                    x.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(_testTokens.ServiceOwnerToken);

            var services = new ServiceCollection();
            services.Configure<PlatformSettings>(options => options.ApiStorageEndpoint = ApiStorageEndpoint);
            services.Configure<GeneralSettings>(options => options.HostName = "tt02.altinn.no");
            services.AddRuntimeEnvironment();
            services.AddSingleton<IAuthenticationTokenResolver, AuthenticationTokenResolver>();
            services.AddSingleton<ModelSerializationService>();
            services.AddSingleton(mocks.AppModelMock.Object);
            services.AddSingleton(mocks.HttpClientFactoryMock.Object);
            services.AddSingleton(mocks.MaskinportenClientMock.Object);
            services.AddSingleton(mocks.AppMetadataMock.Object);
            services.AddSingleton(mocks.AuthenticationContextMock.Object);
            services.AddSingleton<IInstanceLocker>(Mock.Of<IInstanceLocker>());
            services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));

            if (telemetrySink is not null)
            {
                services.AddSingleton(telemetrySink);
                services.AddSingleton<Telemetry>(sp => sp.GetRequiredService<TelemetrySink>().Object);
            }

            var serviceProvider = services.BuildServiceProvider();
            DelegatingHandlerStub delegatingHandler = new(dataClientDelegatingHandler);
            HttpClient httpClient = new(delegatingHandler);

            return new Fixture
            {
                Mocks = mocks,
                ServiceProvider = serviceProvider,
                DataClient = new StorageDataClient(httpClient, serviceProvider),
                BaseHttpClient = httpClient,
            };
        }

        public sealed record FixtureMocks
        {
            public Mock<IAuthenticationContext> AuthenticationContextMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IAppMetadata> AppMetadataMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IHttpClientFactory> HttpClientFactoryMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IMaskinportenClient> MaskinportenClientMock { get; init; } = new(MockBehavior.Strict);
            public Mock<IAppModel> AppModelMock { get; init; } = new(MockBehavior.Strict);
        }

        public async ValueTask DisposeAsync()
        {
            await ServiceProvider.DisposeAsync();
            BaseHttpClient.Dispose();
        }
    }

    private sealed record TestTokens(JwtToken UserToken, JwtToken ServiceOwnerToken, JwtToken CustomToken);

    public sealed record AuthenticationTestCase : IXunitSerializable
    {
        private StorageAuthenticationMethod? _authenticationMethod;

        public StorageAuthenticationMethod AuthenticationMethod =>
            _authenticationMethod
            ?? throw new InvalidOperationException($"{nameof(AuthenticationTestCase)} has not been initialized.");

        private JwtToken? _expectedToken;
        public JwtToken ExpectedToken =>
            _expectedToken
            ?? throw new InvalidOperationException($"{nameof(AuthenticationTestCase)} has not been initialized.");

        public AuthenticationTestCase() { }

        public AuthenticationTestCase(StorageAuthenticationMethod authenticationMethod, JwtToken expectedToken)
        {
            _authenticationMethod = authenticationMethod;
            _expectedToken = expectedToken;
        }

        public void Deserialize(IXunitSerializationInfo info)
        {
            var targetMethod = info.GetValue<string>(nameof(AuthenticationMethod));

            foreach (var testCase in AuthenticationTestCases)
            {
                if (testCase?.ToString() == targetMethod)
                {
                    _authenticationMethod = testCase.AuthenticationMethod;
                    _expectedToken = testCase.ExpectedToken;
                    return;
                }
            }

            throw new ArgumentException(
                $"Unknown {nameof(StorageAuthenticationMethod)} type: {targetMethod}",
                nameof(info)
            );
        }

        public void Serialize(IXunitSerializationInfo info)
        {
            info.AddValue(nameof(AuthenticationMethod), ToString());
        }

        public override string ToString() => AuthenticationMethod.Request.GetType().Name;
    }
}
