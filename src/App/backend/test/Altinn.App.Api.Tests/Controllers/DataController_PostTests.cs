using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_PostTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly string _org = "tdd";
    private static readonly string _app = "contributer-restriction";
    private static readonly int _instanceOwnerPartyId = 500600;
    private static readonly Guid _instanceGuid = Guid.Parse("09e16a2d-e009-4f3a-940b-da1ea54a18b4");
    private readonly string _formElementId = "c52f40dd-11d1-4e24-b13b-4fcfdf6ca1c6";

    private readonly Mock<IDataProcessor> _dataProcessor = new(MockBehavior.Strict);
    private readonly Mock<IDataWriteProcessor> _dataWriteProcessor = new(MockBehavior.Strict);

    public DataController_PostTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        TestData.PrepareInstance(_org, _app, _instanceOwnerPartyId, _instanceGuid);
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
            services.AddSingleton(_dataWriteProcessor.Object);
        };
    }

    [Fact]
    public async Task PostFormElement_DataProcessorsModifiesOtherElement_ReturnsChanges()
    {
        string dataTypeString = "default";
        var storage = CreateStorageInterceptorFromTestData(_org, _app, _instanceOwnerPartyId, _instanceGuid);
        using var storageInvoker = new HttpMessageInvoker(storage);
        SendAsync = message => storageInvoker.SendAsync(message, CancellationToken.None);

        // Increase max count to allow for adding a new element
        OverrideServicesForThisTest = (services) =>
        {
            UseHttpStorageDataClient(services);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    var dataType = appMetadata.DataTypes.Should().ContainSingle(d => d.Id == dataTypeString).Which;
                    dataType.MaxCount = 2;
                })
            );
        };

        // DataWriteProcessor is not called on POST (for historical reasons)
        ProcessDataWrite((instance, data, previousData, language) => Task.CompletedTask, Times.Never());

        // Update the added form data in IDataProcessor
        RegisterProcessDataRead((instance, dataId, data, language) => Task.CompletedTask, Times.Never());

        // Update the original form data in IDataWriteProcessor
        RegisterProcessWriterDataWrite(
            "Task_1",
            async (instanceDataMutator, changes, language) =>
            {
                var (_, originalDataElement) = instanceDataMutator
                    .GetDataElements()
                    .Should()
                    .ContainSingle(d => d.dataElement.Id == _formElementId)
                    .Which;
                var postedSkjema = changes
                    .FormDataChanges.Should()
                    .ContainSingle()
                    .Which.CurrentFormData.Should()
                    .BeOfType<Skjema>()
                    .Which;
                postedSkjema.Melding!.Random.Should().Be("fromClient");
                postedSkjema.Melding.Name = "FromDataProcessor";
                var originalData = await instanceDataMutator.GetFormData(originalDataElement);
                var skjema = originalData.Should().BeOfType<Skjema>().Which;
                skjema.Melding.Should().BeNull();
                skjema.Melding = new() { Name = "FromDataWriteProcessor" };
            },
            Times.Once()
        );

        HttpClient client = GetRootedUserClient(_org, _app, 1337, _instanceOwnerPartyId, authenticationLevel: 2);
        var content = JsonContent.Create(new Skjema() { Melding = new() { Random = "fromClient" } });
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{dataTypeString}",
            content
        );

        var parsedResponse = await VerifyStatusAndDeserialize<DataPostResponse>(response, HttpStatusCode.OK);
        Assert.Equal(2, parsedResponse.NewDataModels.Count);

        var existingResponse = Assert.Single(
            parsedResponse.NewDataModels,
            r => r.DataElementId.ToString() == _formElementId
        );
        var newResponse = Assert.Single(
            parsedResponse.NewDataModels,
            r => r.DataElementId.ToString() != _formElementId
        );

        var existingData = existingResponse.Data.Should().BeOfType<JsonElement>().Which.Deserialize<Skjema>()!;
        existingData.Melding!.Name.Should().Be("FromDataWriteProcessor");
        var newData = newResponse.Data.Should().BeOfType<JsonElement>().Which.Deserialize<Skjema>()!;
        newData.Melding?.Name.Should().Be("FromDataProcessor");
        newData.Melding!.Random.Should().Be("fromClient");

        // Verify stored data
        var (_, storedData) = storage.GetInstanceAndData(_instanceOwnerPartyId, _instanceGuid);
        var newDataStored = Encoding.UTF8.GetString(storedData[parsedResponse.NewDataElementId.ToString()]);
        Assert.Contains("fromClient", newDataStored);
        Assert.Contains("FromDataProcessor", newDataStored);

        var oldDataStored = Encoding.UTF8.GetString(storedData[_formElementId]);
        Assert.Contains("FromDataWriteProcessor", oldDataStored);

        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }

    [Fact]
    public async Task PostFormElement_DataCreationDirectDataClientThrowsAndFrameworkSaveStillSucceeds()
    {
        string dataTypeString = "default";
        var storage = CreateStorageInterceptorFromTestData(_org, _app, _instanceOwnerPartyId, _instanceGuid);
        using var storageInvoker = new HttpMessageInvoker(storage);
        SendAsync = message => storageInvoker.SendAsync(message, CancellationToken.None);

        var storageGuard = new InstanceDataMutatorStorageAccessGuard();
        var innerDataClient = new Mock<IStorageDataClient>(MockBehavior.Strict);
        string? guardExceptionMessage = null;

        OverrideServicesForThisTest = (services) =>
        {
            UseHttpStorageDataClient(services);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    var dataType = appMetadata.DataTypes.Should().ContainSingle(d => d.Id == dataTypeString).Which;
                    dataType.MaxCount = 2;
                })
            );
            services.Replace(ServiceDescriptor.Singleton<IInstanceDataMutatorStorageAccessGuard>(storageGuard));
            services.Replace(
                ServiceDescriptor.Transient<IDataClient>(_ => new DataClient(innerDataClient.Object, storageGuard))
            );
            services.Replace(
                ServiceDescriptor.Transient<IInstantiationProcessor>(sp => new GuardProbeInstantiationProcessor(
                    sp.GetRequiredService<IDataClient>(),
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    message => guardExceptionMessage = message
                ))
            );
        };

        ProcessDataWrite((instance, data, previousData, language) => Task.CompletedTask, Times.Never());
        RegisterProcessDataRead((instance, dataId, data, language) => Task.CompletedTask, Times.Never());
        RegisterProcessWriterDataWrite(
            "Task_1",
            (instanceDataMutator, changes, language) => Task.CompletedTask,
            Times.Once()
        );

        HttpClient client = GetRootedUserClient(_org, _app, 1337, _instanceOwnerPartyId, authenticationLevel: 2);
        var content = JsonContent.Create(new Skjema() { Melding = new() { Random = "fromClient" } });
        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{dataTypeString}",
            content
        );

        var parsedResponse = await VerifyStatusAndDeserialize<DataPostResponse>(response, HttpStatusCode.OK);

        guardExceptionMessage.Should().Contain("Direct IDataClient Storage access is not allowed");
        storageGuard.IsActive.Should().BeFalse();
        parsedResponse.NewDataElementId.Should().NotBeEmpty();

        var (_, storedData) = storage.GetInstanceAndData(_instanceOwnerPartyId, _instanceGuid);
        Encoding.UTF8.GetString(storedData[parsedResponse.NewDataElementId.ToString()]).Should().Contain("fromClient");
        innerDataClient.VerifyNoOtherCalls();
        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }

    [Fact]
    public async Task PostBinaryElement_DataProcessorAbandons_ReturnsIssues()
    {
        // Setup test data
        var binaryData = new byte[] { 1, 2, 3, 4, 5 };
        var binaryDataType = "specificFileType";

        ProcessDataWrite((instance, data, previousData, language) => Task.CompletedTask, Times.Never());
        RegisterProcessDataRead((instance, dataId, data, language) => Task.CompletedTask, Times.Never());
        RegisterProcessWriterDataWrite(
            "Task_1",
            (instanceDataMutator, changes, language) =>
            {
                language.Should().BeNull(); // No language is set
                var data = changes.BinaryDataChanges.Should().ContainSingle().Which;
                data.CurrentBinaryData.ToArray().Should().BeEquivalentTo(binaryData);
                instanceDataMutator.AbandonAllChanges([
                    new()
                    {
                        DataElementId = data.DataElement?.Id,
                        Severity = ValidationIssueSeverity.Error,
                        Code = "ABANDONED",
                        Description = "BinaryData is incorrect",
                    },
                ]);
                return Task.CompletedTask;
            },
            Times.Exactly(1)
        );

        HttpClient client = GetRootedUserClient(_org, _app, 1337, _instanceOwnerPartyId, authenticationLevel: 2);

        // Update data element
        var updateDataElementContent = new ByteArrayContent(binaryData)
        {
            Headers =
            {
                ContentType = new MediaTypeHeaderValue("application/pdf"),
                ContentDisposition = new ContentDispositionHeaderValue("attachment") { FileName = "test.pdf" },
            },
        };

        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{binaryDataType}",
            updateDataElementContent
        );

        var responseParsed = await VerifyStatusAndDeserialize<ProblemDetails>(response, HttpStatusCode.BadRequest);

        responseParsed.Should().NotBeNull();

        var issue = responseParsed
            .Extensions.Should()
            .ContainKey("uploadValidationIssues")
            .WhoseValue.Should()
            .BeOfType<JsonElement>()
            .Which.Deserialize<List<ValidationIssueWithSource>>()
            .Should()
            .ContainSingle()
            .Which;
        issue.Code.Should().Be("ABANDONED");
        issue.Description.Should().Be("BinaryData is incorrect");

        // Verify stored data
        var readInstanceResponse = await client.GetAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}"
        );
        var endInstance = await VerifyStatusAndDeserialize<Instance>(readInstanceResponse, HttpStatusCode.OK);
        endInstance.Data.Should().HaveCount(1);

        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }

    [Fact]
    public async Task PostBinaryElement_DataWriteProcessorAddsAndRemovesElements()
    {
        // Setup test data
        var binaryData = new byte[] { 1, 2, 3, 4, 5 };
        var binaryDataType = "specificFileType";
        var storage = CreateStorageInterceptorFromTestData(_org, _app, _instanceOwnerPartyId, _instanceGuid);
        using var storageInvoker = new HttpMessageInvoker(storage);
        SendAsync = message => storageInvoker.SendAsync(message, CancellationToken.None);
        OverrideServicesForThisTest = UseHttpStorageDataClient;

        ProcessDataWrite((instance, data, previousData, language) => Task.CompletedTask, Times.Never());
        RegisterProcessDataRead((instance, dataId, data, language) => Task.CompletedTask, Times.Never());
        RegisterProcessWriterDataWrite(
            "Task_1",
            async (instanceDataMutator, changes, language) =>
            {
                var data = changes.BinaryDataChanges.Should().ContainSingle().Which;
                data.CurrentBinaryData.ToArray().Should().BeEquivalentTo(binaryData);
                instanceDataMutator.AddBinaryDataElement("specificFileType", "application/pdf", "test.pdf", binaryData);
                var toDelete = instanceDataMutator.Instance.Data.Should().ContainSingle().Which;
                toDelete.DataType.Should().Be("default");
                instanceDataMutator.RemoveDataElement(toDelete);
                await Task.CompletedTask;
            },
            Times.Exactly(1)
        );

        HttpClient client = GetRootedUserClient(_org, _app, 1337, _instanceOwnerPartyId, authenticationLevel: 2);

        // Update data element
        var updateDataElementContent = new ByteArrayContent(binaryData)
        {
            Headers =
            {
                ContentType = new MediaTypeHeaderValue("application/pdf"),
                ContentDisposition = new ContentDispositionHeaderValue("attachment") { FileName = "test.pdf" },
            },
        };

        var response = await client.PostAsync(
            $"/{_org}/{_app}/instances/{_instanceOwnerPartyId}/{_instanceGuid}/data/{binaryDataType}",
            updateDataElementContent
        );
        var responseAsString = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseAsString);
        response.Should().HaveStatusCode(HttpStatusCode.OK);

        var responseParsed = await VerifyStatusAndDeserialize<DataPostResponse>(response, HttpStatusCode.OK);

        responseParsed.Should().NotBeNull();

        responseParsed
            .Instance.Data.Should()
            .HaveCount(2)
            .And.AllSatisfy(d => d.DataType.Should().Be("specificFileType"));

        var dataGuid = responseParsed.NewDataElementId;
        dataGuid.Should().NotBeEmpty();

        // Verify stored data
        var (_, storedData) = storage.GetInstanceAndData(_instanceOwnerPartyId, _instanceGuid);
        var returnedBinary = storedData[dataGuid.ToString()];
        returnedBinary.Should().BeEquivalentTo(binaryData);

        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }

    private delegate Task ProcessDataWriterWriteDelegate(
        IInstanceDataMutator instanceDataMutator,
        DataElementChanges changes,
        string? language
    );

    private void RegisterProcessWriterDataWrite(string taskId, ProcessDataWriterWriteDelegate write, Times times)
    {
        _dataWriteProcessor
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<IInstanceDataMutator>(),
                    taskId,
                    It.IsAny<DataElementChanges>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(
                (IInstanceDataMutator instanceDataMutator, string _, DataElementChanges changes, string? language) =>
                    write(instanceDataMutator, changes, language)
            )
            .Verifiable(times);
    }

    private delegate Task ProcessDataReadDelegate(Instance instance, Guid dataId, object data, string? language);

    private void RegisterProcessDataRead(ProcessDataReadDelegate read, Times times)
    {
        _dataProcessor
            .Setup(p =>
                p.ProcessDataRead(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<object>(), It.IsAny<string?>())
            )
            .Returns(
                (Instance instance, Guid dataId, object data, string? language) =>
                    read(instance, dataId, data, language)
            )
            .Verifiable(times);
    }

    private delegate Task ProcessDataWriteDelegate(
        Instance instance,
        object data,
        object previousData,
        string? language
    );

    private void ProcessDataWrite(ProcessDataWriteDelegate write, Times times)
    {
        _dataProcessor
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<object>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(
                (Instance instance, Guid dataGuid, object data, object previousData, string? language) =>
                    write(instance, data, previousData, language)
            )
            .Verifiable(times);
    }

    private static StorageClientInterceptor CreateStorageInterceptorFromTestData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid
    )
    {
        var metadataJson = File.ReadAllText(TestData.GetApplicationMetadataPath(org, app));
        var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(metadataJson, JsonSerializerOptions)!;
        var storage = new StorageClientInterceptor(applicationMetadata);
        var instance = TestData.GetInstance(org, app, instanceOwnerPartyId, instanceGuid).GetAwaiter().GetResult();
        instance.Data = Directory
            .GetFiles(TestData.GetDataDirectory(org, app, instanceOwnerPartyId, instanceGuid), "*.json")
            .Where(file => !file.Contains(".pretest", StringComparison.Ordinal))
            .Select(file => JsonSerializer.Deserialize<DataElement>(File.ReadAllText(file), JsonSerializerOptions)!)
            .ToList();
        storage.AddInstance(instance);

        foreach (var dataElement in instance.Data)
        {
            var dataElementGuid = Guid.Parse(dataElement.Id);
            var blobPath = TestData.GetDataBlobPath(org, app, instanceOwnerPartyId, instanceGuid, dataElementGuid);
            if (File.Exists(blobPath))
            {
                storage.AddDataRaw(dataElementGuid, File.ReadAllBytes(blobPath));
            }
        }

        return storage;
    }

    private static void UseHttpStorageDataClient(IServiceCollection services)
    {
        services.RemoveAll<IStorageDataClient>();
        services.AddHttpClient<IStorageDataClient, StorageDataClient>();
    }

    private sealed class GuardProbeInstantiationProcessor(
        IDataClient dataClient,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Action<string> recordGuardException
    ) : IInstantiationProcessor
    {
        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
        {
            await Task.Yield();
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                dataClient.GetDataBytes(instanceOwnerPartyId, instanceGuid, Guid.NewGuid())
            );
            recordGuardException(exception.Message);
        }
    }
}
