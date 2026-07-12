using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using NewtonsoftJson = Newtonsoft.Json.JsonConvert;

namespace Altinn.App.Core.Tests.Internal.Data;

public sealed class InstanceDataUnitOfWorkTests
{
    [Fact]
    public async Task UpdateBinaryDataElement_RegistersUpdatedBinaryChange_AndReturnsUpdatedBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        BinaryDataChange updatedChange = setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBytes
        );

        ReadOnlyMemory<byte> currentBytes = await setup.DataMutator.GetBinaryData(setup.DataElement);
        Assert.True(currentBytes.Span.SequenceEqual(updatedBytes));

        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        BinaryDataChange change = Assert.Single(changes.BinaryDataChanges);
        Assert.Same(updatedChange, change);
        Assert.Equal(ChangeType.Updated, change.Type);
        Assert.Equal(setup.DataElement.Id, change.DataElement?.Id);
        Assert.Equal(setup.DataElement.ContentType, change.ContentType);
        Assert.Equal(setup.DataElement.Filename, change.FileName);
        Assert.True(change.CurrentBinaryData.Span.SequenceEqual(updatedBytes));
    }

    [Fact]
    public async Task Init_WhenInstanceHasRegisteredStorageMetadata_CapturesVersionMetadata()
    {
        StorageVersionMetadata metadata = new(InstanceVersion: 7, ProcessStateVersion: 3);

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}"""),
            metadata
        );

        Assert.Equal(7, setup.DataMutator.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(3, setup.DataMutator.StorageMetadata.Versions.ProcessStateVersion);
    }

    [Fact]
    public async Task Init_PreservesDataElementContentETagsOnInstanceSnapshot()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            dataElementCount: 2,
            contentETag: "\"etag-snapshot\"",
            lastContentETagEmpty: true
        );

        Assert.Equal("\"etag-snapshot\"", setup.DataMutator.Instance.Data[0].ContentEtag);
        Assert.Null(setup.DataMutator.Instance.Data[1].ContentEtag);
    }

    [Fact]
    public async Task GetPersistedBinaryData_SendsSnapshotContentETagAsIfMatch()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("content"u8.ToArray(), contentETag: DataETag(1));

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);

        var request = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get && request.RequestHeaders.IfMatch.Count > 0
        );
        Assert.Equal(DataETag(1), Assert.Single(request.RequestHeaders.IfMatch).ToString());
    }

    [Fact]
    public async Task GetPersistedBinaryData_WithoutSnapshotContentETag_DoesNotSendIfMatch()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("content"u8.ToArray(), withoutBlobVersion: true);

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);

        var request = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
        Assert.Empty(request.RequestHeaders.IfMatch);
    }

    [Fact]
    public async Task GetPersistedBinaryData_ResponseHeaderETagDoesNotConditionLaterWrite()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("content"u8.ToArray(), withoutBlobVersion: true);
        setup.Services.Storage.SetDataETag(Guid.Parse(setup.DataElement.Id), DataETag(1));

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);

        DataElement instanceDataElement = Assert.Single(
            setup.DataMutator.Instance.Data,
            dataElement => dataElement.Id == setup.DataElement.Id
        );
        Assert.Null(instanceDataElement.ContentEtag);
        var contentRead = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
        Assert.Empty(contentRead.RequestHeaders.IfMatch);
        Assert.Equal(DataETag(1), contentRead.ResponseHeaders.ETag?.ToString());

        setup.DataMutator.UpdateBinaryDataElement(
            instanceDataElement,
            instanceDataElement.ContentType!,
            "updated"u8.ToArray()
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Null(Assert.Single(mutation.UpdateDataElements).ExpectedCurrentBlobVersion);
    }

    [Fact]
    public async Task SaveChanges_WithoutSnapshotContentETag_OmitsExpectedCurrentBlobVersion()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("content"u8.ToArray(), withoutBlobVersion: true);
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Null(Assert.Single(mutation.UpdateDataElements).ExpectedCurrentBlobVersion);
    }

    [Fact]
    public async Task GetPersistedBinaryData_WithMalformedSnapshotContentETag_FailsBeforeSendingRequest()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            contentETag: "malformed-etag"
        );

        await Assert.ThrowsAsync<FormatException>(() => setup.DataMutator.GetPersistedBinaryData(setup.DataElement));

        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
    }

    [Fact]
    public async Task GetPersistedBinaryData_WhenSnapshotContentETagIsStale_ThrowsTypedConflictAndKeepsBaseline()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("content"u8.ToArray(), contentETag: DataETag(1));
        setup.Services.Storage.SetDataETag(Guid.Parse(setup.DataElement.Id), DataETag(2));

        DataElementContentConflictException exception = await Assert.ThrowsAsync<DataElementContentConflictException>(
            () =>
                setup.DataMutator.GetPersistedBinaryData(setup.DataElement)
        );

        Assert.Equal(setup.DataMutator.Instance.Id, exception.InstanceId);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), exception.DataElementId);
        Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(
            DataETag(1),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .ContentEtag
        );
    }

    [Fact]
    public async Task Init_ReturnsInactiveUnitOfWork()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Open_ActivatesGuardInCurrentExecutionContextUntilDispose()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        setup.DataMutator.Open();

        Assert.True(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        setup.DataMutator.Dispose();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Open_ActivatesGuardAtCallTimeBeforeReturnedTaskIsAwaited()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var initializer = setup.ServiceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var guard = setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>();
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        Task<InstanceDataUnitOfWork> openTask = initializer.Open(
            setup.DataMutator.Instance,
            setup.DataMutator.TaskId,
            setup.DataMutator.Language
        );

        Assert.True(guard.IsActive);
        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        await Task.Yield();

        InstanceDataUnitOfWork activeDataMutator = await openTask;

        Assert.NotSame(setup.DataMutator, activeDataMutator);
        Assert.True(guard.IsActive);
        activeDataMutator.Dispose();

        Assert.False(guard.IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Open_WhenCalledAfterAsyncBoundaryInHelper_DoesNotGuardOriginalCallerFlow()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var initializer = setup.ServiceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        InstanceDataUnitOfWork activeDataMutator = await OpenAfterAsyncBoundary(
            initializer,
            setup.DataMutator.Instance,
            setup.DataMutator.TaskId,
            setup.DataMutator.Language
        );

        Assert.NotSame(setup.DataMutator, activeDataMutator);
        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
        activeDataMutator.Dispose();
    }

    [Fact]
    public async Task Open_ReturnedUnitOfWorkOwnsGuardUntilDispose()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var initializer = setup.ServiceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var guard = setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>();
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        InstanceDataUnitOfWork activeDataMutator = await initializer.Open(
            setup.DataMutator.Instance,
            setup.DataMutator.TaskId,
            setup.DataMutator.Language
        );

        Assert.True(guard.IsActive);
        await AssertDirectDataClientThrows(dataClient, setup);

        await activeDataMutator.SaveChanges(activeDataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.True(guard.IsActive);
        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        activeDataMutator.Dispose();

        Assert.False(guard.IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Open_WhenInitializationFails_CleansUpCallerFlowActivation()
    {
        var services = new MockedServiceCollection();
        await using WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
        var guard = serviceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>();
        InvalidOperationException expectedException = new("metadata failed");
        var metadataSource = new TaskCompletionSource<ApplicationMetadata>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        services.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).Returns(metadataSource.Task);
        var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();

        Task<InstanceDataUnitOfWork> openTask = initializer.Open(CreateInstanceForOpenFailureTest(), null, null);

        Assert.True(guard.IsActive);
        metadataSource.SetException(expectedException);
        InvalidOperationException actualException = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await openTask
        );

        Assert.Same(expectedException, actualException);
        Assert.False(guard.IsActive);
    }

    [Fact]
    public async Task Open_WhenInitializationIsCanceled_CleansUpCallerFlowActivation()
    {
        var services = new MockedServiceCollection();
        await using WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
        var guard = serviceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>();
        using var cancellationTokenSource = new CancellationTokenSource();
        cancellationTokenSource.Cancel();
        var metadataSource = new TaskCompletionSource<ApplicationMetadata>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );
        services.Mock<IAppMetadata>().Setup(a => a.GetApplicationMetadata()).Returns(metadataSource.Task);
        var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();

        Task<InstanceDataUnitOfWork> openTask = initializer.Open(CreateInstanceForOpenFailureTest(), null, null);

        Assert.True(guard.IsActive);
        metadataSource.SetCanceled(cancellationTokenSource.Token);
        await Assert.ThrowsAsync<TaskCanceledException>(async () => await openTask);

        Assert.False(guard.IsActive);
    }

    [Fact]
    public async Task Open_GuardsPublicStorageClientsUntilDispose()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        await RunAppCallbackThatUsesDirectStorage(dataClient, setup);

        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        setup.DataMutator.Dispose();

        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Dispose_ClearsPublicStorageClientGuardWithoutSave()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        await AssertDirectDataClientThrows(dataClient, setup);

        setup.DataMutator.Dispose();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectStorageClientsDelegate(dataClient, instanceClient, setup, initialBytes);
    }

    [Fact]
    public async Task Dispose_IsIdempotentAndMakesUnitOfWorkUnusable()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.Dispose();
        setup.DataMutator.Dispose();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        Assert.Throws<ObjectDisposedException>(() => setup.DataMutator.Instance);
        Assert.Throws<ObjectDisposedException>(() =>
            setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, initialBytes)
        );
        Assert.Throws<ObjectDisposedException>(() => setup.DataMutator.LockDataElementsForDataType("payment"));
        await Assert.ThrowsAsync<ObjectDisposedException>(() => setup.DataMutator.GetBinaryData(setup.DataElement));
        await Assert.ThrowsAsync<ObjectDisposedException>(() =>
            setup.DataMutator.SaveChanges(new DataElementChanges([]))
        );
    }

    [Fact]
    public async Task LexicalBlockWithoutDispose_DoesNotClearPublicStorageClientGuard()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, activateForCurrentFlow: false);
        var dataClient = setup.ServiceProvider.GetRequiredService<IDataClient>();
        var instanceClient = setup.ServiceProvider.GetRequiredService<IInstanceClient>();

        {
            setup.DataMutator.Open();
        }

        Assert.True(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        await AssertDirectDataClientThrows(dataClient, setup);
        await AssertDirectInstanceClientThrows(instanceClient, setup);

        setup.DataMutator.Dispose();
        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
    }

    [Fact]
    public async Task RestoreStorageMetadata_ReplacesVersionsWithoutChangingInstanceContentETag()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );
        DataElement instanceDataElement = Assert.Single(
            setup.DataMutator.Instance.Data,
            dataElement => dataElement.Id == setup.DataElement.Id
        );
        instanceDataElement.ContentEtag = "\"etag-instance\"";
        var metadata = new StorageDataMetadata(new StorageVersionMetadata(InstanceVersion: 11, ProcessStateVersion: 5));

        setup.DataMutator.RestoreStorageMetadata(metadata);

        Assert.Equal(11, setup.DataMutator.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(5, setup.DataMutator.StorageMetadata.Versions.ProcessStateVersion);
        Assert.Equal("\"etag-instance\"", instanceDataElement.ContentEtag);
    }

    [Fact]
    public void StorageVersionMetadataMerge_WhenLowerVersionArrivesAfterHigherVersion_DoesNotRegress()
    {
        StorageVersionMetadata current = new(InstanceVersion: 12, ProcessStateVersion: 8);

        StorageVersionMetadata merged = current.Merge(new StorageVersionMetadata(InstanceVersion: 9));

        Assert.Equal(12, merged.InstanceVersion);
        Assert.Equal(8, merged.ProcessStateVersion);
    }

    [Fact]
    public async Task SaveChanges_PersistsUpdatedBinaryDataToStorage()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));

        ReadOnlyMemory<byte> savedBytes = await setup.DataMutator.GetBinaryData(setup.DataElement);
        Assert.True(savedBytes.Span.SequenceEqual(updatedBytes));
    }

    [Fact]
    public async Task SaveChanges_WhenAbandonIssuesExist_KeepsGuardActiveUntilDispose()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);
        setup.DataMutator.AbandonAllChanges([
            new ValidationIssue { Severity = ValidationIssueSeverity.Error, Description = "Stop" },
        ]);

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.SaveChanges(new DataElementChanges([]))
        );

        Assert.Contains("AbandonAllChanges", exception.Message, StringComparison.Ordinal);
        Assert.True(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);

        setup.DataMutator.Dispose();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
    }

    [Fact]
    public async Task SaveChanges_WhenInstanceHasNotBeenCreated_KeepsGuardActiveUntilDispose()
    {
        var appMetadata = new ApplicationMetadata($"{MockedServiceCollection.Org}/{MockedServiceCollection.App}")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "payment",
                    AllowedContentTypes = ["application/json"],
                    MaxCount = 1,
                    TaskId = "Task_1",
                },
            ],
        };
        var storageAccessGuard = new InstanceDataMutatorStorageAccessGuard();
        var dataMutator = new InstanceDataUnitOfWork(
            new Instance
            {
                AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                InstanceOwner = new InstanceOwner { PartyId = "123456" },
                Data = [],
            },
            Mock.Of<IStorageDataClient>(),
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            storageAccessGuard,
            taskId: null,
            language: null
        ).Open();

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataMutator.SaveChanges(new DataElementChanges([]))
        );

        Assert.Contains(
            "Cannot access instance data before it has been created",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.True(storageAccessGuard.IsActive);

        dataMutator.Dispose();

        Assert.False(storageAccessGuard.IsActive);
    }

    [Fact]
    public async Task SaveChanges_WhenAggregateMutationContentETagIsStale_ThrowsInstanceDataStaleException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] externalBytes = Encoding.UTF8.GetBytes("""{"status":"externally-updated"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            contentETag: DataETag(1)
        );
        setup.Services.Storage.AddDataRaw(Guid.Parse(setup.DataElement.Id), externalBytes);
        setup.Services.Storage.SetDataETag(Guid.Parse(setup.DataElement.Id), DataETag(2));

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        InstanceDataStaleException exception = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            setup.DataMutator.SaveChanges(changes)
        );

        var innerException = Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(HttpStatusCode.PreconditionFailed, innerException.Response.StatusCode);
        Assert.True(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);

        setup.DataMutator.Dispose();

        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
        byte[] actualBytes = await setup
            .ServiceProvider.GetRequiredService<IDataClient>()
            .GetDataBytes(setup.InstanceOwnerPartyId, setup.InstanceGuid, Guid.Parse(setup.DataElement.Id));
        Assert.True(actualBytes.AsSpan().SequenceEqual(externalBytes));
        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(externalBytes));
    }

    [Fact]
    public async Task SaveChanges_WhenProcessStateVersionIsStale_ThrowsInstanceDataStaleException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] newBytes = Encoding.UTF8.GetBytes("""{"status":"new"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 2)
        );

        setup.DataMutator.AddBinaryDataElement("payment", "application/json", "new-payment.json", newBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        InstanceDataStaleException exception = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            setup.DataMutator.SaveChanges(changes)
        );

        var innerException = Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(HttpStatusCode.PreconditionFailed, innerException.Response.StatusCode);
        Assert.Single(setup.DataMutator.Instance.Data);
    }

    [Fact]
    public async Task SaveChanges_WhenTaskBoundWriteReturnsNonPreconditionFailure_RethrowsSamePlatformException()
    {
        PlatformHttpException storageException = CreatePlatformException(HttpStatusCode.ServiceUnavailable);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(storageException);
        DataType dataType = CreateBinaryDataType("payment");
        using InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(dataClientMock, dataType);
        unitOfWork.AddBinaryDataElement(dataType.Id, "application/json", "payment.json", "content"u8.ToArray());

        PlatformHttpException actual = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Same(storageException, actual);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, actual.Response.StatusCode);
    }

    [Theory]
    [InlineData(LegacyTaskBoundWrite.Insert)]
    [InlineData(LegacyTaskBoundWrite.MetadataUpdate)]
    [InlineData(LegacyTaskBoundWrite.Delete)]
    public async Task SaveChanges_WhenLegacyTaskBoundWriteReturnsPreconditionFailed_ThrowsInstanceDataStaleException(
        LegacyTaskBoundWrite write
    )
    {
        PlatformHttpException storageException = CreatePlatformException(HttpStatusCode.PreconditionFailed);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        DataType currentUserDataType = CreateBinaryDataType("payment");
        DataType serviceOwnerDataType = CreateBinaryDataType("receipt");
        DataElement currentUserDataElement = CreateDataElement(currentUserDataType.Id);
        DataElement serviceOwnerDataElement = CreateDataElement(serviceOwnerDataType.Id);
        using InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(
            dataClientMock,
            [currentUserDataElement, serviceOwnerDataElement],
            currentUserDataType,
            serviceOwnerDataType
        );
        unitOfWork.OverrideAuthenticationMethod(serviceOwnerDataType, StorageAuthenticationMethod.ServiceOwner());

        switch (write)
        {
            case LegacyTaskBoundWrite.Insert:
                dataClientMock
                    .Setup(x =>
                        x.InsertBinaryDataWithStorageMetadata(
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<string?>(),
                            It.IsAny<Stream>(),
                            It.IsAny<string?>(),
                            It.IsAny<StorageAuthenticationMethod?>(),
                            It.IsAny<StorageWritePreconditions?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ThrowsAsync(storageException);
                AddLegacyCreatedElements(unitOfWork, currentUserDataType, serviceOwnerDataType);
                break;
            case LegacyTaskBoundWrite.MetadataUpdate:
                dataClientMock
                    .Setup(x =>
                        x.InsertBinaryDataWithStorageMetadata(
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<string?>(),
                            It.IsAny<Stream>(),
                            It.IsAny<string?>(),
                            It.IsAny<StorageAuthenticationMethod?>(),
                            It.IsAny<StorageWritePreconditions?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ReturnsAsync(() =>
                        new DataElementWithStorageMetadata(
                            CreateDataElement(currentUserDataType.Id),
                            StorageVersionMetadata.Empty
                        )
                    );
                dataClientMock
                    .Setup(x =>
                        x.UpdateDataElementWithStorageMetadata(
                            It.IsAny<Instance>(),
                            It.IsAny<DataElement>(),
                            It.IsAny<StorageAuthenticationMethod?>(),
                            It.IsAny<StorageWritePreconditions?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ThrowsAsync(storageException);
                AddLegacyCreatedElements(
                    unitOfWork,
                    currentUserDataType,
                    serviceOwnerDataType,
                    metadata: [new KeyValueEntry { Key = "source", Value = "test" }]
                );
                break;
            case LegacyTaskBoundWrite.Delete:
                dataClientMock
                    .Setup(x =>
                        x.DeleteDataWithStorageMetadata(
                            It.IsAny<int>(),
                            It.IsAny<Guid>(),
                            It.IsAny<Guid>(),
                            It.IsAny<bool>(),
                            It.IsAny<StorageAuthenticationMethod?>(),
                            It.IsAny<StorageWritePreconditions?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ThrowsAsync(storageException);
                unitOfWork.RemoveDataElement(currentUserDataElement);
                unitOfWork.RemoveDataElement(serviceOwnerDataElement);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(write), write, null);
        }

        InstanceDataStaleException actual = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Same(storageException, actual.InnerException);
    }

    [Theory]
    [InlineData(DerivedInstanceFieldWrite.PresentationTexts)]
    [InlineData(DerivedInstanceFieldWrite.DataValues)]
    public async Task SaveChanges_WhenLegacyDerivedInstanceFieldWriteReturnsPreconditionFailed_ThrowsInstanceDataStaleException(
        DerivedInstanceFieldWrite derivedFieldWrite
    )
    {
        PlatformHttpException storageException = CreatePlatformException(HttpStatusCode.PreconditionFailed);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        var instanceClientMock = new Mock<IStorageInstanceClient>(MockBehavior.Strict);
        if (derivedFieldWrite is DerivedInstanceFieldWrite.PresentationTexts)
        {
            instanceClientMock
                .Setup(x =>
                    x.UpdatePresentationTextsWithStorageMetadata(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<PresentationTexts>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<StorageWritePreconditions?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(storageException);
        }
        else
        {
            instanceClientMock
                .Setup(x =>
                    x.UpdateDataValuesWithStorageMetadata(
                        It.IsAny<int>(),
                        It.IsAny<Guid>(),
                        It.IsAny<DataValues>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<StorageWritePreconditions?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(storageException);
        }

        DataType currentUserDataType = CreateBinaryDataType("payment");
        DataType serviceOwnerDataType = CreateBinaryDataType("receipt");
        DataType formDataType = new()
        {
            Id = "form",
            TaskId = "Task_1",
            AppLogic = new ApplicationLogic { ClassRef = typeof(PaymentForm).FullName },
        };
        DataElement currentUserDataElement = CreateDataElement(currentUserDataType.Id);
        DataElement serviceOwnerDataElement = CreateDataElement(serviceOwnerDataType.Id);
        DataElement formDataElement = CreateDataElement(formDataType.Id);
        ApplicationMetadata appMetadata = CreateApplicationMetadata(
            currentUserDataType,
            serviceOwnerDataType,
            formDataType
        );
        DataField derivedField = new()
        {
            Id = "status",
            DataTypeId = formDataType.Id,
            Path = nameof(PaymentForm.Status),
        };
        if (derivedFieldWrite is DerivedInstanceFieldWrite.PresentationTexts)
        {
            appMetadata.PresentationFields = [derivedField];
        }
        else
        {
            appMetadata.DataFields = [derivedField];
        }
        using InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            instanceClientMock.Object,
            appMetadata,
            [currentUserDataElement, serviceOwnerDataElement, formDataElement]
        );
        unitOfWork.Instance.PresentationTexts = [];
        unitOfWork.Instance.DataValues = [];
        unitOfWork.SetFormData(
            formDataElement,
            FormDataWrapperFactory.Create(new PaymentForm { Status = "updated" }, formDataType, formDataElement)
        );
        unitOfWork.OverrideAuthenticationMethod(serviceOwnerDataType, StorageAuthenticationMethod.ServiceOwner());
        BinaryDataChange currentUserChange = unitOfWork.UpdateBinaryDataElement(
            currentUserDataElement,
            "application/json",
            "payment"u8.ToArray()
        );
        BinaryDataChange serviceOwnerChange = unitOfWork.UpdateBinaryDataElement(
            serviceOwnerDataElement,
            "application/json",
            "receipt"u8.ToArray()
        );
        var changes = new DataElementChanges([currentUserChange, serviceOwnerChange]);

        InstanceDataStaleException actual = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            unitOfWork.SaveChanges(changes)
        );

        Assert.Same(storageException, actual.InnerException);
    }

    [Fact]
    public async Task SaveChanges_WhenUpdatingDifferentDataElements_DoesNotSendInstanceVersionPrecondition()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] firstUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"first"}""");
        byte[] secondUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"second"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            dataElementCount: 2
        );

        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElements[0],
            setup.DataElements[0].ContentType!,
            firstUpdatedBytes
        );
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElements[1],
            setup.DataElements[1].ContentType!,
            secondUpdatedBytes
        );
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Equal("1", mutationRequest.RequestHeaders.GetValues("If-Process-State-Version-Match").Single());
        Assert.False(
            mutationRequest.RequestHeaders.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName)
        );
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Put && request.RequestUrl?.AbsolutePath.Contains("/data/") == true
        );

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElements[0].Id].AsSpan().SequenceEqual(firstUpdatedBytes));
        Assert.True(storedData[setup.DataElements[1].Id].AsSpan().SequenceEqual(secondUpdatedBytes));
    }

    [Fact]
    public async Task SaveChanges_CommitsMixedChangesInOneAggregateMutation()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] createdBytes = Encoding.UTF8.GetBytes("""{"status":"new"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            dataElementCount: 2
        );
        DataType formDataType = setup.Services.AddDataType<PaymentForm>(
            "payment-form",
            ["application/json"],
            taskId: "Task_1"
        );
        setup.Services.AppMetadata.DataFields =
        [
            new DataField
            {
                Id = "paymentStatus",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.Status),
            },
        ];
        setup.Services.AppMetadata.PresentationFields =
        [
            new DataField
            {
                Id = "customerName",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.CustomerName),
            },
        ];

        Guid formDataGuid = Guid.NewGuid();
        var formDataElement = new DataElement
        {
            Id = formDataGuid.ToString(),
            InstanceGuid = setup.InstanceGuid.ToString(),
            DataType = formDataType.Id,
            ContentType = "application/json",
            Filename = "payment-form.json",
        };
        setup.DataMutator.Instance.Data.Add(formDataElement);
        setup
            .Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid)
            .instance.Data.Add(formDataElement);
        setup.Services.Storage.AddDataRaw(
            formDataGuid,
            JsonSerializer.SerializeToUtf8Bytes(new PaymentForm { Status = "created", CustomerName = "Old Name" }),
            DataETag(1)
        );

        var form = (PaymentForm)await setup.DataMutator.GetFormData(formDataElement);
        form.Status = "paid";
        form.CustomerName = "New Name";
        BinaryDataChange createdChange = setup.DataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "new-payment.json",
            createdBytes
        );
        setup.DataMutator.RemoveDataElement(setup.DataElements[1]);

        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"createDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"updateDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"deleteDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains(
            "\"dataValues\":{\"paymentStatus\":\"paid\"}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.Contains(
            "\"presentationTexts\":{\"customerName\":\"New Name\"}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.False(
            mutationRequest.RequestHeaders.Contains(StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName)
        );

        Assert.NotNull(createdChange.DataElement);
        Assert.DoesNotContain(
            setup.DataMutator.Instance.Data,
            dataElement => dataElement.Id == setup.DataElements[1].Id
        );
        Assert.Equal("paid", setup.DataMutator.Instance.DataValues["paymentStatus"]);
        Assert.Equal("New Name", setup.DataMutator.Instance.PresentationTexts["customerName"]);

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[createdChange.DataElement.Id].AsSpan().SequenceEqual(createdBytes));
        Assert.DoesNotContain(setup.DataElements[1].Id, storedData.Keys);
        Assert.Contains("paid", Encoding.UTF8.GetString(storedData[formDataElement.Id]), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SaveChanges_MapsMultipleCreatedDataElementsUsingCreatedDataElementIdsOrder()
    {
        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        Guid firstCreatedDataElementId = Guid.NewGuid();
        Guid secondCreatedDataElementId = Guid.NewGuid();
        byte[] firstBytes = Encoding.UTF8.GetBytes("""{"status":"first"}""");
        byte[] secondBytes = Encoding.UTF8.GetBytes("""{"status":"second"}""");
        StorageInstanceMutationRequest? capturedMutation = null;
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    StorageInstanceMutationCreateDataElement firstCreate = mutation.CreateDataElements[0];
                    StorageInstanceMutationCreateDataElement secondCreate = mutation.CreateDataElements[1];
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                            Data =
                            [
                                CreatePersistedDataElement(secondCreate, secondCreatedDataElementId, contentParts),
                                CreatePersistedDataElement(firstCreate, firstCreatedDataElementId, contentParts),
                            ],
                        },
                        StorageVersionMetadata.Empty,
                        [firstCreatedDataElementId, secondCreatedDataElementId]
                    );
                }
            );

        var appMetadata = new ApplicationMetadata($"{MockedServiceCollection.Org}/{MockedServiceCollection.App}")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "payment",
                    AllowedContentTypes = ["application/json"],
                    TaskId = "Task_1",
                },
            ],
        };
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Data = [],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        using var dataMutator = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );

        BinaryDataChange firstChange = dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "first.json",
            firstBytes
        );
        BinaryDataChange secondChange = dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "second.json",
            secondBytes
        );
        Guid firstStagedDataElementId = firstChange.DataElementIdentifier.Guid;
        Guid secondStagedDataElementId = secondChange.DataElementIdentifier.Guid;

        await dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(2, capturedMutation?.CreateDataElements.Count);
        Assert.Equal("create-0", capturedMutation?.CreateDataElements[0].ContentPartName);
        Assert.Equal("create-1", capturedMutation?.CreateDataElements[1].ContentPartName);
        Guid expectedFirstChangeDataElementId =
            capturedMutation?.CreateDataElements[0].Filename == "first.json"
                ? firstCreatedDataElementId
                : secondCreatedDataElementId;
        Guid expectedSecondChangeDataElementId =
            capturedMutation?.CreateDataElements[0].Filename == "second.json"
                ? firstCreatedDataElementId
                : secondCreatedDataElementId;
        Assert.Equal(expectedFirstChangeDataElementId.ToString(), firstChange.DataElement?.Id);
        Assert.Equal(expectedSecondChangeDataElementId.ToString(), secondChange.DataElement?.Id);
        Assert.NotEqual(firstStagedDataElementId.ToString(), firstChange.DataElement?.Id);
        Assert.NotEqual(secondStagedDataElementId.ToString(), secondChange.DataElement?.Id);
    }

    [Fact]
    public async Task SaveChanges_WhenCreatedDataElementIdsCountDoesNotMatchCreatedChanges_Throws()
    {
        using InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
            (instanceOwnerPartyId, instanceGuid, mutation, contentParts) =>
            {
                StorageInstanceMutationCreateDataElement create = Assert.Single(mutation.CreateDataElements);
                Guid createdDataElementId = Guid.NewGuid();
                return new InstanceMutationWithStorageMetadata(
                    CreateAggregateCreateResultInstance(
                        instanceOwnerPartyId,
                        instanceGuid,
                        [CreatePersistedDataElement(create, createdDataElementId, contentParts)]
                    ),
                    StorageVersionMetadata.Empty,
                    []
                );
            }
        );
        dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "created.json",
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains("contained 0 created data element ids", exception.Message, StringComparison.Ordinal);
        Assert.Contains("but 1 creates were requested", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SaveChanges_WhenCreatedDataElementIdsContainDuplicates_Throws()
    {
        using InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
            (instanceOwnerPartyId, instanceGuid, mutation, contentParts) =>
            {
                Guid duplicatedDataElementId = Guid.NewGuid();
                return new InstanceMutationWithStorageMetadata(
                    CreateAggregateCreateResultInstance(
                        instanceOwnerPartyId,
                        instanceGuid,
                        [
                            CreatePersistedDataElement(
                                mutation.CreateDataElements[0],
                                duplicatedDataElementId,
                                contentParts
                            ),
                        ]
                    ),
                    StorageVersionMetadata.Empty,
                    [duplicatedDataElementId, duplicatedDataElementId]
                );
            }
        );
        dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "first.json",
            Encoding.UTF8.GetBytes("""{"status":"first"}""")
        );
        dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "second.json",
            Encoding.UTF8.GetBytes("""{"status":"second"}""")
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains("duplicate created data element ids", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SaveChanges_WhenCreatedDataElementIdIsMissingFromReturnedInstanceSnapshot_Throws()
    {
        Guid missingDataElementId = Guid.NewGuid();
        using InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
            (instanceOwnerPartyId, instanceGuid, mutation, contentParts) =>
                new InstanceMutationWithStorageMetadata(
                    CreateAggregateCreateResultInstance(instanceOwnerPartyId, instanceGuid, []),
                    StorageVersionMetadata.Empty,
                    [missingDataElementId]
                )
        );
        dataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "created.json",
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataMutator.SaveChanges(dataMutator.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains(
            $"Storage mutation response did not contain created data element {missingDataElementId}",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task SaveChanges_WhenDerivedInstanceFieldsBecomeNull_RemovesThemThroughAggregateMutation()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            contentETag: DataETag(1)
        );
        DataType formDataType = setup.Services.AddDataType<PaymentForm>(
            "payment-form",
            ["application/json"],
            taskId: "Task_1"
        );
        setup.Services.AppMetadata.DataFields =
        [
            new DataField
            {
                Id = "paymentStatus",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.Status),
            },
        ];
        setup.Services.AppMetadata.PresentationFields =
        [
            new DataField
            {
                Id = "customerName",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.CustomerName),
            },
        ];

        setup.DataMutator.Instance.DataValues = new Dictionary<string, string?> { ["paymentStatus"] = "created" };
        setup.DataMutator.Instance.PresentationTexts = new Dictionary<string, string?>
        {
            ["customerName"] = "Old Name",
        };
        var (storageInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storageInstance.DataValues = new Dictionary<string, string?> { ["paymentStatus"] = "created" };
        storageInstance.PresentationTexts = new Dictionary<string, string?> { ["customerName"] = "Old Name" };

        Guid formDataGuid = Guid.NewGuid();
        var formDataElement = new DataElement
        {
            Id = formDataGuid.ToString(),
            InstanceGuid = setup.InstanceGuid.ToString(),
            DataType = formDataType.Id,
            ContentType = "application/json",
            Filename = "payment-form.json",
        };
        setup.DataMutator.Instance.Data.Add(formDataElement);
        storageInstance.Data.Add(formDataElement);
        setup.Services.Storage.AddDataRaw(
            formDataGuid,
            JsonSerializer.SerializeToUtf8Bytes(new PaymentForm { Status = "created", CustomerName = "Old Name" })
        );

        var form = (PaymentForm)await setup.DataMutator.GetFormData(formDataElement);
        form.Status = null;
        form.CustomerName = null;
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains(
            "\"dataValues\":{\"paymentStatus\":null}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.Contains(
            "\"presentationTexts\":{\"customerName\":null}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.DoesNotContain("paymentStatus", setup.DataMutator.Instance.DataValues.Keys);
        Assert.DoesNotContain("customerName", setup.DataMutator.Instance.PresentationTexts.Keys);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_CommitsDataAndProcessStateWithWorkflowPreconditions()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"workflow-updated"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            contentETag: DataETag(1)
        );

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = setup.DataMutator.Instance.Process,
            NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            Events = [new InstanceEvent { EventType = "process_StartTask" }],
        };
        setup.DataMutator.StageProcessStateChange(processStateChange);

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            changes,
            "workflow-save-key",
            CancellationToken.None
        );

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal("7", mutationRequest.RequestHeaders.GetValues("If-Instance-Version-Match").Single());
        Assert.Equal("3", mutationRequest.RequestHeaders.GetValues("If-Process-State-Version-Match").Single());
        Assert.Equal("workflow-save-key", mutationRequest.RequestHeaders.GetValues("Idempotency-Key").Single());
        Assert.Contains("\"processState\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Equal(DataETag(1), Assert.Single(mutation.UpdateDataElements).ExpectedCurrentBlobVersion);
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get && request.RequestHeaders.IfMatch.Count > 0
        );
        Assert.Equal("Task_2", setup.DataMutator.Instance.Process.CurrentTask?.ElementId);
        Assert.True(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));

        setup.DataMutator.Dispose();
        Assert.False(setup.ServiceProvider.GetRequiredService<IInstanceDataMutatorStorageAccessGuard>().IsActive);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenStorageReturnsPreconditionFailed_ThrowsPlatformHttpException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"workflow-updated"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            contentETag: DataETag(1)
        );
        setup.Services.Storage.SetDataETag(Guid.Parse(setup.DataElement.Id), DataETag(2));
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        PlatformHttpException exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            setup.DataMutator.SaveWorkflowOwnedAggregate(changes, "stale-workflow-save", CancellationToken.None)
        );

        Assert.IsNotType<InstanceDataStaleException>(exception);
        Assert.Equal(HttpStatusCode.PreconditionFailed, exception.Response.StatusCode);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenNoMutationsAndNoInstanceVersion_ReturnsNothingToSave()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            changes,
            "empty-callback-key",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, outcome);
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_CommitsDerivedInstanceFieldOnlyMutation()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true
        );
        DataType formDataType = setup.Services.AddDataType<PaymentForm>(
            "payment-form",
            ["application/json"],
            taskId: "Task_1"
        );
        setup.Services.AppMetadata.DataFields =
        [
            new DataField
            {
                Id = "paymentStatus",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.Status),
            },
        ];
        setup.Services.AppMetadata.PresentationFields =
        [
            new DataField
            {
                Id = "customerName",
                DataTypeId = formDataType.Id,
                Path = nameof(PaymentForm.CustomerName),
            },
        ];

        setup.DataMutator.Instance.DataValues = new Dictionary<string, string?> { ["paymentStatus"] = "created" };
        setup.DataMutator.Instance.PresentationTexts = new Dictionary<string, string?>
        {
            ["customerName"] = "Old Name",
        };
        var (storageInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storageInstance.DataValues = new Dictionary<string, string?> { ["paymentStatus"] = "created" };
        storageInstance.PresentationTexts = new Dictionary<string, string?> { ["customerName"] = "Old Name" };

        Guid formDataGuid = Guid.NewGuid();
        var formDataElement = new DataElement
        {
            Id = formDataGuid.ToString(),
            InstanceGuid = setup.InstanceGuid.ToString(),
            DataType = formDataType.Id,
            ContentType = "application/json",
            Filename = "payment-form.json",
        };
        setup.DataMutator.Instance.Data.Add(formDataElement);
        storageInstance.Data.Add(formDataElement);
        var (serializedFormData, _) = setup
            .ServiceProvider.GetRequiredService<ModelSerializationService>()
            .SerializeToStorage(
                new PaymentForm { Status = "paid", CustomerName = "New Name" },
                formDataType,
                formDataElement
            );
        setup.Services.Storage.AddDataRaw(formDataGuid, serializedFormData.ToArray());

        _ = await setup.DataMutator.GetFormData(formDataElement);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        Assert.Empty(changes.AllChanges);

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            changes,
            "workflow-derived-fields-key",
            CancellationToken.None
        );

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Contains(
            "\"dataValues\":{\"paymentStatus\":\"paid\"}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.Contains(
            "\"presentationTexts\":{\"customerName\":\"New Name\"}",
            mutationRequest.RequestBody,
            StringComparison.Ordinal
        );
        Assert.Contains("\"createDataElements\":[]", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"updateDataElements\":[]", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"deleteDataElements\":[]", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Equal("paid", setup.DataMutator.Instance.DataValues["paymentStatus"]);
        Assert.Equal("New Name", setup.DataMutator.Instance.PresentationTexts["customerName"]);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_CommitsStagedProcessStateAndLockStatus()
    {
        const int instanceOwnerPartyId = 1337;
        Guid instanceGuid = Guid.NewGuid();
        Guid dataElementId = Guid.NewGuid();
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "task-data",
            ContentType = "application/json",
        };
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [dataElement],
        };
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8)
        );
        var appMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes = [new DataType { Id = "task-data", TaskId = "Task_1" }],
        };
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        StorageWritePreconditions? capturedPreconditions = null;
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? preconditions,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    capturedPreconditions = preconditions;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = mutation.ProcessState?.State,
                            Data =
                            [
                                new DataElement
                                {
                                    Id = dataElement.Id,
                                    InstanceGuid = dataElement.InstanceGuid,
                                    DataType = dataElement.DataType,
                                    ContentType = dataElement.ContentType,
                                    Locked = true,
                                },
                            ],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );
        using var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = instance.Process,
            NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            Events = [new InstanceEvent { EventType = "process_StartTask" }],
        };

        unitOfWork.LockDataElementsForDataType("task-data");
        unitOfWork.StageProcessStateChange(processStateChange);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "callback-step-id",
            CancellationToken.None
        );

        Assert.Equal("Task_2", capturedMutation?.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Single(capturedMutation?.ProcessState?.Events ?? []);
        StorageInstanceMutationUpdateDataElement update = Assert.Single(capturedMutation?.UpdateDataElements ?? []);
        Assert.Equal(dataElementId, update.DataElementId);
        Assert.True(update.Locked);
        Assert.Equal(12, capturedPreconditions?.InstanceVersion);
        Assert.Equal(8, capturedPreconditions?.ProcessStateVersion);
        Assert.Equal("callback-step-id", capturedPreconditions?.IdempotencyKey);
        Assert.Equal(13, unitOfWork.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(9, unitOfWork.StorageMetadata.Versions.ProcessStateVersion);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        WorkflowAggregateSaveOutcome secondOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "callback-step-id-after-save",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, secondOutcome);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_CommitsDataOnlyMutationWithoutStagedProcessState()
    {
        const int instanceOwnerPartyId = 1337;
        Guid instanceGuid = Guid.NewGuid();
        Guid dataElementId = Guid.NewGuid();
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"updated"}""");
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "task-data",
            ContentType = "application/json",
            Filename = "task-data.json",
        };
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [dataElement],
        };
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8)
        );
        var appMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "task-data",
                    TaskId = "Task_1",
                    AllowedContentTypes = ["application/json"],
                },
            ],
        };
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = instance.Process,
                            Data = [dataElement],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 8)
                    );
                }
            );
        using var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );

        unitOfWork.PreloadBinaryData(dataElement, initialBytes);
        unitOfWork.UpdateBinaryDataElement(dataElement, dataElement.ContentType!, updatedBytes);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "callback-step-id",
            CancellationToken.None
        );

        Assert.Null(capturedMutation?.ProcessState);
        StorageInstanceMutationUpdateDataElement update = Assert.Single(capturedMutation?.UpdateDataElements ?? []);
        Assert.Equal(dataElementId, update.DataElementId);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        WorkflowAggregateSaveOutcome secondOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "callback-step-id-after-save",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, secondOutcome);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_CommitsStagedInstanceDeletion()
    {
        const int instanceOwnerPartyId = 1337;
        Guid instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState { Ended = DateTime.UtcNow, EndEvent = "EndEvent_1" },
            Status = new InstanceStatus(),
            Data = [],
        };
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8)
        );
        var appMetadata = new ApplicationMetadata(instance.AppId) { DataTypes = [] };
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        StorageWritePreconditions? capturedPreconditions = null;
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? preconditions,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    capturedPreconditions = preconditions;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = instance.Process,
                            Status = new InstanceStatus
                            {
                                IsHardDeleted = true,
                                IsSoftDeleted = true,
                                HardDeleted = DateTime.UtcNow,
                                SoftDeleted = DateTime.UtcNow,
                            },
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 8)
                    );
                }
            );
        using var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: null,
            language: null
        );

        unitOfWork.StageInstanceDeletion();
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "callback-delete-step-id",
            CancellationToken.None
        );

        Assert.NotNull(capturedMutation?.DeleteInstance);
        Assert.True(capturedMutation.DeleteInstance.Hard);
        Assert.Empty(capturedMutation.CreateDataElements);
        Assert.Empty(capturedMutation.UpdateDataElements);
        Assert.Empty(capturedMutation.DeleteDataElements);
        Assert.Equal(12, capturedPreconditions?.InstanceVersion);
        Assert.Equal(8, capturedPreconditions?.ProcessStateVersion);
        Assert.Equal("callback-delete-step-id", capturedPreconditions?.IdempotencyKey);
        Assert.True(unitOfWork.Instance.Status.IsHardDeleted);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        WorkflowAggregateSaveOutcome secondOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "callback-delete-step-id-after-save",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, secondOutcome);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenStorageResponseIsReplayed_RebuildsFromStorageAndThrows()
    {
        const int instanceOwnerPartyId = 1337;
        Guid instanceGuid = Guid.NewGuid();
        Guid authoritativeDataElementId = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [],
        };
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3)
        );
        var appMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "payment",
                    TaskId = "Task_1",
                    AllowedContentTypes = ["application/json"],
                },
            ],
        };
        var authoritativeInstance = new Instance
        {
            Id = instance.Id,
            AppId = instance.AppId,
            Org = instance.Org,
            InstanceOwner = instance.InstanceOwner,
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            Data =
            [
                new DataElement
                {
                    Id = authoritativeDataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "payment",
                    ContentType = "application/json",
                    Filename = "attempt-one.json",
                    ContentEtag = "\"etag-replay\"",
                },
            ],
        };
        InstanceStorageMetadataRegistry.Set(
            authoritativeInstance,
            new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4)
        );
        var replayedResponseInstance = new Instance
        {
            Id = authoritativeInstance.Id,
            AppId = authoritativeInstance.AppId,
            Org = authoritativeInstance.Org,
            InstanceOwner = authoritativeInstance.InstanceOwner,
            Process = authoritativeInstance.Process,
            Data =
            [
                new DataElement
                {
                    Id = authoritativeDataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "payment",
                    ContentType = "application/json",
                    Filename = "attempt-one.json",
                    ContentEtag = "\"etag-replayed-response\"",
                },
            ],
        };
        authoritativeInstance.Data[0].ContentEtag = "\"etag-fresh-instance\"";
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceMutationWithStorageMetadata(
                    replayedResponseInstance,
                    new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4),
                    [authoritativeDataElementId],
                    replayed: true
                )
            );
        var instanceClientMock = new Mock<IStorageInstanceClient>(MockBehavior.Strict);
        instanceClientMock
            .Setup(x =>
                x.GetInstanceWithStorageMetadata(
                    "test-app",
                    "ttd",
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceWithStorageMetadata(
                    authoritativeInstance,
                    new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4)
                )
            );
        using var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            instanceClientMock.Object,
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );
        BinaryDataChange createdChange = unitOfWork.AddBinaryDataElement(
            "payment",
            "application/json",
            "attempt-two.json",
            Encoding.UTF8.GetBytes("""{"status":"attempt-two"}""")
        );
        Guid stagedDataElementId = createdChange.DataElementIdentifier.Guid;
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = instance.Process,
            NewProcessState = authoritativeInstance.Process,
            Events = [new InstanceEvent { EventType = "process_StartTask" }],
        };
        unitOfWork.StageProcessStateChange(processStateChange);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        await Assert.ThrowsAsync<InstanceMutationReplayedException>(() =>
            unitOfWork.SaveWorkflowOwnedAggregate(changes, "callback-step-id", CancellationToken.None)
        );

        Assert.Equal(authoritativeDataElementId.ToString(), Assert.Single(unitOfWork.Instance.Data).Id);
        Assert.Equal("Task_2", unitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(8, unitOfWork.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(4, unitOfWork.StorageMetadata.Versions.ProcessStateVersion);
        Assert.Equal("\"etag-fresh-instance\"", Assert.Single(unitOfWork.Instance.Data).ContentEtag);
        Assert.Equal(stagedDataElementId.ToString(), createdChange.DataElement?.Id);
        WorkflowAggregateSaveOutcome replayRebuildOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "callback-step-id-after-replay",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, replayRebuildOutcome);
    }

    [Fact]
    public async Task SaveChanges_WhenStorageReturnsNewETag_RefreshesInstanceDataElement()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            contentETag: DataETag(1)
        );
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(
            DataETag(2),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .ContentEtag
        );
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
    }

    [Fact]
    public async Task SaveChanges_WhenChangesUseMixedAuthenticationMethods_FallsBackToLegacyFanOut()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] firstUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"first"}""");
        byte[] secondUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"second"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            otherDataTypeElementCount: 1,
            contentETag: DataETag(1)
        );
        DataType serviceOwnerDataType = setup.DataMutator.DataTypes.Single(dataType => dataType.Id == "receipt");
        DataElement receiptDataElement = setup.DataElements.Single(dataElement => dataElement.DataType == "receipt");
        setup.DataMutator.OverrideAuthenticationMethod(
            serviceOwnerDataType,
            StorageAuthenticationMethod.ServiceOwner()
        );

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, firstUpdatedBytes);
        setup.DataMutator.UpdateBinaryDataElement(
            receiptDataElement,
            receiptDataElement.ContentType!,
            secondUpdatedBytes
        );
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Equal(
            2,
            setup.Services.Storage.RequestsResponses.Count(request =>
                request.RequestMethod == HttpMethod.Put && request.RequestUrl?.AbsolutePath.Contains("/data/") == true
            )
        );
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
        var updateRequests = setup
            .Services.Storage.RequestsResponses.Where(request => request.RequestMethod == HttpMethod.Put)
            .ToDictionary(request => request.RequestUrl!.Segments[^1].TrimEnd('/'));
        Assert.Equal(
            DataETag(1),
            Assert.Single(updateRequests[setup.DataElement.Id].RequestHeaders.IfMatch).ToString()
        );
        Assert.Equal(
            DataETag(1),
            Assert.Single(updateRequests[receiptDataElement.Id].RequestHeaders.IfMatch).ToString()
        );

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(firstUpdatedBytes));
        Assert.True(storedData[receiptDataElement.Id].AsSpan().SequenceEqual(secondUpdatedBytes));
    }

    [Fact]
    public async Task SaveChanges_LegacyFanOutRefreshesInstanceContentEtagAndConditionsSecondWrite()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(ProcessStateVersion: 1),
            otherDataTypeElementCount: 1,
            contentETag: DataETag(1)
        );
        DataType serviceOwnerDataType = setup.DataMutator.DataTypes.Single(dataType => dataType.Id == "receipt");
        DataElement receiptDataElement = setup.DataElements.Single(dataElement => dataElement.DataType == "receipt");
        setup.DataMutator.OverrideAuthenticationMethod(
            serviceOwnerDataType,
            StorageAuthenticationMethod.ServiceOwner()
        );

        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "first"u8.ToArray()
        );
        setup.DataMutator.UpdateBinaryDataElement(
            receiptDataElement,
            receiptDataElement.ContentType!,
            "first receipt"u8.ToArray()
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.All(setup.DataMutator.Instance.Data, dataElement => Assert.Equal(DataETag(2), dataElement.ContentEtag));
        setup.Services.Storage.RequestsResponses.Clear();

        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "second"u8.ToArray()
        );
        setup.DataMutator.UpdateBinaryDataElement(
            receiptDataElement,
            receiptDataElement.ContentType!,
            "second receipt"u8.ToArray()
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var secondWrite = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Put
                && request.RequestUrl?.AbsolutePath.EndsWith($"/data/{setup.DataElement.Id}", StringComparison.Ordinal)
                    == true
        );
        Assert.Equal(DataETag(2), Assert.Single(secondWrite.RequestHeaders.IfMatch).ToString());
        Assert.Equal(
            DataETag(3),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .ContentEtag
        );
    }

    [Fact]
    public async Task SaveChanges_LegacyFormFanOutRefreshesInstanceContentEtagAndConditionsSecondWrite()
    {
        var services = new MockedServiceCollection();
        DataType formDataType = services.AddDataType<PaymentForm>("form", ["application/json"], taskId: "Task_1");
        var serviceOwnerDataType = new DataType
        {
            Id = "receipt",
            AllowedContentTypes = ["application/json"],
            MaxCount = 1,
            TaskId = "Task_1",
        };
        services.AddDataType(serviceOwnerDataType);

        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        Guid formDataGuid = Guid.NewGuid();
        Guid receiptDataGuid = Guid.NewGuid();
        var formDataIdentifier = new DataElementIdentifier(formDataGuid.ToString());
        var receiptDataIdentifier = new DataElementIdentifier(receiptDataGuid.ToString());
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data =
            [
                new DataElement
                {
                    Id = formDataGuid.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = formDataType.Id,
                    ContentType = "application/json",
                    ContentEtag = DataETag(1),
                },
                new DataElement
                {
                    Id = receiptDataGuid.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = serviceOwnerDataType.Id,
                    ContentType = "application/json",
                    ContentEtag = DataETag(1),
                },
            ],
        };
        services.Storage.AddInstance(instance);
        services.Storage.AddDataRaw(
            formDataGuid,
            JsonSerializer.SerializeToUtf8Bytes(new PaymentForm { Status = "initial" }),
            DataETag(1)
        );
        services.Storage.AddDataRaw(receiptDataGuid, "initial receipt"u8.ToArray(), DataETag(1));

        await using WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
        var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        Instance instanceCopy = JsonSerializer.Deserialize<Instance>(JsonSerializer.SerializeToUtf8Bytes(instance))!;
        using InstanceDataUnitOfWork unitOfWork = await initializer.Init(instanceCopy, "Task_1", language: null);
        unitOfWork.Open();
        unitOfWork.OverrideAuthenticationMethod(serviceOwnerDataType, StorageAuthenticationMethod.ServiceOwner());
        var formData = Assert.IsType<PaymentForm>(await unitOfWork.GetFormData(formDataIdentifier));

        formData.Status = "first";
        unitOfWork.UpdateBinaryDataElement(receiptDataIdentifier, "application/json", "first receipt"u8.ToArray());
        await unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(DataETag(2), unitOfWork.GetDataElement(formDataIdentifier).ContentEtag);
        services.Storage.RequestsResponses.Clear();

        formData.Status = "second";
        unitOfWork.UpdateBinaryDataElement(receiptDataIdentifier, "application/json", "second receipt"u8.ToArray());
        await unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        var secondFormWrite = Assert.Single(
            services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Put
                && request.RequestUrl?.AbsolutePath.EndsWith($"/data/{formDataGuid}", StringComparison.Ordinal) == true
        );
        Assert.Equal(DataETag(2), Assert.Single(secondFormWrite.RequestHeaders.IfMatch).ToString());
        Assert.Equal(DataETag(3), unitOfWork.GetDataElement(formDataIdentifier).ContentEtag);
    }

    [Fact]
    public async Task SaveChanges_LegacyFanOutWithoutSnapshotContentEtagOmitsIfMatch()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(ProcessStateVersion: 1),
            otherDataTypeElementCount: 1,
            withoutBlobVersion: true
        );
        DataType serviceOwnerDataType = setup.DataMutator.DataTypes.Single(dataType => dataType.Id == "receipt");
        DataElement receiptDataElement = setup.DataElements.Single(dataElement => dataElement.DataType == "receipt");
        setup.DataMutator.OverrideAuthenticationMethod(
            serviceOwnerDataType,
            StorageAuthenticationMethod.ServiceOwner()
        );
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );
        setup.DataMutator.UpdateBinaryDataElement(
            receiptDataElement,
            receiptDataElement.ContentType!,
            "updated receipt"u8.ToArray()
        );

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var writes = setup.Services.Storage.RequestsResponses.Where(request =>
            request.RequestMethod == HttpMethod.Put && request.RequestUrl?.AbsolutePath.Contains("/data/") == true
        );
        Assert.Equal(2, writes.Count());
        Assert.All(writes, write => Assert.Empty(write.RequestHeaders.IfMatch));
        Assert.All(setup.DataMutator.Instance.Data, dataElement => Assert.Equal(DataETag(1), dataElement.ContentEtag));
    }

    [Fact]
    public async Task SaveChanges_LegacyFanOutNullResponseBodyContentEtagOmitsNextIfMatch()
    {
        DataType currentUserDataType = CreateBinaryDataType("payment");
        DataType serviceOwnerDataType = CreateBinaryDataType("receipt");
        DataElement currentUserDataElement = CreateDataElement(currentUserDataType.Id);
        DataElement serviceOwnerDataElement = CreateDataElement(serviceOwnerDataType.Id);
        currentUserDataElement.ContentEtag = DataETag(1);
        serviceOwnerDataElement.ContentEtag = DataETag(1);
        var currentUserPreconditions = new List<StorageWritePreconditions?>();
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        dataClientMock
            .Setup(x =>
                x.UpdateBinaryDataWithStorageMetadata(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Stream>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    InstanceIdentifier _,
                    string? contentType,
                    string? filename,
                    Guid dataGuid,
                    Stream _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? preconditions,
                    CancellationToken _
                ) =>
                {
                    bool isCurrentUserElement = dataGuid == Guid.Parse(currentUserDataElement.Id);
                    if (isCurrentUserElement)
                    {
                        currentUserPreconditions.Add(preconditions);
                    }

                    return new DataElementWithStorageMetadata(
                        new DataElement
                        {
                            Id = dataGuid.ToString(),
                            DataType = isCurrentUserElement ? currentUserDataType.Id : serviceOwnerDataType.Id,
                            ContentType = contentType,
                            Filename = filename,
                            ContentEtag = isCurrentUserElement ? null : DataETag(2),
                        },
                        StorageVersionMetadata.Empty
                    );
                }
            );
        using InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(
            dataClientMock,
            [currentUserDataElement, serviceOwnerDataElement],
            currentUserDataType,
            serviceOwnerDataType
        );
        unitOfWork.OverrideAuthenticationMethod(serviceOwnerDataType, StorageAuthenticationMethod.ServiceOwner());

        unitOfWork.UpdateBinaryDataElement(currentUserDataElement, "application/json", "first"u8.ToArray());
        unitOfWork.UpdateBinaryDataElement(serviceOwnerDataElement, "application/json", "first receipt"u8.ToArray());
        await unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Null(unitOfWork.GetDataElement(currentUserDataElement).ContentEtag);

        unitOfWork.UpdateBinaryDataElement(currentUserDataElement, "application/json", "second"u8.ToArray());
        unitOfWork.UpdateBinaryDataElement(serviceOwnerDataElement, "application/json", "second receipt"u8.ToArray());
        await unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(2, currentUserPreconditions.Count);
        Assert.Equal(DataETag(1), currentUserPreconditions[0]?.ContentETag);
        Assert.Null(currentUserPreconditions[1]?.ContentETag);
    }

    [Fact]
    public async Task SaveChanges_WhenLegacyPutContentETagIsStale_ThrowsInstanceDataStaleException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"updated"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            otherDataTypeElementCount: 1,
            contentETag: DataETag(1)
        );
        DataType serviceOwnerDataType = setup.DataMutator.DataTypes.Single(dataType => dataType.Id == "receipt");
        DataElement receiptDataElement = setup.DataElements.Single(dataElement => dataElement.DataType == "receipt");
        setup.DataMutator.OverrideAuthenticationMethod(
            serviceOwnerDataType,
            StorageAuthenticationMethod.ServiceOwner()
        );
        setup.Services.Storage.SetDataETag(Guid.Parse(setup.DataElement.Id), DataETag(2));
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        setup.DataMutator.UpdateBinaryDataElement(receiptDataElement, receiptDataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        InstanceDataStaleException exception = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            setup.DataMutator.SaveChanges(changes)
        );

        var innerException = Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(HttpStatusCode.PreconditionFailed, innerException.Response.StatusCode);
    }

    [Fact]
    public async Task SaveChanges_WhenMixedAuthenticationMethodsIncludeDeleteWithoutLockStatus_FallsBackToLegacyFanOut()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"updated"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1)
        );
        var serviceOwnerDataType = new DataType
        {
            Id = "receipt",
            AllowedContentTypes = ["application/json"],
            MaxCount = 1,
            TaskId = "Task_1",
        };
        setup.Services.AddDataType(serviceOwnerDataType);

        Guid receiptDataGuid = Guid.NewGuid();
        var receiptDataElement = new DataElement
        {
            Id = receiptDataGuid.ToString(),
            InstanceGuid = setup.InstanceGuid.ToString(),
            DataType = serviceOwnerDataType.Id,
            ContentType = "application/json",
            Filename = "receipt.json",
        };
        setup.DataMutator.Instance.Data.Add(receiptDataElement);
        setup
            .Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid)
            .instance.Data.Add(receiptDataElement);
        setup.Services.Storage.AddDataRaw(receiptDataGuid, initialBytes);
        setup.DataMutator.OverrideAuthenticationMethod(
            serviceOwnerDataType,
            StorageAuthenticationMethod.ServiceOwner()
        );

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        setup.DataMutator.RemoveDataElement(receiptDataElement);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Put && request.RequestUrl?.AbsolutePath.Contains("/data/") == true
        );
        Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Delete
                && request.RequestUrl?.AbsolutePath.Contains($"/data/{receiptDataElement.Id}", StringComparison.Ordinal)
                    == true
        );

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));
        Assert.DoesNotContain(receiptDataElement.Id, storedData.Keys);
    }

    [Fact]
    public async Task LockDataElementsForDataType_ForExistingDataElements_CommitsLockOnlyAggregateUpdates()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}"""),
            dataElementCount: 2,
            otherDataTypeElementCount: 1
        );

        setup.DataMutator.LockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"updateDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"contentPartName\":\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.All(
            setup.DataMutator.Instance.Data.Where(dataElement => dataElement.DataType == "payment"),
            dataElement => Assert.True(dataElement.Locked)
        );
        Assert.All(
            setup.DataMutator.Instance.Data.Where(dataElement => dataElement.DataType == "receipt"),
            dataElement => Assert.False(dataElement.Locked)
        );
    }

    [Fact]
    public async Task UnlockDataElementsForDataType_ForExistingDataElements_CommitsUnlockOnlyAggregateUpdates()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}"""),
            dataElementCount: 2,
            otherDataTypeElementCount: 1,
            locked: true
        );

        setup.DataMutator.UnlockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"updateDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"locked\":false", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"contentPartName\":\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.All(
            setup.DataMutator.Instance.Data.Where(dataElement => dataElement.DataType == "payment"),
            dataElement => Assert.False(dataElement.Locked)
        );
        Assert.All(
            setup.DataMutator.Instance.Data.Where(dataElement => dataElement.DataType == "receipt"),
            dataElement => Assert.True(dataElement.Locked)
        );
    }

    [Fact]
    public async Task LockDataElementsForDataType_WithContentUpdate_MergesLockedIntoSameAggregateUpdate()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        setup.DataMutator.LockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"contentPartName\":\"update-", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.True(setup.DataMutator.Instance.Data.Single(d => d.Id == setup.DataElement.Id).Locked);

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));
    }

    [Fact]
    public async Task LockDataElementsForDataType_ForPendingCreatedDataElement_CommitsLockedOnAggregateCreate()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] createdBytes = Encoding.UTF8.GetBytes("""{"status":"new"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        BinaryDataChange createdChange = setup.DataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "new-payment.json",
            createdBytes
        );
        Assert.NotNull(createdChange.DataElement);
        Assert.DoesNotContain(
            setup.DataMutator.Instance.Data,
            dataElement => dataElement.Id == createdChange.DataElement.Id
        );

        setup.DataMutator.LockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"createDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        AssertCreateDataElementsDoNotContainDataElementId(mutationRequest.RequestBody!);
        Assert.Contains("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.NotNull(createdChange.DataElement);
        Assert.True(createdChange.DataElement.Locked);
    }

    [Fact]
    public async Task LockDataElementsForDataType_BeforeCreate_CommitsLockedOnAggregateCreate()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] createdBytes = Encoding.UTF8.GetBytes("""{"status":"new"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.LockDataElementsForDataType("payment");
        BinaryDataChange createdChange = setup.DataMutator.AddBinaryDataElement(
            "payment",
            "application/json",
            "new-payment.json",
            createdBytes
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"createDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        AssertCreateDataElementsDoNotContainDataElementId(mutationRequest.RequestBody!);
        Assert.Contains("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.NotNull(createdChange.DataElement);
        Assert.True(createdChange.DataElement.Locked);
    }

    [Fact]
    public async Task LockDataElementsForDataType_WhenCalledMultipleTimes_CommitsFinalValue()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );
        setup.DataMutator.Instance.Data.Single(d => d.Id == setup.DataElement.Id).Locked = true;

        setup.DataMutator.LockDataElementsForDataType("payment");
        setup.DataMutator.UnlockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"locked\":false", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.False(setup.DataMutator.Instance.Data.Single(d => d.Id == setup.DataElement.Id).Locked);
    }

    [Fact]
    public async Task LockDataElementsForDataType_WhenDataElementIsDeleted_IgnoresDeletedElement()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );

        setup.DataMutator.RemoveDataElement(setup.DataElement);
        setup.DataMutator.LockDataElementsForDataType("payment");
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"deleteDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemoveDataElement_AfterLockingDataType_CommitsDeleteWithoutLockUpdate()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}""")
        );

        setup.DataMutator.LockDataElementsForDataType("payment");
        setup.DataMutator.RemoveDataElement(setup.DataElement);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"deleteDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"locked\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id);
    }

    [Fact]
    public async Task RemoveDataElement_AfterUnlockingDataType_CommitsDeleteWithIgnoreLock()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}"""),
            locked: true
        );

        setup.DataMutator.UnlockDataElementsForDataType("payment");
        setup.DataMutator.RemoveDataElement(setup.DataElement);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        Assert.Contains("\"deleteDataElements\"", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.Contains("\"ignoreLock\":true", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain("\"locked\":false", mutationRequest.RequestBody, StringComparison.Ordinal);
        Assert.DoesNotContain(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id);
    }

    [Fact]
    public async Task UpdateBinaryDataElement_WithoutExistingBlobVersion_CreatesBlobVersionMetadata()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, withoutBlobVersion: true);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.ProcessStateVersion);
        Assert.Equal(
            DataETag(1),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .ContentEtag
        );
    }

    [Fact]
    public async Task AddBinaryDataElement_RefreshesVersionsFromStorageMutation()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] newBytes = Encoding.UTF8.GetBytes("""{"status":"new"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.AddBinaryDataElement("payment", "application/json", "new-payment.json", newBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.ProcessStateVersion);
    }

    [Fact]
    public async Task RemoveDataElement_RefreshesVersionsAndRemovesElementFromInstanceSnapshot()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);
        setup.DataMutator.RemoveDataElement(setup.DataElement);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageMetadata.Versions.ProcessStateVersion);
        Assert.DoesNotContain(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id);
    }

    [Fact]
    public async Task VerifyDataElementsUnchangedSincePreviousChanges_AfterSavingUpdatedBinaryData_DoesNotThrow()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        setup.DataMutator.VerifyDataElementsUnchangedSincePreviousChanges(changes);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterUpdatingBinaryData_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSavingUpdatedBinaryData_WhenPreviouslyLoaded_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task RemoveDataElement_AfterUpdatingBinaryData_ReplacesPendingUpdateWithDeletion()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        setup.DataMutator.RemoveDataElement(setup.DataElement);

        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        BinaryDataChange change = Assert.Single(changes.BinaryDataChanges);
        Assert.Equal(ChangeType.Deleted, change.Type);
        Assert.Equal(setup.DataElement.Id, change.DataElement?.Id);
        Assert.Equal(ReadOnlyMemory<byte>.Empty, change.CurrentBinaryData);
    }

    [Fact]
    public async Task UpdateBinaryDataElement_WhenMarkedForDeletion_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.RemoveDataElement(setup.DataElement);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes)
        );
        Assert.Contains("marked for deletion", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateBinaryDataElement_WhenContentTypeDoesNotMatch_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, "text/plain", updatedBytes)
        );
        Assert.Contains("cannot be updated", exception.Message, StringComparison.Ordinal);
    }

    private static PlatformHttpException CreatePlatformException(HttpStatusCode statusCode) =>
        new(new HttpResponseMessage(statusCode), $"Storage returned {(int)statusCode}");

    private static string DataETag(int contentVersion) => StorageClientInterceptor.CreateDataETag(contentVersion);

    private static StorageInstanceMutationRequest DeserializeMutationRequest(string multipartRequestBody)
    {
        const string mutationStart = "{\"createDataElements\"";
        int start = multipartRequestBody.IndexOf(mutationStart, StringComparison.Ordinal);
        Assert.True(start >= 0, "Mutation JSON part was not found in the multipart request body.");
        int end = multipartRequestBody.IndexOf("\r\n--", start, StringComparison.Ordinal);
        Assert.True(end > start, "Mutation JSON part was not terminated by a multipart boundary.");
        return NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(multipartRequestBody[start..end])!;
    }

    private static DataType CreateBinaryDataType(string id) =>
        new()
        {
            Id = id,
            TaskId = "Task_1",
            AllowedContentTypes = ["application/json"],
        };

    private static DataElement CreateDataElement(string dataType) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = dataType,
            ContentType = "application/json",
        };

    private static void AddLegacyCreatedElements(
        InstanceDataUnitOfWork unitOfWork,
        DataType currentUserDataType,
        DataType serviceOwnerDataType,
        List<KeyValueEntry>? metadata = null
    )
    {
        unitOfWork.AddBinaryDataElement(
            currentUserDataType.Id,
            "application/json",
            "payment.json",
            "payment"u8.ToArray(),
            metadata: metadata
        );
        unitOfWork.AddBinaryDataElement(
            serviceOwnerDataType.Id,
            "application/json",
            "receipt.json",
            "receipt"u8.ToArray()
        );
    }

    private static ApplicationMetadata CreateApplicationMetadata(params DataType[] dataTypes) =>
        new($"{MockedServiceCollection.Org}/{MockedServiceCollection.App}") { DataTypes = [.. dataTypes] };

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        Mock<IStorageDataClient> dataClientMock,
        params DataType[] dataTypes
    ) =>
        CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            CreateApplicationMetadata(dataTypes),
            []
        );

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        Mock<IStorageDataClient> dataClientMock,
        IReadOnlyList<DataElement> dataElements,
        params DataType[] dataTypes
    ) =>
        CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            CreateApplicationMetadata(dataTypes),
            dataElements
        );

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        IStorageDataClient dataClient,
        IStorageInstanceClient instanceClient,
        ApplicationMetadata appMetadata,
        IReadOnlyList<DataElement> dataElements
    )
    {
        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        foreach (DataElement dataElement in dataElements)
        {
            dataElement.InstanceGuid = instanceGuid.ToString();
        }

        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = appMetadata.Id,
            Org = MockedServiceCollection.Org,
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Data = [.. dataElements],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        return new InstanceDataUnitOfWork(
            instance,
            dataClient,
            instanceClient,
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );
    }

    private static DataElement CreatePersistedDataElement(
        StorageInstanceMutationCreateDataElement create,
        Guid dataElementId,
        IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts
    )
    {
        StorageInstanceMutationContent content = contentParts[create.ContentPartName];
        return new DataElement
        {
            Id = dataElementId.ToString(),
            DataType = create.DataType,
            ContentType = create.ContentType ?? content.ContentType,
            Filename = create.Filename ?? content.Filename,
            Size = content.Bytes.Length,
            Locked = create.Locked ?? false,
        };
    }

    private static void AssertCreateDataElementsDoNotContainDataElementId(string requestBody)
    {
        int createDataElementsIndex = requestBody.IndexOf("\"createDataElements\"", StringComparison.Ordinal);
        Assert.NotEqual(-1, createDataElementsIndex);
        int updateDataElementsIndex = requestBody.IndexOf(
            "\"updateDataElements\"",
            createDataElementsIndex,
            StringComparison.Ordinal
        );
        Assert.NotEqual(-1, updateDataElementsIndex);
        string createDataElementsSegment = requestBody[createDataElementsIndex..updateDataElementsIndex];
        Assert.DoesNotContain("\"dataElementId\"", createDataElementsSegment, StringComparison.Ordinal);
    }

    private static InstanceDataUnitOfWork CreateAggregateCreateValidationUnitOfWork(
        Func<
            int,
            Guid,
            StorageInstanceMutationRequest,
            IReadOnlyDictionary<string, StorageInstanceMutationContent>,
            InstanceMutationWithStorageMetadata
        > createResult
    )
    {
        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        dataClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int ownerPartyId,
                    Guid savedInstanceGuid,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> contentParts,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) => createResult(ownerPartyId, savedInstanceGuid, mutation, contentParts)
            );

        var appMetadata = new ApplicationMetadata($"{MockedServiceCollection.Org}/{MockedServiceCollection.App}")
        {
            DataTypes =
            [
                new DataType
                {
                    Id = "payment",
                    AllowedContentTypes = ["application/json"],
                    TaskId = "Task_1",
                },
            ],
        };
        var instance = new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Data = [],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

        return new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: "Task_1",
            language: null
        );
    }

    private static Instance CreateAggregateCreateResultInstance(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        List<DataElement> dataElements
    ) =>
        new()
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
            Data = dataElements,
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private sealed class PaymentForm
    {
        public string? Status { get; set; }

        public string? CustomerName { get; set; }
    }

    public enum DerivedInstanceFieldWrite
    {
        PresentationTexts,
        DataValues,
    }

    public enum LegacyTaskBoundWrite
    {
        Insert,
        MetadataUpdate,
        Delete,
    }

    private static async Task RunAppCallbackThatUsesDirectStorage(
        IDataClient dataClient,
        BinaryDataUnitOfWorkSetup setup
    )
    {
        await Task.Yield();
        await AssertDirectDataClientThrows(dataClient, setup);
    }

    private static async Task<InstanceDataUnitOfWork> OpenAfterAsyncBoundary(
        InstanceDataUnitOfWorkInitializer initializer,
        Instance instance,
        string? taskId,
        string? language
    )
    {
        await Task.Yield();
        return await initializer.Open(instance, taskId, language);
    }

    private static Instance CreateInstanceForOpenFailureTest()
    {
        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        return new Instance
        {
            Id = $"{instanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
            InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
        };
    }

    private static async Task AssertDirectDataClientThrows(IDataClient dataClient, BinaryDataUnitOfWorkSetup setup)
    {
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataClient.GetDataBytes(setup.InstanceOwnerPartyId, setup.InstanceGuid, Guid.Parse(setup.DataElement.Id))
        );

        Assert.Contains(
            "Direct IDataClient Storage access is not allowed",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("InstanceDataUnitOfWork", exception.Message, StringComparison.Ordinal);
        Assert.Contains("outside the unit of work", exception.Message, StringComparison.Ordinal);
    }

    private static async Task AssertDirectInstanceClientThrows(
        IInstanceClient instanceClient,
        BinaryDataUnitOfWorkSetup setup
    )
    {
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            instanceClient.GetInstance(
                MockedServiceCollection.App,
                MockedServiceCollection.Org,
                setup.InstanceOwnerPartyId,
                setup.InstanceGuid
            )
        );

        Assert.Contains(
            "Direct IInstanceClient Storage access is not allowed",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("InstanceDataUnitOfWork", exception.Message, StringComparison.Ordinal);
        Assert.Contains("outside the unit of work", exception.Message, StringComparison.Ordinal);
    }

    private static async Task AssertDirectStorageClientsDelegate(
        IDataClient dataClient,
        IInstanceClient instanceClient,
        BinaryDataUnitOfWorkSetup setup,
        byte[] expectedBytes
    )
    {
        byte[] actualBytes = await dataClient.GetDataBytes(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid,
            Guid.Parse(setup.DataElement.Id)
        );
        Assert.True(actualBytes.AsSpan().SequenceEqual(expectedBytes));

        Instance actualInstance = await instanceClient.GetInstance(
            MockedServiceCollection.App,
            MockedServiceCollection.Org,
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.Equal($"{setup.InstanceOwnerPartyId}/{setup.InstanceGuid}", actualInstance.Id);
    }

    private sealed class BinaryDataUnitOfWorkSetup : IAsyncDisposable
    {
        public required MockedServiceCollection Services { get; init; }
        public required WrappedServiceProvider ServiceProvider { get; init; }
        public required InstanceDataUnitOfWork DataMutator { get; init; }
        public required DataElement DataElement { get; init; }
        public required IReadOnlyList<DataElement> DataElements { get; init; }
        public required int InstanceOwnerPartyId { get; init; }
        public required Guid InstanceGuid { get; init; }

        public static Task<BinaryDataUnitOfWorkSetup> Create(
            byte[] initialBytes,
            StorageVersionMetadata? storageVersionMetadata = null,
            int dataElementCount = 1,
            bool seedStorageVersions = false,
            bool activateForCurrentFlow = true,
            int otherDataTypeElementCount = 0,
            bool locked = false,
            string? contentETag = null,
            bool lastContentETagEmpty = false,
            bool withoutBlobVersion = false
        )
        {
            var services = new MockedServiceCollection();
            const string taskId = "Task_1";
            const string dataTypeId = "payment";
            const string contentType = "application/json";
            const string fileName = "payment.json";
            const int instanceOwnerPartyId = 123456;
            Guid instanceGuid = Guid.NewGuid();
            var dataElements = new List<DataElement>();

            services.AddDataType(
                new DataType
                {
                    Id = dataTypeId,
                    AllowedContentTypes = [contentType],
                    MaxCount = 1,
                    TaskId = taskId,
                }
            );
            services.AddDataType(
                new DataType
                {
                    Id = "receipt",
                    AllowedContentTypes = [contentType],
                    MaxCount = 1,
                    TaskId = taskId,
                }
            );

            for (int i = 0; i < dataElementCount; i++)
            {
                Guid dataGuid = Guid.NewGuid();
                dataElements.Add(
                    new DataElement
                    {
                        Id = dataGuid.ToString(),
                        InstanceGuid = instanceGuid.ToString(),
                        DataType = dataTypeId,
                        ContentType = contentType,
                        Filename = i == 0 ? fileName : $"payment-{i}.json",
                        Locked = locked,
                        ContentEtag = lastContentETagEmpty && i == dataElementCount - 1 ? string.Empty : contentETag,
                    }
                );
            }
            for (int i = 0; i < otherDataTypeElementCount; i++)
            {
                Guid dataGuid = Guid.NewGuid();
                dataElements.Add(
                    new DataElement
                    {
                        Id = dataGuid.ToString(),
                        InstanceGuid = instanceGuid.ToString(),
                        DataType = "receipt",
                        ContentType = contentType,
                        Filename = i == 0 ? "receipt.json" : $"receipt-{i}.json",
                        Locked = locked,
                        ContentEtag = contentETag,
                    }
                );
            }

            var instance = new Instance
            {
                Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                Data = [.. dataElements],
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            };

            services.Storage.AddInstance(instance);
            for (int i = 0; i < dataElements.Count; i++)
            {
                DataElement dataElement = dataElements[i];
                if (withoutBlobVersion || (lastContentETagEmpty && i == dataElementCount - 1))
                {
                    services.Storage.AddDataRawWithoutBlobVersion(Guid.Parse(dataElement.Id), initialBytes);
                }
                else
                {
                    services.Storage.AddDataRaw(Guid.Parse(dataElement.Id), initialBytes, dataElement.ContentEtag);
                }
            }

            WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
            var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
            Instance instanceCopy = JsonSerializer.Deserialize<Instance>(
                JsonSerializer.SerializeToUtf8Bytes(instance)
            )!;
            if (storageVersionMetadata is not null)
            {
                InstanceStorageMetadataRegistry.Set(instanceCopy, storageVersionMetadata);
            }

            if (storageVersionMetadata is not null && seedStorageVersions)
            {
                services.Storage.SetStorageVersions(
                    instanceOwnerPartyId,
                    instanceGuid,
                    storageVersionMetadata.InstanceVersion ?? 1,
                    storageVersionMetadata.ProcessStateVersion ?? 1
                );
            }
            InstanceDataUnitOfWork dataMutator = initializer
                .Init(instanceCopy, taskId, language: null)
                .GetAwaiter()
                .GetResult();
            if (activateForCurrentFlow)
            {
                dataMutator.Open();
            }

            return Task.FromResult(
                new BinaryDataUnitOfWorkSetup
                {
                    Services = services,
                    ServiceProvider = serviceProvider,
                    DataMutator = dataMutator,
                    DataElement = dataElements[0],
                    DataElements = dataElements,
                    InstanceOwnerPartyId = instanceOwnerPartyId,
                    InstanceGuid = instanceGuid,
                }
            );
        }

        public async ValueTask DisposeAsync()
        {
            DataMutator.Dispose();
            await ServiceProvider.DisposeAsync();
        }
    }
}
