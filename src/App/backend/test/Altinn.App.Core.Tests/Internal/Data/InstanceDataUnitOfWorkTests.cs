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
using RequestResponse = Altinn.App.Tests.Common.Mocks.StorageClientInterceptor.RequestResponse;

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
    public async Task Init_WithStorageVersions_CapturesProvidedSnapshot()
    {
        StorageVersionMetadata metadata = new(InstanceVersion: 7, ProcessStateVersion: 3);

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            Encoding.UTF8.GetBytes("""{"status":"created"}"""),
            metadata
        );

        Assert.Equal(7, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(3, setup.DataMutator.StorageVersions.ProcessStateVersion);
    }

    [Fact]
    public async Task Init_PreservesDataElementBlobVersionIdsOnInstanceSnapshot()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            dataElementCount: 2,
            blobVersionId: "blob-version-snapshot",
            lastBlobVersionIdEmpty: true
        );

        Assert.Equal("blob-version-snapshot", setup.DataMutator.Instance.Data[0].BlobVersionId);
        Assert.Null(setup.DataMutator.Instance.Data[1].BlobVersionId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(ProcessStatus.Idle)]
    public async Task SaveChanges_WhenProcessStatusIsIdleOrAbsent_AllowsMutationWithoutExplicitExpectedStatus(
        string? processStatus
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.Instance.Process!.Status = processStatus;
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Null(mutation.ExpectedProcessStatus);
        Assert.Null(mutation.ProcessState);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    [InlineData("future-status")]
    [InlineData("Idle")]
    [InlineData(" idle")]
    public async Task SaveChanges_WhenProcessStatusIsNotCanonicalIdle_ThrowsBeforeStorageMutation(string processStatus)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.Instance.Process!.Status = processStatus;
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains(processStatus, exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
    }

    [Fact]
    public async Task GetPersistedBinaryData_SendsSnapshotBlobVersionIdAsIfMatch()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            blobVersionId: BlobVersion(1)
        );

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);

        var request = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get && request.RequestHeaders.IfMatch.Count > 0
        );
        Assert.Equal(DataETag(1), Assert.Single(request.RequestHeaders.IfMatch).ToString());
    }

    [Fact]
    public async Task GetPersistedBinaryData_WithoutSnapshotBlobVersionId_DoesNotSendIfMatch()
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
        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(1));

        await setup.DataMutator.GetPersistedBinaryData(setup.DataElement);

        DataElement instanceDataElement = Assert.Single(
            setup.DataMutator.Instance.Data,
            dataElement => dataElement.Id == setup.DataElement.Id
        );
        Assert.Null(instanceDataElement.BlobVersionId);
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
    public async Task SaveChanges_WithoutSnapshotBlobVersionId_OmitsExpectedCurrentBlobVersion()
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
    public async Task GetPersistedBinaryData_WithSnapshotBlobVersionIdStorageRejects_SendsQuotedIfMatchAndSurfacesStorageError()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            blobVersionId: "not!a!blob!version!id!"
        );

        PlatformHttpException exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            setup.DataMutator.GetPersistedBinaryData(setup.DataElement)
        );

        Assert.Equal(HttpStatusCode.BadRequest, exception.Response.StatusCode);
        var request = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
        Assert.Equal("\"not!a!blob!version!id!\"", Assert.Single(request.RequestHeaders.IfMatch).ToString());
    }

    [Fact]
    public async Task GetPersistedBinaryData_WhenSnapshotBlobVersionIdIsStale_ThrowsTypedConflictAndKeepsBaseline()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "content"u8.ToArray(),
            blobVersionId: BlobVersion(1)
        );
        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(2));

        DataElementContentConflictException exception = await Assert.ThrowsAsync<DataElementContentConflictException>(
            () =>
                setup.DataMutator.GetPersistedBinaryData(setup.DataElement)
        );

        Assert.Equal(setup.DataMutator.Instance.Id, exception.InstanceId);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), exception.DataElementId);
        Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(
            BlobVersion(1),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .BlobVersionId
        );
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
    public async Task SaveChanges_WhenAbandonIssuesExist_Throws()
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
    }

    [Fact]
    public async Task SaveChanges_WhenInstanceHasNotBeenCreated_Throws()
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
        var dataClient = new Mock<IDataClient>();
        Mock<IDataClientWithStorageMetadata> metadataClient = dataClient.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClient = dataClient.As<IInstanceMutationClient>();
        var dataMutator = new InstanceDataUnitOfWork(
            new Instance
            {
                AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                InstanceOwner = new InstanceOwner { PartyId = "123456" },
                Data = [],
            },
            StorageVersionMetadata.Empty,
            metadataClient.Object,
            mutationClient.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            dataMutator.SaveChanges(new DataElementChanges([]))
        );

        Assert.Contains(
            "Cannot access instance data before it has been created",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task SaveChanges_WhenAggregateMutationBlobVersionIdIsStale_ThrowsInstanceDataStaleException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] externalBytes = Encoding.UTF8.GetBytes("""{"status":"externally-updated"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            blobVersionId: BlobVersion(1)
        );
        setup.Services.Storage.AddDataRaw(Guid.Parse(setup.DataElement.Id), externalBytes);
        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(2));

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        InstanceDataStaleException exception = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            setup.DataMutator.SaveChanges(changes)
        );

        var innerException = Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(HttpStatusCode.PreconditionFailed, innerException.Response.StatusCode);
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
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
        InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(dataClientMock, dataType);
        unitOfWork.AddBinaryDataElement(dataType.Id, "application/json", "payment.json", "content"u8.ToArray());

        PlatformHttpException actual = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            unitOfWork.SaveChanges(unitOfWork.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Same(storageException, actual);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, actual.Response.StatusCode);
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
    public async Task SaveChanges_WhenUntouchedCachedFormChangesConcurrently_EvictsBothCachesAndDoesNotReportPhantomChange()
    {
        byte[] initialBinaryBytes = """{"status":"created"}"""u8.ToArray();
        byte[] updatedBinaryBytes = """{"status":"paid"}"""u8.ToArray();
        var initialForm = new PaymentForm { Status = "created", CustomerName = "Original" };
        var concurrentForm = new PaymentForm { Status = "external", CustomerName = "Concurrent" };

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBinaryBytes,
            blobVersionId: BlobVersion(1)
        );
        DataElement formDataElement = AddPersistedPaymentForm(setup, initialForm, blobVersionId: BlobVersion(1));
        var cachedForm = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));
        byte[] concurrentBytes = SerializePaymentForm(setup, formDataElement, concurrentForm);

        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBinaryBytes
        );
        DataElementChanges savedChanges = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        DataElementChange savedChange = Assert.Single(savedChanges.AllChanges);
        Assert.Equal(setup.DataElement.Id, savedChange.DataElementIdentifier.Id);
        setup.Services.Storage.AddDataRaw(Guid.Parse(formDataElement.Id), concurrentBytes, BlobVersion(2));

        await setup.DataMutator.SaveChanges(savedChanges);

        DataElementChanges changesAfterSave = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        DataElementChange ownChange = Assert.Single(changesAfterSave.AllChanges);
        Assert.Equal(setup.DataElement.Id, ownChange.DataElementIdentifier.Id);

        ReadOnlyMemory<byte> refreshedBytes = await setup.DataMutator.GetBinaryData(formDataElement);
        var refreshedForm = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));

        Assert.True(refreshedBytes.Span.SequenceEqual(concurrentBytes));
        Assert.NotSame(cachedForm, refreshedForm);
        Assert.Equal(concurrentForm.Status, refreshedForm.Status);
        Assert.Equal(concurrentForm.CustomerName, refreshedForm.CustomerName);
        RequestResponse[] formDataRequests = GetDataRequests(setup, formDataElement);
        Assert.Equal(2, formDataRequests.Length);
        Assert.Contains(
            formDataRequests,
            request => Assert.Single(request.RequestHeaders.IfMatch).ToString() == DataETag(2)
        );
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenCachedFormIsAbsentFromResponse_DoesNotRestoreDerivedFieldOnLaterSave()
    {
        const string derivedFieldId = "paymentStatus";
        const string cachedStatus = "cached";
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            """{"status":"existing"}"""u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = cachedStatus },
            blobVersionId: BlobVersion(1)
        );
        setup.Services.AppMetadata.DataFields =
        [
            new DataField
            {
                Id = derivedFieldId,
                DataTypeId = formDataElement.DataType,
                Path = nameof(PaymentForm.Status),
            },
        ];
        setup.DataMutator.Instance.DataValues = new Dictionary<string, string?> { [derivedFieldId] = cachedStatus };
        setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid).instance.DataValues =
        [];
        _ = await setup.DataMutator.GetFormData(formDataElement);
        setup.DataMutator.RemoveDataElement(formDataElement);

        WorkflowAggregateSaveOutcome firstOutcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "delete-cached-form",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, firstOutcome);
        Assert.DoesNotContain(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == formDataElement.Id);
        Assert.DoesNotContain(derivedFieldId, setup.DataMutator.Instance.DataValues.Keys);
        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
            mutationRequest.RequestBody!
        )!;
        Assert.Empty(mutation.DataValues);
        Assert.Equal(Guid.Parse(formDataElement.Id), Assert.Single(mutation.DeleteDataElements).DataElementId);

        WorkflowAggregateSaveOutcome secondOutcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            new DataElementChanges([]),
            "after-cached-form-deletion",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, secondOutcome);
        Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
    }

    [Fact]
    public async Task SaveChanges_WhenUntouchedCachedFormBlobVersionIsUnchanged_RetainsBothCachesWithoutRefetch()
    {
        byte[] initialBinaryBytes = """{"status":"created"}"""u8.ToArray();
        byte[] updatedBinaryBytes = """{"status":"paid"}"""u8.ToArray();
        var initialForm = new PaymentForm { Status = "created", CustomerName = "Original" };

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBinaryBytes,
            blobVersionId: BlobVersion(1)
        );
        DataElement formDataElement = AddPersistedPaymentForm(setup, initialForm, blobVersionId: BlobVersion(1));
        var cachedForm = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));
        byte[] serializedInitialForm = SerializePaymentForm(setup, formDataElement, initialForm);

        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBinaryBytes
        );
        DataElementChanges savedChanges = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        DataElementChange savedChange = Assert.Single(savedChanges.AllChanges);
        Assert.Equal(setup.DataElement.Id, savedChange.DataElementIdentifier.Id);

        await setup.DataMutator.SaveChanges(savedChanges);

        ReadOnlyMemory<byte> cachedBytes = await setup.DataMutator.GetBinaryData(formDataElement);
        var formAfterSave = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));

        Assert.True(cachedBytes.Span.SequenceEqual(serializedInitialForm));
        Assert.Same(cachedForm, formAfterSave);
        Assert.Single(GetDataRequests(setup, formDataElement));
    }

    [Fact]
    public async Task SaveChanges_WhenOwnFormIsUpdated_RetainsPreviousBinaryAndCurrentModel()
    {
        byte[] initialBinaryBytes = """{"status":"created"}"""u8.ToArray();
        var initialForm = new PaymentForm { Status = "created", CustomerName = "Original" };

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBinaryBytes,
            blobVersionId: BlobVersion(1)
        );
        DataElement formDataElement = AddPersistedPaymentForm(setup, initialForm, blobVersionId: BlobVersion(1));
        var form = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));
        byte[] previousBinary = SerializePaymentForm(setup, formDataElement, initialForm);
        form.Status = "paid";

        DataElementChanges savedChanges = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(savedChanges);

        setup.DataMutator.VerifyDataElementsUnchangedSincePreviousChanges(savedChanges);
        ReadOnlyMemory<byte> binaryAfterSave = await setup.DataMutator.GetBinaryData(formDataElement);
        var formAfterSave = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));
        FormDataChange changeAfterSave = Assert.Single(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false).FormDataChanges
        );

        Assert.True(binaryAfterSave.Span.SequenceEqual(previousBinary));
        Assert.Same(form, formAfterSave);
        Assert.Same(form, changeAfterSave.CurrentFormData);
        Assert.Equal("paid", formAfterSave.Status);
        Assert.Single(GetDataRequests(setup, formDataElement));
    }

    [Fact]
    public async Task SaveChanges_WhenLockOnlyElementChangesConcurrently_EvictsCachedBinary()
    {
        byte[] initialBytes = """{"status":"created"}"""u8.ToArray();
        byte[] concurrentBytes = """{"status":"external"}"""u8.ToArray();

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, blobVersionId: BlobVersion(1));
        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.Services.Storage.AddDataRaw(Guid.Parse(setup.DataElement.Id), concurrentBytes, BlobVersion(2));
        setup.DataMutator.LockDataElementsForDataType(setup.DataElement.DataType);

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));
        ReadOnlyMemory<byte> refreshedBytes = await setup.DataMutator.GetBinaryData(setup.DataElement);

        Assert.True(refreshedBytes.Span.SequenceEqual(concurrentBytes));
        var mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationUpdateDataElement lockUpdate = Assert.Single(
            NewtonsoftJson
                .DeserializeObject<StorageInstanceMutationRequest>(mutationRequest.RequestBody!)!
                .UpdateDataElements
        );
        Assert.Null(lockUpdate.ContentPartName);
        RequestResponse[] dataRequests = GetDataRequests(setup, setup.DataElement);
        Assert.Equal(2, dataRequests.Length);
        Assert.Contains(
            dataRequests,
            request => Assert.Single(request.RequestHeaders.IfMatch).ToString() == DataETag(2)
        );
    }

    [Fact]
    public async Task SaveChanges_WhenFormIsCreated_RetainsCommittedCachesWithoutFetch()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            """{"status":"existing"}"""u8.ToArray(),
            blobVersionId: BlobVersion(1)
        );
        setup.Services.AddDataType<PaymentForm>("created-payment-form", ["application/json"], taskId: "Task_1");
        var createdForm = new PaymentForm { Status = "created", CustomerName = "New" };
        FormDataChange createdChange = setup.DataMutator.AddFormDataElement("created-payment-form", createdForm);

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        DataElement createdDataElement = Assert.IsType<DataElement>(createdChange.DataElement);
        ReadOnlyMemory<byte> cachedBytes = await setup.DataMutator.GetBinaryData(createdDataElement);
        var cachedForm = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(createdDataElement));

        Assert.True(cachedBytes.Span.SequenceEqual(createdChange.CurrentBinaryData!.Value.Span));
        Assert.Same(createdForm, cachedForm);
        Assert.Empty(GetDataRequests(setup, createdDataElement));
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
            BlobVersion(1)
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
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
        var dataMutator = new InstanceDataUnitOfWork(
            instance,
            StorageVersionMetadata.Empty,
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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
        InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
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
        InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
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
        InstanceDataUnitOfWork dataMutator = CreateAggregateCreateValidationUnitOfWork(
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
            blobVersionId: BlobVersion(1)
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
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.Instance.Process!.Status = ProcessStatus.Processing;

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        var processStateChange = new ProcessStateChange
        {
            OldProcessState = setup.DataMutator.Instance.Process,
            NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
            Events = [new InstanceEvent { EventType = "process_StartTask" }],
        };
        setup.DataMutator.UpdateProcessState(processStateChange);
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);

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
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, mutation.ProcessState?.State?.Status);
        Assert.Equal(BlobVersion(1), Assert.Single(mutation.UpdateDataElements).ExpectedCurrentBlobVersion);
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get && request.RequestHeaders.IfMatch.Count > 0
        );
        Assert.Equal("Task_2", setup.DataMutator.Instance.Process.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Idle, setup.DataMutator.Instance.Process.Status);

        (var storedInstance, var storedData) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        Assert.Equal("Task_2", storedInstance.Process?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Idle, storedInstance.Process?.Status);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));
    }

    [Theory]
    [InlineData(ProcessStatus.Idle, null, ProcessStatus.Processing)]
    [InlineData(ProcessStatus.Processing, ProcessStatus.Idle, ProcessStatus.Idle)]
    public async Task SaveWorkflowOwnedAggregate_WithProcessStateMutation_OverwritesStagedStatusWithTransitionOrProcessingDefault(
        string stagedProcessStatus,
        string? transitionProcessStatus,
        string expectedPayloadProcessStatus
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.Instance.Process!.Status = ProcessStatus.Processing;
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = ProcessStatus.Processing;
        setup.DataMutator.UpdateProcessState(
            new ProcessStateChange
            {
                OldProcessState = setup.DataMutator.Instance.Process,
                NewProcessState = new ProcessState
                {
                    Status = stagedProcessStatus,
                    CurrentTask = new ProcessElementInfo { ElementId = "Task_2" },
                },
                Events = [new InstanceEvent { EventType = "process_StartTask" }],
            }
        );
        if (transitionProcessStatus is { } newProcessStatus)
        {
            setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, newProcessStatus);
        }

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-process-state-status-key",
            CancellationToken.None
        );

        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Equal(expectedPayloadProcessStatus, mutation.ProcessState?.State?.Status);
        Assert.Equal("Task_2", mutation.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Equal("Task_2", setup.DataMutator.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(expectedPayloadProcessStatus, setup.DataMutator.Instance.Process?.Status);
        Assert.Equal("Task_2", storedInstance.Process?.CurrentTask?.ElementId);
        Assert.Equal(expectedPayloadProcessStatus, storedInstance.Process?.Status);
        Assert.Equal(9, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(4, setup.DataMutator.StorageVersions.ProcessStateVersion);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    [InlineData(ProcessStatus.Idle)]
    public async Task SaveWorkflowOwnedAggregate_WithDataMutation_AlwaysExpectsProcessingAndKeepsStatus(
        string snapshotStatus
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.Instance.Process!.Status = snapshotStatus;
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = snapshotStatus;
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-keep-key",
            CancellationToken.None
        );

        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(mutationRequest.RequestBody!);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Null(mutation.ProcessState);
        Assert.Equal(snapshotStatus, setup.DataMutator.Instance.Process?.Status);
        Assert.Equal(snapshotStatus, storedInstance.Process?.Status);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_DataSaveBeforeProcessCommit_PreservesAdvancedCallbackProcessSnapshot()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = ProcessStatus.Processing;
        storedInstance.Process.CurrentTask = new ProcessElementInfo { ElementId = "Task_1" };
        var ended = new DateTime(2026, 7, 24, 8, 30, 0, DateTimeKind.Utc);
        var advancedProcessSnapshot = new ProcessState
        {
            Status = ProcessStatus.Processing,
            Ended = ended,
            EndEvent = "EndEvent_1",
            CurrentTask = null,
        };
        setup.DataMutator.Instance.Process = advancedProcessSnapshot;
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated-before-process-commit"u8.ToArray()
        );

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-pre-commit-data-save",
            CancellationToken.None
        );

        RequestResponse request = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = DeserializeMutationRequest(request.RequestBody!);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Null(mutation.ProcessState);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Same(advancedProcessSnapshot, setup.DataMutator.Instance.Process);
        Assert.Equal(ended, setup.DataMutator.Instance.Process?.Ended);
        Assert.Equal("EndEvent_1", setup.DataMutator.Instance.Process?.EndEvent);
        Assert.Null(setup.DataMutator.Instance.Process?.CurrentTask);
        Assert.Equal(ProcessStatus.Processing, setup.DataMutator.Instance.Process?.Status);
        Assert.Equal("Task_1", storedInstance.Process?.CurrentTask?.ElementId);
        Assert.Null(storedInstance.Process?.Ended);
        Assert.Null(storedInstance.Process?.EndEvent);
        Assert.Equal(ProcessStatus.Processing, storedInstance.Process?.Status);
    }

    [Theory]
    [InlineData(ProcessStatus.Idle, ProcessStatus.Processing)]
    [InlineData(ProcessStatus.Processing, ProcessStatus.Idle)]
    public async Task SaveWorkflowOwnedAggregate_WithStagedStatusTransition_SavesAndClearsPendingTransition(
        string expectedProcessStatus,
        string newProcessStatus
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.Instance.Process!.Status = expectedProcessStatus;
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = expectedProcessStatus;
        setup.DataMutator.TransitionProcessStatus(expectedProcessStatus, newProcessStatus);

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-status-transition-key",
            CancellationToken.None
        );

        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
            mutationRequest.RequestBody!
        )!;
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal(expectedProcessStatus, mutation.ExpectedProcessStatus);
        Assert.Equal(newProcessStatus, mutation.ProcessState?.State?.Status);
        Assert.Equal(newProcessStatus, setup.DataMutator.Instance.Process?.Status);
        Assert.Equal(newProcessStatus, storedInstance.Process?.Status);
        Assert.Equal(8, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(4, setup.DataMutator.StorageVersions.ProcessStateVersion);

        WorkflowAggregateSaveOutcome secondOutcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-status-after-success-key",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, secondOutcome);
        Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
    }

    [Theory]
    [InlineData(null, ProcessStatus.Processing, "expectedProcessStatus")]
    [InlineData("", ProcessStatus.Processing, "expectedProcessStatus")]
    [InlineData("Idle", ProcessStatus.Processing, "expectedProcessStatus")]
    [InlineData(ProcessStatus.Idle, null, "newProcessStatus")]
    [InlineData(ProcessStatus.Idle, "", "newProcessStatus")]
    [InlineData(ProcessStatus.Idle, "processing ", "newProcessStatus")]
    public async Task TransitionProcessStatus_WithInvalidStatus_Throws(
        string? expectedProcessStatus,
        string? newProcessStatus,
        string parameterName
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        ArgumentOutOfRangeException exception = Assert.Throws<ArgumentOutOfRangeException>(() =>
            setup.DataMutator.TransitionProcessStatus(expectedProcessStatus!, newProcessStatus!)
        );

        Assert.Equal(parameterName, exception.ParamName);
    }

    [Fact]
    public async Task TransitionProcessStatus_WhenTransitionAlreadyPending_ThrowsWithoutReplacingFirst()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true
        );
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Idle, ProcessStatus.Processing);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle)
        );
        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            "workflow-first-status-transition-key",
            CancellationToken.None
        );

        RequestResponse mutationRequest = Assert.Single(
            setup.Services.Storage.RequestsResponses,
            request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
        );
        StorageInstanceMutationRequest mutation = NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
            mutationRequest.RequestBody!
        )!;
        Assert.Contains("already staged", exception.Message, StringComparison.Ordinal);
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal(ProcessStatus.Idle, mutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Processing, mutation.ProcessState?.State?.Status);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WithInstanceDeletionAndNonTerminalProcessState_IsRejectedWithoutMutation()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true
        );
        setup.DataMutator.Instance.Process!.Status = ProcessStatus.Processing;
        var (storedInstance, storedData) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = ProcessStatus.Processing;
        byte[] storedBytesBefore = storedData[setup.DataElement.Id].ToArray();
        setup.DataMutator.HardDeleteInstance();
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);

        PlatformHttpException exception = await Assert.ThrowsAsync<PlatformHttpException>(() =>
            setup.DataMutator.SaveWorkflowOwnedAggregate(
                setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
                Guid.NewGuid().ToString(),
                CancellationToken.None
            )
        );

        Assert.Equal(HttpStatusCode.BadRequest, exception.Response.StatusCode);
        Assert.NotEqual(true, storedInstance.Status?.IsHardDeleted);
        Assert.Equal(ProcessStatus.Processing, storedInstance.Process?.Status);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(storedBytesBefore));
        Assert.Equal(7, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(3, setup.DataMutator.StorageVersions.ProcessStateVersion);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WithInstanceDeletionAndTerminalProcessState_IsAdmittedAsOneVersionedOperation()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true
        );
        setup.DataMutator.Instance.Process!.Status = ProcessStatus.Processing;
        var (storedInstance, _) = setup.Services.Storage.GetInstanceAndData(
            setup.InstanceOwnerPartyId,
            setup.InstanceGuid
        );
        storedInstance.Process!.Status = ProcessStatus.Processing;
        setup.DataMutator.UpdateProcessState(
            new ProcessStateChange
            {
                OldProcessState = setup.DataMutator.Instance.Process,
                NewProcessState = new ProcessState
                {
                    Ended = new DateTime(2026, 7, 24, 8, 30, 0, DateTimeKind.Utc),
                    EndEvent = "EndEvent_1",
                    CurrentTask = null,
                },
                Events = [new InstanceEvent { EventType = "process_EndEvent" }],
            }
        );
        setup.DataMutator.HardDeleteInstance();
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);

        WorkflowAggregateSaveOutcome outcome = await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.True(storedInstance.Status?.IsHardDeleted);
        Assert.Equal(8, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(4, setup.DataMutator.StorageVersions.ProcessStateVersion);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_OmitsNewProcessStatusFromBothJsonAndMultipartBodies()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Idle, ProcessStatus.Processing);

        await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        setup.DataMutator.UpdateProcessState(
            new ProcessStateChange
            {
                OldProcessState = setup.DataMutator.Instance.Process,
                NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
                Events = [new InstanceEvent { EventType = "process_StartTask" }],
            }
        );
        setup.DataMutator.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        await setup.DataMutator.SaveWorkflowOwnedAggregate(
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        List<RequestResponse> mutationRequests =
        [
            .. setup.Services.Storage.RequestsResponses.Where(request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
            ),
        ];
        Assert.Equal(2, mutationRequests.Count);
        Assert.All(
            mutationRequests,
            request =>
                Assert.DoesNotContain(
                    Newtonsoft.Json.Linq.JObject.Parse(ExtractMutationJson(request.RequestBody!)).Descendants(),
                    token =>
                        token is Newtonsoft.Json.Linq.JProperty property
                        && property.Name.Equals("newProcessStatus", StringComparison.OrdinalIgnoreCase)
                )
        );
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenStorageReturnsPreconditionFailed_ThrowsInstanceDataStaleException()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"workflow-updated"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );
        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(2));
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        InstanceDataStaleException exception = await Assert.ThrowsAsync<InstanceDataStaleException>(() =>
            setup.DataMutator.SaveWorkflowOwnedAggregate(changes, "stale-workflow-save", CancellationToken.None)
        );

        PlatformHttpException innerException = Assert.IsType<PlatformHttpException>(exception.InnerException);
        Assert.Equal(HttpStatusCode.PreconditionFailed, innerException.Response.StatusCode);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenStatusTransitionSaveFails_RetainsTransitionForRetry()
    {
        var versions = new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3);
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        var unitOfWork = CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            CreateApplicationMetadata(),
            [],
            versions
        );
        var capturedMutations = new List<StorageInstanceMutationRequest>();
        mutationClientMock
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
            .Returns(
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
                    capturedMutations.Add(mutation);
                    if (capturedMutations.Count == 1)
                    {
                        return Task.FromException<InstanceMutationWithStorageMetadata>(
                            new HttpRequestException("Transient Storage failure")
                        );
                    }

                    return Task.FromResult(
                        new InstanceMutationWithStorageMetadata(
                            new Instance
                            {
                                Id = unitOfWork.Instance.Id,
                                AppId = unitOfWork.Instance.AppId,
                                Org = unitOfWork.Instance.Org,
                                InstanceOwner = unitOfWork.Instance.InstanceOwner,
                                Process = new ProcessState { Status = ProcessStatus.Processing },
                                Data = [],
                            },
                            new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4)
                        )
                    );
                }
            );
        unitOfWork.TransitionProcessStatus(ProcessStatus.Idle, ProcessStatus.Processing);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            unitOfWork.SaveWorkflowOwnedAggregate(changes, "workflow-status-retry-key", CancellationToken.None)
        );
        WorkflowAggregateSaveOutcome retryOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "workflow-status-retry-key",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, retryOutcome);
        Assert.Equal(2, capturedMutations.Count);
        Assert.All(
            capturedMutations,
            mutation =>
            {
                Assert.Equal(ProcessStatus.Idle, mutation.ExpectedProcessStatus);
                Assert.Equal(ProcessStatus.Processing, mutation.ProcessState?.State?.Status);
            }
        );
        Assert.Equal(ProcessStatus.Processing, unitOfWork.Instance.Process?.Status);
        mutationClientMock.Verify(
            x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
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
        var versions = new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8);
        var committedVersions = new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 5);
        var appMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes = [new DataType { Id = "task-data", TaskId = "Task_1" }],
        };
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        StorageWritePreconditions? capturedPreconditions = null;
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
                        committedVersions
                    );
                }
            );
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            versions,
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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
        unitOfWork.UpdateProcessState(processStateChange);
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
        Assert.Equal(9, unitOfWork.StorageVersions.InstanceVersion);
        Assert.Equal(5, unitOfWork.StorageVersions.ProcessStateVersion);
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
        var versions = new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8);
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
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            versions,
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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
        var versions = new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8);
        var appMetadata = new ApplicationMetadata(instance.AppId) { DataTypes = [] };
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        StorageWritePreconditions? capturedPreconditions = null;
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            versions,
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

        unitOfWork.HardDeleteInstance();
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
            Process = new ProcessState
            {
                Status = ProcessStatus.Idle,
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
            },
            Data = [],
        };
        var versions = new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3);
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
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = "Task_2" },
            },
            Data =
            [
                new DataElement
                {
                    Id = authoritativeDataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = "payment",
                    ContentType = "application/json",
                    Filename = "attempt-one.json",
                    BlobVersionId = "blob-version-replay",
                },
            ],
        };
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
                    BlobVersionId = "blob-version-replayed-response",
                },
            ],
        };
        authoritativeInstance.Data[0].BlobVersionId = "blob-version-fresh-instance";
        var replayedResponseVersions = new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4);
        var authoritativeVersions = new StorageVersionMetadata(InstanceVersion: 9, ProcessStateVersion: 5);
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
                    replayedResponseVersions,
                    [authoritativeDataElementId],
                    replayed: true
                )
            );
        var instanceClientMock = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
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
            .ReturnsAsync(new InstanceWithStorageMetadata(authoritativeInstance, authoritativeVersions));
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            versions,
            dataClientMock.Object,
            mutationClientMock.Object,
            instanceClientMock.Object,
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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
        unitOfWork.UpdateProcessState(processStateChange);
        unitOfWork.TransitionProcessStatus(ProcessStatus.Idle, ProcessStatus.Processing);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        await Assert.ThrowsAsync<InstanceMutationReplayedException>(() =>
            unitOfWork.SaveWorkflowOwnedAggregate(changes, "callback-step-id", CancellationToken.None)
        );

        Assert.Equal(authoritativeDataElementId.ToString(), Assert.Single(unitOfWork.Instance.Data).Id);
        Assert.Equal("Task_2", unitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Processing, unitOfWork.Instance.Process?.Status);
        Assert.Equal(9, unitOfWork.StorageVersions.InstanceVersion);
        Assert.Equal(5, unitOfWork.StorageVersions.ProcessStateVersion);
        Assert.Equal("blob-version-fresh-instance", Assert.Single(unitOfWork.Instance.Data).BlobVersionId);
        Assert.Equal(stagedDataElementId.ToString(), createdChange.DataElement?.Id);
        WorkflowAggregateSaveOutcome replayRebuildOutcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "callback-step-id-after-replay",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, replayRebuildOutcome);
    }

    [Fact]
    public async Task SaveChanges_WhenStorageReturnsNewBlobVersionId_RefreshesInstanceDataElement()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(ProcessStateVersion: 1),
            blobVersionId: BlobVersion(1)
        );
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(
            BlobVersion(2),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .BlobVersionId
        );
        Assert.DoesNotContain(
            setup.Services.Storage.RequestsResponses,
            request => request.RequestMethod == HttpMethod.Get
        );
    }

    [Fact]
    public async Task SaveChanges_WhenServiceOwnerScopesDiffer_UsesDeterministicDistinctUnion()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(3);
        setup.UnitOfWork.OverrideAuthenticationMethod(
            setup.DataTypes[0],
            StorageAuthenticationMethod.ServiceOwner("scope:z", "scope:a", "scope:z")
        );
        setup.UnitOfWork.OverrideAuthenticationMethod(
            setup.DataTypes[1],
            StorageAuthenticationMethod.ServiceOwner("scope:b", "scope:a")
        );
        setup.UnitOfWork.OverrideAuthenticationMethod(
            setup.DataTypes[2],
            StorageAuthenticationMethod.ServiceOwner("scope:c", "scope:z")
        );

        await SaveAllAuthenticationTestElements(setup);

        AuthenticationMethod.AltinnToken request = Assert.IsType<AuthenticationMethod.AltinnToken>(
            setup.AuthenticationMethod?.Request
        );
        Assert.Equal(
            [
                "altinn:serviceowner",
                "altinn:serviceowner/instances.read",
                "altinn:serviceowner/instances.write",
                "scope:a",
                "scope:b",
                "scope:c",
                "scope:z",
            ],
            request.Scopes
        );
        VerifySingleAggregateMutation(setup);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public async Task SaveChanges_WhenServiceOwnerMethodIsLoneOrReused_UsesOriginalMethod(int dataTypeCount)
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(dataTypeCount);
        StorageAuthenticationMethod method = StorageAuthenticationMethod.ServiceOwner("scope:z", "scope:a");
        foreach (DataType dataType in setup.DataTypes)
        {
            setup.UnitOfWork.OverrideAuthenticationMethod(dataType, method);
        }

        await SaveAllAuthenticationTestElements(setup);

        Assert.Same(method, setup.AuthenticationMethod);
        VerifySingleAggregateMutation(setup);
    }

    [Fact]
    public async Task SaveChanges_WhenCurrentUserAndServiceOwnerAreCombined_ThrowsBeforeStorageIo()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(2);
        setup.UnitOfWork.OverrideAuthenticationMethod(setup.DataTypes[1], StorageAuthenticationMethod.ServiceOwner());
        foreach (DataElement dataElement in setup.DataElements)
        {
            setup.UnitOfWork.RemoveDataElement(dataElement);
        }

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.UnitOfWork.SaveChanges(setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains("CurrentUser and ServiceOwner", exception.Message, StringComparison.Ordinal);
        VerifyNoStorageIo(setup);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WhenCurrentUserAndServiceOwnerAreCombined_ThrowsBeforeStorageIo()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(
            2,
            new StorageVersionMetadata(InstanceVersion: 4, ProcessStateVersion: 2)
        );
        setup.UnitOfWork.OverrideAuthenticationMethod(setup.DataTypes[1], StorageAuthenticationMethod.ServiceOwner());
        foreach (DataElement dataElement in setup.DataElements)
        {
            setup.UnitOfWork.RemoveDataElement(dataElement);
        }
        DataElementChanges changes = setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        Assert.Equal(2, changes.AllChanges.Count);
        Assert.All(changes.AllChanges, change => Assert.Equal(ChangeType.Deleted, change.Type));

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.UnitOfWork.SaveWorkflowOwnedAggregate(
                changes,
                "workflow-mixed-authentication",
                CancellationToken.None
            )
        );

        Assert.Contains("CurrentUser and ServiceOwner", exception.Message, StringComparison.Ordinal);
        VerifyNoStorageIo(setup);
    }

    [Theory]
    [InlineData(CustomAuthenticationMixture.CurrentUser)]
    [InlineData(CustomAuthenticationMixture.ServiceOwner)]
    [InlineData(CustomAuthenticationMixture.DifferentCustomProvider)]
    public async Task SaveChanges_WhenCustomAuthenticationIsMixed_ThrowsBeforeStorageIo(
        CustomAuthenticationMixture mixture
    )
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(2);
        Func<Task<JwtToken>> firstProvider = static () => Task.FromResult(default(JwtToken));
        setup.UnitOfWork.OverrideAuthenticationMethod(
            setup.DataTypes[0],
            StorageAuthenticationMethod.Custom(firstProvider)
        );
        switch (mixture)
        {
            case CustomAuthenticationMixture.CurrentUser:
                break;
            case CustomAuthenticationMixture.ServiceOwner:
                setup.UnitOfWork.OverrideAuthenticationMethod(
                    setup.DataTypes[1],
                    StorageAuthenticationMethod.ServiceOwner()
                );
                break;
            case CustomAuthenticationMixture.DifferentCustomProvider:
                Func<Task<JwtToken>> secondProvider = static () => Task.FromResult(default(JwtToken));
                setup.UnitOfWork.OverrideAuthenticationMethod(
                    setup.DataTypes[1],
                    StorageAuthenticationMethod.Custom(secondProvider)
                );
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(mixture), mixture, null);
        }
        foreach (DataElement dataElement in setup.DataElements)
        {
            setup.UnitOfWork.RemoveDataElement(dataElement);
        }

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.UnitOfWork.SaveChanges(setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false))
        );

        Assert.Contains("Custom authentication", exception.Message, StringComparison.Ordinal);
        VerifyNoStorageIo(setup);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public async Task SaveChanges_WhenCustomProviderIsLoneOrDelegateEqual_UsesOneOriginalMethod(int dataTypeCount)
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(dataTypeCount);
        var providerTarget = new EqualCustomTokenProvider();
        Func<Task<JwtToken>> firstProvider = providerTarget.GetToken;
        Func<Task<JwtToken>> equalProvider = providerTarget.GetToken;
        Assert.NotSame(firstProvider, equalProvider);
        Assert.Equal(firstProvider, equalProvider);
        Func<Task<JwtToken>>[] providers = [firstProvider, equalProvider];
        StorageAuthenticationMethod[] methods = setup
            .DataTypes.Select((_, index) => StorageAuthenticationMethod.Custom(providers[index]))
            .ToArray();
        for (int i = 0; i < setup.DataTypes.Count; i++)
        {
            setup.UnitOfWork.OverrideAuthenticationMethod(setup.DataTypes[i], methods[i]);
        }

        await SaveAllAuthenticationTestElements(setup);

        StorageAuthenticationMethod actualMethod = Assert.IsType<StorageAuthenticationMethod>(
            setup.AuthenticationMethod
        );
        Assert.Contains(methods, method => ReferenceEquals(method, actualMethod));
        AuthenticationMethod.CustomToken request = Assert.IsType<AuthenticationMethod.CustomToken>(
            actualMethod.Request
        );
        Assert.Equal(firstProvider, request.TokenProvider);
        Assert.Contains(providers, provider => ReferenceEquals(provider, request.TokenProvider));
        VerifySingleAggregateMutation(setup);
    }

    [Fact]
    public async Task SaveWorkflowOwnedAggregate_WithoutContributingDataAuthentication_UsesServiceOwnerDefault()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(
            0,
            new StorageVersionMetadata(InstanceVersion: 4, ProcessStateVersion: 2)
        );
        setup.UnitOfWork.UpdateProcessState(
            new ProcessStateChange
            {
                OldProcessState = setup.UnitOfWork.Instance.Process,
                NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } },
                Events = [],
            }
        );

        WorkflowAggregateSaveOutcome outcome = await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            new DataElementChanges([]),
            "workflow-default-authentication",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        AuthenticationMethod.AltinnToken request = Assert.IsType<AuthenticationMethod.AltinnToken>(
            setup.AuthenticationMethod?.Request
        );
        Assert.Equal(
            ["altinn:serviceowner", "altinn:serviceowner/instances.read", "altinn:serviceowner/instances.write"],
            request.Scopes
        );
        VerifySingleAggregateMutation(setup);
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

        Assert.Equal(1, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageVersions.ProcessStateVersion);
        Assert.Equal(
            BlobVersion(1),
            Assert
                .Single(setup.DataMutator.Instance.Data, dataElement => dataElement.Id == setup.DataElement.Id)
                .BlobVersionId
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

        Assert.Equal(1, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageVersions.ProcessStateVersion);
    }

    [Fact]
    public async Task RemoveDataElement_RefreshesVersionsAndRemovesElementFromInstanceSnapshot()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);
        setup.DataMutator.RemoveDataElement(setup.DataElement);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        Assert.Equal(1, setup.DataMutator.StorageVersions.InstanceVersion);
        Assert.Equal(1, setup.DataMutator.StorageVersions.ProcessStateVersion);
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
    public async Task PreviousDataAccessor_BeforeSavingUpdatedBinaryData_WhenPreviouslyLoaded_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_BeforeSavingUpdatedBinaryData_WhenNotPreviouslyLoaded_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        BinaryDataChange change = setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBytes
        );

        Assert.Null(change.PreviousBinaryData);

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.GetPreviousDataAccessor().GetBinaryData(setup.DataElement)
        );

        Assert.Contains("was not read before it was updated", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSavingUpdatedBinaryData_WhenPreviouslyLoaded_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSavingUpdatedBinaryData_WhenNotPreviouslyLoaded_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        BinaryDataChange change = setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBytes
        );

        Assert.Null(change.PreviousBinaryData);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.GetPreviousDataAccessor().GetBinaryData(setup.DataElement)
        );

        Assert.Contains("was not read before it was updated", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterWorkflowOwnedSave_WhenPreviouslyLoaded_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 1, ProcessStateVersion: 1),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveWorkflowOwnedAggregate(changes, "previous-data-loaded", CancellationToken.None);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterWorkflowOwnedSave_WhenNotPreviouslyLoaded_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            initialBytes,
            new StorageVersionMetadata(InstanceVersion: 1, ProcessStateVersion: 1),
            seedStorageVersions: true,
            blobVersionId: BlobVersion(1)
        );

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveWorkflowOwnedAggregate(
            changes,
            "previous-data-unavailable",
            CancellationToken.None
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.GetPreviousDataAccessor().GetBinaryData(setup.DataElement)
        );

        Assert.Contains("was not read before it was updated", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSavedUpdateIsStagedForDeletion_WhenNotPreviouslyLoaded_Throws()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);
        setup.DataMutator.RemoveDataElement(setup.DataElement);

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.GetPreviousDataAccessor().GetBinaryData(setup.DataElement)
        );

        Assert.Contains("was not read before it was updated", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PreviousDataAccessor_AfterLoadedUpdateIsStagedForDeletion_ReturnsOriginalBytes(
        bool saveBeforeDeletion
    )
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        if (saveBeforeDeletion)
        {
            DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
            await setup.DataMutator.SaveChanges(changes);
        }
        setup.DataMutator.RemoveDataElement(setup.DataElement);

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSequentialBinaryUpdates_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] firstUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"authorized"}""");
        byte[] secondUpdatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, firstUpdatedBytes);
        BinaryDataChange secondChange = setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            secondUpdatedBytes
        );

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(secondChange.PreviousBinaryData.HasValue);
        Assert.True(secondChange.PreviousBinaryData.Value.Span.SequenceEqual(initialBytes));
        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_WhenCachedPreviousBinaryDataIsEmpty_ReturnsAvailableEmptyBytes()
    {
        byte[] updatedBytes = Encoding.UTF8.GetBytes("updated");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create([]);

        await setup.DataMutator.GetBinaryData(setup.DataElement);
        BinaryDataChange change = setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            updatedBytes
        );

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(setup.DataElement);

        Assert.True(change.PreviousBinaryData.HasValue);
        Assert.True(change.PreviousBinaryData.Value.IsEmpty);
        Assert.True(previousBytes.IsEmpty);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterFailedSaveAndSuccessfulRetry_WhenNotPreviouslyLoaded_StillThrows()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, blobVersionId: BlobVersion(1));

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(2));

        await Assert.ThrowsAsync<InstanceDataStaleException>(() => setup.DataMutator.SaveChanges(changes));
        await AssertPreviousBinaryDataUnavailable(setup.DataMutator, setup.DataElement);

        setup.Services.Storage.SetDataBlobVersionId(Guid.Parse(setup.DataElement.Id), BlobVersion(1));
        await setup.DataMutator.SaveChanges(changes);

        await AssertPreviousBinaryDataUnavailable(setup.DataMutator, setup.DataElement);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterReplay_WhenPreviouslyLoaded_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"attempted"}""");
        byte[] replayedBytes = Encoding.UTF8.GetBytes("""{"status":"replayed"}""");
        var (unitOfWork, dataElement) = CreateBinaryUpdateReplayUnitOfWork(replayedBytes);
        unitOfWork.PreloadBinaryData(dataElement, initialBytes);
        unitOfWork.UpdateBinaryDataElement(dataElement, dataElement.ContentType!, updatedBytes);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        await Assert.ThrowsAsync<InstanceMutationReplayedException>(() =>
            unitOfWork.SaveWorkflowOwnedAggregate(changes, "previous-data-replay-loaded", CancellationToken.None)
        );

        ReadOnlyMemory<byte> previousBytes = await unitOfWork.GetPreviousDataAccessor().GetBinaryData(dataElement);

        Assert.True(previousBytes.Span.SequenceEqual(initialBytes));
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterReplay_WhenNotPreviouslyLoaded_Throws()
    {
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"attempted"}""");
        byte[] replayedBytes = Encoding.UTF8.GetBytes("""{"status":"replayed"}""");
        var (unitOfWork, dataElement) = CreateBinaryUpdateReplayUnitOfWork(replayedBytes);
        unitOfWork.UpdateBinaryDataElement(dataElement, dataElement.ContentType!, updatedBytes);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);

        await Assert.ThrowsAsync<InstanceMutationReplayedException>(() =>
            unitOfWork.SaveWorkflowOwnedAggregate(changes, "previous-data-replay-unavailable", CancellationToken.None)
        );

        await AssertPreviousBinaryDataUnavailable(unitOfWork, dataElement);
    }

    [Fact]
    public async Task PreviousDataAccessor_AfterSavingAnotherBinaryUpdate_ForUnchangedElement_LazilyReturnsPersistedBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes, dataElementCount: 2);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        DataElement unchangedDataElement = setup.DataElements[1];

        ReadOnlyMemory<byte> previousBytes = await setup
            .DataMutator.GetPreviousDataAccessor()
            .GetBinaryData(unchangedDataElement);

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

    private static async Task AssertPreviousBinaryDataUnavailable(
        InstanceDataUnitOfWork unitOfWork,
        DataElementIdentifier dataElementIdentifier
    )
    {
        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            unitOfWork.GetPreviousDataAccessor().GetBinaryData(dataElementIdentifier)
        );
        Assert.Contains("was not read before it was updated", exception.Message, StringComparison.Ordinal);
    }

    private static (InstanceDataUnitOfWork UnitOfWork, DataElement DataElement) CreateBinaryUpdateReplayUnitOfWork(
        byte[] replayedBytes
    )
    {
        const int instanceOwnerPartyId = 123456;
        Guid instanceGuid = Guid.NewGuid();
        Guid dataElementId = Guid.NewGuid();
        var dataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = "payment",
            ContentType = "application/json",
            Filename = "payment.json",
            BlobVersionId = BlobVersion(1),
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
        var versions = new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3);
        var replayedDataElement = new DataElement
        {
            Id = dataElement.Id,
            InstanceGuid = dataElement.InstanceGuid,
            DataType = dataElement.DataType,
            ContentType = dataElement.ContentType,
            Filename = dataElement.Filename,
            BlobVersionId = BlobVersion(2),
        };
        var authoritativeInstance = new Instance
        {
            Id = instance.Id,
            AppId = instance.AppId,
            Org = instance.Org,
            InstanceOwner = instance.InstanceOwner,
            Process = instance.Process,
            Data = [replayedDataElement],
        };
        var replayedMetadata = new StorageVersionMetadata(InstanceVersion: 8, ProcessStateVersion: 4);
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
                new InstanceMutationWithStorageMetadata(authoritativeInstance, replayedMetadata, [], replayed: true)
            );
        dataClientMock
            .Setup(x =>
                x.GetDataBytesWithExpectedBlobVersionId(
                    instanceOwnerPartyId,
                    instanceGuid,
                    dataElementId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(replayedBytes);
        var instanceClientMock = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
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
            .ReturnsAsync(new InstanceWithStorageMetadata(authoritativeInstance, replayedMetadata));
        var appMetadata = new ApplicationMetadata(instance.AppId)
        {
            DataTypes =
            [
                new DataType
                {
                    Id = dataElement.DataType,
                    TaskId = "Task_1",
                    AllowedContentTypes = [dataElement.ContentType],
                },
            ],
        };

        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            versions,
            dataClientMock.Object,
            mutationClientMock.Object,
            instanceClientMock.Object,
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: "Task_1",
            language: null
        );
        return (unitOfWork, dataElement);
    }

    private static PlatformHttpException CreatePlatformException(HttpStatusCode statusCode) =>
        new(statusCode, $"Storage returned {(int)statusCode}");

    private static DataElement AddPersistedPaymentForm(
        BinaryDataUnitOfWorkSetup setup,
        PaymentForm form,
        string blobVersionId
    )
    {
        const string dataTypeId = "payment-form";
        const string contentType = "application/json";
        DataType dataType = setup.Services.AddDataType<PaymentForm>(dataTypeId, [contentType], taskId: "Task_1");

        Guid dataElementId = Guid.NewGuid();
        var unitOfWorkDataElement = new DataElement
        {
            Id = dataElementId.ToString(),
            InstanceGuid = setup.InstanceGuid.ToString(),
            DataType = dataTypeId,
            ContentType = contentType,
            Filename = "payment-form.json",
            BlobVersionId = blobVersionId,
        };
        var storageDataElement = JsonSerializer.Deserialize<DataElement>(
            JsonSerializer.SerializeToUtf8Bytes(unitOfWorkDataElement)
        )!;
        setup.DataMutator.Instance.Data.Add(unitOfWorkDataElement);
        setup
            .Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid)
            .instance.Data.Add(storageDataElement);
        setup.Services.Storage.AddDataRaw(
            dataElementId,
            setup
                .ServiceProvider.GetRequiredService<ModelSerializationService>()
                .SerializeToStorage(form, dataType, unitOfWorkDataElement)
                .data.ToArray(),
            blobVersionId
        );
        return unitOfWorkDataElement;
    }

    private static byte[] SerializePaymentForm(
        BinaryDataUnitOfWorkSetup setup,
        DataElement dataElement,
        PaymentForm form
    )
    {
        DataType dataType = setup.Services.AppMetadata.DataTypes.Single(dataType =>
            dataType.Id == dataElement.DataType
        );
        return setup
            .ServiceProvider.GetRequiredService<ModelSerializationService>()
            .SerializeToStorage(form, dataType, dataElement)
            .data.ToArray();
    }

    private static RequestResponse[] GetDataRequests(
        BinaryDataUnitOfWorkSetup setup,
        DataElementIdentifier dataElementIdentifier
    ) =>
        setup
            .Services.Storage.RequestsResponses.Where(request =>
                request.RequestMethod == HttpMethod.Get
                && request.RequestUrl?.AbsolutePath.EndsWith(
                    $"/data/{dataElementIdentifier.Id}",
                    StringComparison.Ordinal
                ) == true
            )
            .ToArray();

    private static string BlobVersion(int contentVersion) =>
        StorageClientInterceptor.CreateBlobVersionId(contentVersion);

    private static string DataETag(int contentVersion) => StorageClientInterceptor.CreateDataETag(contentVersion);

    private static StorageInstanceMutationRequest DeserializeMutationRequest(string multipartRequestBody) =>
        NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(ExtractMutationJson(multipartRequestBody))!;

    private static string ExtractMutationJson(string multipartRequestBody)
    {
        if (multipartRequestBody.StartsWith('{'))
        {
            return multipartRequestBody;
        }

        const string jsonPartStart = "\r\n\r\n{";
        int partStart = multipartRequestBody.IndexOf(jsonPartStart, StringComparison.Ordinal);
        int start = partStart < 0 ? -1 : partStart + jsonPartStart.Length - 1;
        Assert.True(start >= 0, "Mutation JSON part was not found in the multipart request body.");
        int end = multipartRequestBody.IndexOf("\r\n--", start, StringComparison.Ordinal);
        Assert.True(end > start, "Mutation JSON part was not terminated by a multipart boundary.");
        return multipartRequestBody[start..end];
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

    private static ApplicationMetadata CreateApplicationMetadata(params DataType[] dataTypes) =>
        new($"{MockedServiceCollection.Org}/{MockedServiceCollection.App}") { DataTypes = [.. dataTypes] };

    private static AuthenticationResolutionSetup CreateAuthenticationResolutionSetup(
        int dataTypeCount,
        StorageVersionMetadata? storageVersionMetadata = null
    )
    {
        DataType[] dataTypes = Enumerable
            .Range(0, dataTypeCount)
            .Select(index => CreateBinaryDataType($"authentication-{index}"))
            .ToArray();
        DataElement[] dataElements = dataTypes.Select(dataType => CreateDataElement(dataType.Id)).ToArray();
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        var instanceClientMock = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        InstanceDataUnitOfWork unitOfWork = CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            mutationClientMock.Object,
            instanceClientMock.Object,
            CreateApplicationMetadata(dataTypes),
            dataElements,
            storageVersionMetadata
        );
        AuthenticationResolutionSetup? setup = null;
        mutationClientMock
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
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest _,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? authenticationMethod,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    setup!.AuthenticationMethod = authenticationMethod;
                    return new InstanceMutationWithStorageMetadata(
                        unitOfWork.Instance,
                        storageVersionMetadata ?? StorageVersionMetadata.Empty
                    );
                }
            );
        setup = new AuthenticationResolutionSetup
        {
            UnitOfWork = unitOfWork,
            DataClientMock = dataClientMock,
            MutationClientMock = mutationClientMock,
            InstanceClientMock = instanceClientMock,
            DataTypes = dataTypes,
            DataElements = dataElements,
        };
        return setup;
    }

    private static async Task SaveAllAuthenticationTestElements(AuthenticationResolutionSetup setup)
    {
        foreach (DataElement dataElement in setup.DataElements)
        {
            setup.UnitOfWork.RemoveDataElement(dataElement);
        }

        await setup.UnitOfWork.SaveChanges(setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false));
    }

    private static void VerifySingleAggregateMutation(AuthenticationResolutionSetup setup)
    {
        setup.MutationClientMock.Verify(
            x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        setup.InstanceClientMock.VerifyNoOtherCalls();
    }

    private static void VerifyNoStorageIo(AuthenticationResolutionSetup setup)
    {
        setup.MutationClientMock.Verify(
            x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        setup.DataClientMock.VerifyNoOtherCalls();
        setup.InstanceClientMock.VerifyNoOtherCalls();
    }

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        Mock<IDataClientWithStorageMetadata> dataClientMock,
        params DataType[] dataTypes
    )
    {
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        return CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            CreateApplicationMetadata(dataTypes),
            []
        );
    }

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        Mock<IDataClientWithStorageMetadata> dataClientMock,
        IReadOnlyList<DataElement> dataElements,
        params DataType[] dataTypes
    )
    {
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        return CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            CreateApplicationMetadata(dataTypes),
            dataElements
        );
    }

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        Mock<IDataClientWithStorageMetadata> dataClientMock,
        IInstanceClientWithStorageMetadata instanceClient,
        ApplicationMetadata appMetadata,
        IReadOnlyList<DataElement> dataElements
    )
    {
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        return CreateStorageWriteUnitOfWork(
            dataClientMock.Object,
            mutationClientMock.Object,
            instanceClient,
            appMetadata,
            dataElements
        );
    }

    private static InstanceDataUnitOfWork CreateStorageWriteUnitOfWork(
        IDataClientWithStorageMetadata dataClient,
        IInstanceMutationClient mutationClient,
        IInstanceClientWithStorageMetadata instanceClient,
        ApplicationMetadata appMetadata,
        IReadOnlyList<DataElement> dataElements,
        StorageVersionMetadata? storageVersionMetadata = null
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
            storageVersionMetadata ?? StorageVersionMetadata.Empty,
            dataClient,
            mutationClient,
            instanceClient,
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        mutationClientMock
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
            StorageVersionMetadata.Empty,
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            appMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
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

    public enum CustomAuthenticationMixture
    {
        CurrentUser,
        ServiceOwner,
        DifferentCustomProvider,
    }

    private sealed class EqualCustomTokenProvider
    {
        public Task<JwtToken> GetToken() => Task.FromResult(default(JwtToken));
    }

    private sealed class AuthenticationResolutionSetup
    {
        public required InstanceDataUnitOfWork UnitOfWork { get; init; }
        public required Mock<IDataClientWithStorageMetadata> DataClientMock { get; init; }
        public required Mock<IInstanceMutationClient> MutationClientMock { get; init; }
        public required Mock<IInstanceClientWithStorageMetadata> InstanceClientMock { get; init; }
        public required IReadOnlyList<DataType> DataTypes { get; init; }
        public required IReadOnlyList<DataElement> DataElements { get; init; }
        public StorageAuthenticationMethod? AuthenticationMethod { get; set; }
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
            int otherDataTypeElementCount = 0,
            bool locked = false,
            string? blobVersionId = null,
            bool lastBlobVersionIdEmpty = false,
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
                        BlobVersionId =
                            lastBlobVersionIdEmpty && i == dataElementCount - 1 ? string.Empty : blobVersionId,
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
                        BlobVersionId = blobVersionId,
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
                if (withoutBlobVersion || (lastBlobVersionIdEmpty && i == dataElementCount - 1))
                {
                    services.Storage.AddDataRawWithoutBlobVersion(Guid.Parse(dataElement.Id), initialBytes);
                }
                else
                {
                    services.Storage.AddDataRaw(Guid.Parse(dataElement.Id), initialBytes, dataElement.BlobVersionId);
                }
            }

            WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
            var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
            Instance instanceCopy = JsonSerializer.Deserialize<Instance>(
                JsonSerializer.SerializeToUtf8Bytes(instance)
            )!;
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
                .Init(instanceCopy, storageVersionMetadata ?? StorageVersionMetadata.Empty, taskId, language: null)
                .GetAwaiter()
                .GetResult();

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
            await ServiceProvider.DisposeAsync();
        }
    }
}
