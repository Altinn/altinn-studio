using System.Text;
using System.Text.Json;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

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
    public async Task SaveChanges_PersistsUpdatedBinaryDataToStorage()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        await setup.DataMutator.UpdateInstanceData(changes);
        await setup.DataMutator.SaveChanges(changes);

        (_, var storedData) = setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid);
        Assert.True(storedData[setup.DataElement.Id].AsSpan().SequenceEqual(updatedBytes));
    }

    [Fact]
    public async Task VerifyDataElementsUnchangedSincePreviousChanges_AfterSavingUpdatedBinaryData_DoesNotThrow()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        await setup.DataMutator.UpdateInstanceData(changes);
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
    public async Task PreviousDataAccessor_AfterSavingUpdatedBinaryData_ReturnsOriginalBytes()
    {
        byte[] initialBytes = Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        await using var setup = await BinaryDataUnitOfWorkSetup.Create(initialBytes);

        setup.DataMutator.UpdateBinaryDataElement(setup.DataElement, setup.DataElement.ContentType!, updatedBytes);
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);

        await setup.DataMutator.UpdateInstanceData(changes);
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

    private sealed class BinaryDataUnitOfWorkSetup : IAsyncDisposable
    {
        public required MockedServiceCollection Services { get; init; }
        public required WrappedServiceProvider ServiceProvider { get; init; }
        public required InstanceDataUnitOfWork DataMutator { get; init; }
        public required DataElement DataElement { get; init; }
        public required int InstanceOwnerPartyId { get; init; }
        public required Guid InstanceGuid { get; init; }

        public static async Task<BinaryDataUnitOfWorkSetup> Create(byte[] initialBytes)
        {
            var services = new MockedServiceCollection();
            const string taskId = "Task_1";
            const string dataTypeId = "payment";
            const string contentType = "application/json";
            const string fileName = "payment.json";
            const int instanceOwnerPartyId = 123456;
            Guid instanceGuid = Guid.NewGuid();
            Guid dataGuid = Guid.NewGuid();

            services.AddDataType(
                new DataType
                {
                    Id = dataTypeId,
                    AllowedContentTypes = [contentType],
                    MaxCount = 1,
                    TaskId = taskId,
                }
            );

            var dataElement = new DataElement
            {
                Id = dataGuid.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = dataTypeId,
                ContentType = contentType,
                Filename = fileName,
            };
            var instance = new Instance
            {
                Id = $"{instanceOwnerPartyId}/{instanceGuid}",
                AppId = $"{MockedServiceCollection.Org}/{MockedServiceCollection.App}",
                InstanceOwner = new InstanceOwner { PartyId = instanceOwnerPartyId.ToString() },
                Data = [dataElement],
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            };

            services.Storage.AddInstance(instance);
            services.Storage.AddDataRaw(dataGuid, initialBytes);

            WrappedServiceProvider serviceProvider = services.BuildServiceProvider();
            var initializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
            Instance instanceCopy = JsonSerializer.Deserialize<Instance>(
                JsonSerializer.SerializeToUtf8Bytes(instance)
            )!;
            InstanceDataUnitOfWork dataMutator = await initializer.Init(instanceCopy, taskId, language: null);

            return new BinaryDataUnitOfWorkSetup
            {
                Services = services,
                ServiceProvider = serviceProvider,
                DataMutator = dataMutator,
                DataElement = dataElement,
                InstanceOwnerPartyId = instanceOwnerPartyId,
                InstanceGuid = instanceGuid,
            };
        }

        public ValueTask DisposeAsync() => ServiceProvider.DisposeAsync();
    }
}
