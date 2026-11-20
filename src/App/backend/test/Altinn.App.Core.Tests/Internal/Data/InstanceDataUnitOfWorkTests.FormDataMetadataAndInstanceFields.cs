using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using RequestResponse = Altinn.App.Tests.Common.Mocks.StorageClientInterceptor.RequestResponse;

namespace Altinn.App.Core.Tests.Internal.Data;

public sealed partial class InstanceDataUnitOfWorkTests
{
    [Fact]
    public async Task ChangedElementMetadata_OnAnExistingElement_SendsAMetadataOnlyUpdate()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.NewGuid();

        SetAllMetadata(setup.DataMutator.GetDataElement(setup.DataElement), referencedId);
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), update.DataElementId);
        Assert.Null(update.ContentPartName);
        Assert.Null(update.Locked);
        AssertAllMetadata(
            update.Tags,
            update.Metadata,
            update.UserDefinedMetadata,
            update.Refs,
            update.Filename,
            referencedId
        );
    }

    [Fact]
    public async Task ChangedElementMetadata_SendsOnlyTheChangedProperties()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.GetDataElement(setup.DataElement).Tags.Add("signed");
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(["signed"], update.Tags);
        Assert.Null(update.Metadata);
        Assert.Null(update.UserDefinedMetadata);
        Assert.Null(update.Refs);
        Assert.Null(update.Filename);
    }

    [Fact]
    public async Task ChangedElementMetadata_OnAnExistingElement_SavesWithTheDataTypesAuthenticationMethod()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(1);
        StorageAuthenticationMethod method = StorageAuthenticationMethod.ServiceOwner("scope:a");
        setup.UnitOfWork.OverrideAuthenticationMethod(setup.DataTypes[0], method);

        setup.UnitOfWork.GetDataElement(setup.DataElements[0]).Tags = ["signed"];
        await setup.UnitOfWork.SaveChanges(setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Same(method, setup.AuthenticationMethod);
    }

    [Fact]
    public async Task ChangedElementMetadata_WithAContentUpdate_SendsOneUpdateItem()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.NewGuid();
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        SetAllMetadata(setup.DataMutator.GetDataElement(setup.DataElement), referencedId);
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.NotNull(update.ContentPartName);
        AssertAllMetadata(
            update.Tags,
            update.Metadata,
            update.UserDefinedMetadata,
            update.Refs,
            update.Filename,
            referencedId
        );
    }

    [Fact]
    public async Task ChangedElementMetadata_WithALockStatus_SendsOneUpdateItem()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.LockDataElementsForDataType(setup.DataElement.DataType);

        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Null(update.ContentPartName);
        Assert.True(update.Locked);
        Assert.Equal(["signed"], update.Tags);
        Assert.True(setup.DataMutator.GetDataElement(setup.DataElement).Locked);
    }

    [Fact]
    public async Task ElementMetadata_OnAnAddedElement_IsSentWithTheCreate()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.Parse(setup.DataElement.Id);
        BinaryDataChange added = setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray(),
            metadata: [new KeyValueEntry { Key = "from-add", Value = "1" }]
        );

        SetAllMetadata(added.DataElement!, referencedId);
        await SaveChanges(setup);

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        StorageInstanceMutationCreateDataElement create = Assert.Single(mutation.CreateDataElements);
        AssertAllMetadata(
            create.Tags,
            create.Metadata,
            create.UserDefinedMetadata,
            create.Refs,
            create.Filename,
            referencedId
        );
    }

    [Fact]
    public async Task ElementMetadata_OnAnAddedElement_KeepsTheValuesGivenToTheAdd()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray(),
            metadata: [new KeyValueEntry { Key = "from-add", Value = "1" }]
        );

        await SaveChanges(setup);

        StorageInstanceMutationCreateDataElement create = Assert.Single(GetSingleMutation(setup).CreateDataElements);
        Assert.Equal("receipt.json", create.Filename);
        Assert.Equal([("from-add", "1")], create.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Null(create.Tags);
    }

    [Fact]
    public async Task ElementMetadata_SetToEqualValues_SendsNothing()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance =>
            {
                instance.Data[0].Tags = ["signed"];
                instance.Data[0].Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }];
            }
        );
        DataElement dataElement = setup.DataMutator.GetDataElement(setup.DataElement);

        dataElement.Tags = ["signed"];
        dataElement.Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }];
        dataElement.Filename = setup.DataElement.Filename;
        await SaveChanges(setup);

        Assert.Empty(GetMutationRequests(setup));
    }

    [Fact]
    public async Task ElementMetadata_WithARefToAnAddedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        BinaryDataChange added = setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray()
        );

        setup.DataMutator.GetDataElement(setup.DataElement).Refs = [added.DataElementIdentifier.Guid];

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("its id is assigned when the instance is saved", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ElementMetadata_WithTheFilenameRemoved_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.GetDataElement(setup.DataElement).Filename = null;

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("Storage cannot remove a filename", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemoveDataElement_AfterChangingItsMetadata_SendsOnlyTheDelete()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];

        setup.DataMutator.RemoveDataElement(setup.DataElement);
        await SaveChanges(setup);

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), Assert.Single(mutation.DeleteDataElements).DataElementId);
    }

    [Fact]
    public async Task ChangingAnotherElementProperty_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.GetDataElement(setup.DataElement).ContentType = "text/plain";

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains(
            $"DataElement {setup.DataElement.Id}.ContentType was changed",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task ChangingAnotherInstanceProperty_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.Instance.DueBefore = DateTime.UtcNow.AddDays(1);

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("Instance.DueBefore was changed", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task ChangedDataValues_AreSent_AndARemovedOrEmptyValueRemovesTheKey(string? removingValue)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance =>
                instance.DataValues = new()
                {
                    ["removed"] = "old",
                    ["emptied"] = "old",
                    ["kept"] = "same",
                }
        );
        Dictionary<string, string?> dataValues = setup.DataMutator.Instance.DataValues!;

        dataValues["added"] = "new";
        dataValues.Remove("removed");
        dataValues["emptied"] = removingValue;
        await SaveChanges(setup);

        Assert.Equal(
            new Dictionary<string, string?>
            {
                ["added"] = "new",
                ["removed"] = null,
                ["emptied"] = null,
            },
            GetSingleMutation(setup).DataValues
        );
    }

    [Fact]
    public async Task ChangedPresentationTexts_AreSent()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance => instance.PresentationTexts = new() { ["removed"] = "old" }
        );

        setup.DataMutator.Instance.PresentationTexts = new() { ["added"] = "new" };
        await SaveChanges(setup);

        Assert.Equal(
            new Dictionary<string, string?> { ["added"] = "new", ["removed"] = null },
            GetSingleMutation(setup).PresentationTexts
        );
    }

    [Theory]
    [InlineData(false, "Data value 'derived' was set in Instance.DataValues, but it is derived from dataFields")]
    [InlineData(true, "Data value 'derived' was removed from Instance.DataValues, but it is derived from dataFields")]
    public async Task ChangingAKeyInDataFields_Throws(bool remove, string expectedMessage)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance => instance.DataValues = new() { ["derived"] = "stored" }
        );
        setup.Services.AppMetadata.DataFields = [DerivedField()];

        setup.DataMutator.Instance.DataValues = remove ? new() : new() { ["derived"] = "x" };

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.StartsWith(expectedMessage, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ChangingAKeyInPresentationFields_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.Services.AppMetadata.PresentationFields = [DerivedField()];

        setup.DataMutator.Instance.PresentationTexts = new() { ["derived"] = "x" };

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("derived from presentationFields", exception.Message, StringComparison.Ordinal);
    }

    private static DataField DerivedField() =>
        new()
        {
            Id = "derived",
            DataTypeId = "payment-form",
            Path = nameof(PaymentForm.Status),
        };

    [Fact]
    public async Task SaveChanges_CalledTwice_SendsChangedElementMetadataOnce()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];

        await SaveChanges(setup);
        await SaveChanges(setup);

        Assert.Single(GetMutationRequests(setup));
    }

    [Fact]
    public async Task VerifyUnchangedSincePreviousChanges_AfterSavingInstanceChanges_DoesNotThrow()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.Instance.DataValues = new() { ["status"] = "paid" };
        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        setup.DataMutator.VerifyUnchangedSincePreviousChanges(changes);
    }

    [Fact]
    public async Task VerifyUnchangedSincePreviousChanges_WhenAValidatorChangesTheInstance_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        setup.DataMutator.Instance.PresentationTexts = new() { ["title"] = "Changed in a validator" };
        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["validated"];

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.VerifyUnchangedSincePreviousChanges(changes)
        );
        Assert.Equal(
            $"The instance has been changed by validators: presentation text 'title', metadata of data element {setup.DataElement.Id}",
            exception.Message
        );
    }

    [Fact]
    public async Task VerifyUnchangedSincePreviousChanges_WhenAValidatorChangesAnotherInstanceProperty_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await setup.DataMutator.SaveChanges(changes);

        setup.DataMutator.Instance.DueBefore = DateTime.UtcNow.AddDays(1);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.VerifyUnchangedSincePreviousChanges(changes)
        );
        Assert.Equal("The instance has been changed by validators", exception.Message);
        Assert.Contains("Instance.DueBefore was changed", exception.InnerException?.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetDataElementChanges_HoldsTheInstanceChanges_AndTheSaveSendsOnlyThose()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.Instance.DataValues = new() { ["collected"] = "yes" };
        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];

        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        setup.DataMutator.Instance.PresentationTexts = new() { ["afterwards"] = "not collected" };
        setup.DataMutator.GetDataElement(setup.DataElement).Tags.Add("not collected");
        await setup.DataMutator.SaveChanges(changes);

        Assert.Empty(changes.AllChanges);
        Assert.Equal(
            new Dictionary<string, string?> { ["collected"] = "yes" },
            changes.InstanceFieldChanges.DataValues
        );
        Assert.Equal(["signed"], Assert.Single(changes.DataElementMetadataChanges).Value.Tags);
        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Equal(new Dictionary<string, string?> { ["collected"] = "yes" }, mutation.DataValues);
        Assert.Empty(mutation.PresentationTexts);
        Assert.Equal(["signed"], Assert.Single(mutation.UpdateDataElements).Tags);
    }

    [Theory]
    [InlineData(nameof(DataElement.Locked))]
    [InlineData(nameof(DataElement.ContentType))]
    public async Task ElementMetadata_OnAnAddedElement_WithAnotherPropertyChanged_Throws(string property)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElement added = AddReceipt(setup).DataElement!;

        if (property == nameof(DataElement.Locked))
        {
            added.Locked = true;
        }
        else
        {
            added.ContentType = "text/plain";
        }

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains($"DataElement {added.Id}.{property} was changed", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ElementMetadata_OnAnAddedElement_WithTheFilenameRemoved_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        AddReceipt(setup).DataElement!.Filename = null;

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("Storage cannot remove a filename", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ElementMetadata_OnAnAddedElement_StartsWithTheMetadataGivenToTheAdd()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElement added = AddReceipt(setup).DataElement!;
        Assert.Equal([("from-add", "1")], added.Metadata?.Select(entry => (entry.Key, entry.Value)));

        added.Metadata = [new KeyValueEntry { Key = "replaced", Value = "2" }];
        await SaveChanges(setup);

        StorageInstanceMutationCreateDataElement create = Assert.Single(GetSingleMutation(setup).CreateDataElements);
        Assert.Equal([("replaced", "2")], create.Metadata?.Select(entry => (entry.Key, entry.Value)));
    }

    [Fact]
    public async Task ElementMetadata_OnAnAddedElement_WithARefToAnotherAddedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        BinaryDataChange first = AddReceipt(setup);

        AddReceipt(setup).DataElement!.Refs = [first.DataElementIdentifier.Guid];

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains("its id is assigned when the instance is saved", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(nameof(DataElement.IsRead))]
    [InlineData(nameof(DataElement.LastChanged))]
    [InlineData(nameof(DataElement.LastChangedBy))]
    [InlineData(nameof(DataElement.FileScanResult))]
    public async Task ElementsFromStorage_WithAPropertyStorageWrites_AreNotSaved(string property)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElement fromStorage = JsonSerializer.Deserialize<DataElement>(
            JsonSerializer.SerializeToUtf8Bytes(setup.DataMutator.GetDataElement(setup.DataElement))
        )!;
        switch (property)
        {
            case nameof(DataElement.IsRead):
                fromStorage.IsRead = !fromStorage.IsRead;
                break;
            case nameof(DataElement.LastChanged):
                fromStorage.LastChanged = DateTime.UtcNow.AddMinutes(1);
                break;
            case nameof(DataElement.LastChangedBy):
                fromStorage.LastChangedBy = "another signer";
                break;
            default:
                fromStorage.FileScanResult = Altinn.Platform.Storage.Interface.Enums.FileScanResult.Clean;
                break;
        }

        setup.DataMutator.Instance.Data = [fromStorage];
        await SaveChanges(setup);

        Assert.Empty(GetMutationRequests(setup));
    }

    [Theory]
    [InlineData(nameof(Instance.LastChanged))]
    [InlineData(nameof(Instance.LastChangedBy))]
    public async Task InstanceFromStorage_WithAPropertyStorageWrites_IsNotSaved(string property)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        if (property == nameof(Instance.LastChanged))
        {
            setup.DataMutator.Instance.LastChanged = DateTime.UtcNow.AddMinutes(1);
        }
        else
        {
            setup.DataMutator.Instance.LastChangedBy = "another signer";
        }
        await SaveChanges(setup);

        Assert.Empty(GetMutationRequests(setup));
    }

    [Fact]
    public async Task AddingAnElementToInstanceData_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var added = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "receipt" };

        setup.DataMutator.Instance.Data.Add(added);

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains(
            $"Data element {added.Id} was added to Instance.Data",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task RemovingAnElementFromInstanceData_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.Instance.Data = [];

        InstanceChangeNotSavableException exception = AssertChangesNotSavable(setup);
        Assert.Contains(
            $"Data element {setup.DataElement.Id} was removed from Instance.Data",
            exception.Message,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task RemoveDataElement_AndRemovingItFromInstanceData_SendsTheDelete()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElement dataElement = setup.DataMutator.GetDataElement(setup.DataElement);

        setup.DataMutator.RemoveDataElement(dataElement);
        setup.DataMutator.Instance.Data.Remove(dataElement);
        await SaveChanges(setup);

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), Assert.Single(mutation.DeleteDataElements).DataElementId);
    }

    [Fact]
    public async Task AddDataElementsCreatedByStorage_AddsTheNewElements_AndKeepsTheAppsChanges()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElement existing = setup.DataMutator.GetDataElement(setup.DataElement);
        existing.Tags = ["signed"];
        DataElement fromStorage = JsonSerializer.Deserialize<DataElement>(
            JsonSerializer.SerializeToUtf8Bytes(setup.DataMutator.GetDataElement(setup.DataElement))
        )!;
        fromStorage.Tags = [];
        var signature = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "receipt" };

        // As SigningUserAction does after Storage stored a signature.
        setup.DataMutator.AddDataElementsCreatedByStorage([fromStorage, signature]);

        Assert.Equal([existing, signature], setup.DataMutator.Instance.Data);
        await SaveChanges(setup);
        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), update.DataElementId);
        Assert.Equal(["signed"], update.Tags);
    }

    [Fact]
    public async Task RemoveDataElement_AfterChangingAnotherProperty_SendsOnlyTheDelete()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.GetDataElement(setup.DataElement).ContentType = "text/plain";

        setup.DataMutator.RemoveDataElement(setup.DataElement);
        await SaveChanges(setup);

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        Assert.Single(mutation.DeleteDataElements);
    }

    [Fact]
    public async Task ChangedElementMetadata_WithAnEntrysValueChanged_IsSent()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance =>
                instance.Data[0].Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }]
        );

        setup.DataMutator.GetDataElement(setup.DataElement).Metadata![0].Value = "no";
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal([("archive", "no")], update.Metadata?.Select(entry => (entry.Key, entry.Value)));
    }

    [Fact]
    public async Task ChangedElementMetadata_WithTheLockStatusItAlreadyHas_DoesNotSendIt()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance => instance.Data[0].Locked = true
        );
        setup.DataMutator.LockDataElementsForDataType(setup.DataElement.DataType);

        setup.DataMutator.GetDataElement(setup.DataElement).Tags = ["signed"];
        await SaveChanges(setup);

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Null(update.Locked);
        Assert.Equal(["signed"], update.Tags);
    }

    [Fact]
    public async Task DataValues_StoredEmpty_AndLeftAlone_AreNotSent()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            configureInstance: instance => instance.DataValues = new() { ["empty"] = "" }
        );

        await SaveChanges(setup);

        Assert.Empty(GetMutationRequests(setup));
    }

    [Fact]
    public void InstanceSaveProperties_AreTheOnesTheSaveSends()
    {
        // The analyzers read this list too. A property added to it must be sent by the save, and set by
        // SetAllMetadata or the data value and presentation text tests.
        Assert.Equal(
            [nameof(Instance.DataValues), nameof(Instance.PresentationTexts)],
            InstanceSaveProperties.Instance
        );
        Assert.Equal(
            [
                nameof(DataElement.Tags),
                nameof(DataElement.Metadata),
                nameof(DataElement.UserDefinedMetadata),
                nameof(DataElement.Refs),
                nameof(DataElement.Filename),
            ],
            InstanceSaveProperties.DataElement
        );
    }

    [Fact]
    public void InstanceSaveProperties_ListsTheTypesTheInstanceIsMadeOf()
    {
        // The analyzers report changes to properties of these types, so a type Storage adds to the instance must be
        // listed too.
        var types = new HashSet<Type>();
        var pending = new Queue<Type>([typeof(Instance)]);
        while (pending.TryDequeue(out Type? type))
        {
            if (type.Namespace != InstanceSaveProperties.TypeNamespace || !type.IsClass || !types.Add(type))
            {
                continue;
            }

            foreach (var property in type.GetProperties())
            {
                Type propertyType = property.PropertyType;
                pending.Enqueue(propertyType);
                foreach (Type argument in propertyType.GetGenericArguments())
                {
                    pending.Enqueue(argument);
                }
            }
        }
        types.Remove(typeof(KeyValueEntry));

        Assert.Equal(
            types.Select(type => type.Name).Order(StringComparer.Ordinal),
            InstanceSaveProperties.Types.Order(StringComparer.Ordinal)
        );
    }

    private static BinaryDataChange AddReceipt(BinaryDataUnitOfWorkSetup setup) =>
        setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray(),
            metadata: [new KeyValueEntry { Key = "from-add", Value = "1" }]
        );

    private static InstanceChangeNotSavableException AssertChangesNotSavable(BinaryDataUnitOfWorkSetup setup) =>
        Assert.Throws<InstanceChangeNotSavableException>(() =>
            setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false)
        );

    private static void SetAllMetadata(DataElement dataElement, Guid referencedId)
    {
        dataElement.Tags = ["signed"];
        dataElement.Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }];
        dataElement.UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }];
        dataElement.Refs = [referencedId];
        dataElement.Filename = "renamed.json";
    }

    private static void AssertAllMetadata(
        IReadOnlyList<string>? tags,
        IReadOnlyList<KeyValueEntry>? metadata,
        IReadOnlyList<KeyValueEntry>? userDefinedMetadata,
        IReadOnlyList<Guid>? refs,
        string? filename,
        Guid referencedId
    )
    {
        Assert.Equal(["signed"], tags);
        Assert.Equal([("archive", "yes")], metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([("case", "42")], userDefinedMetadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([referencedId], refs);
        Assert.Equal("renamed.json", filename);
    }

    private static Task SaveChanges(BinaryDataUnitOfWorkSetup setup) =>
        setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

    private static RequestResponse[] GetMutationRequests(BinaryDataUnitOfWorkSetup setup) =>
        setup
            .Services.Storage.RequestsResponses.Where(request =>
                request.RequestMethod == HttpMethod.Post
                && request.RequestUrl?.AbsolutePath.EndsWith("/mutations", StringComparison.Ordinal) == true
            )
            .ToArray();

    private static StorageInstanceMutationRequest GetSingleMutation(BinaryDataUnitOfWorkSetup setup) =>
        DeserializeMutationRequest(Assert.Single(GetMutationRequests(setup)).RequestBody!);

    private static byte[] GetStoredData(BinaryDataUnitOfWorkSetup setup, DataElement dataElement) =>
        setup.Services.Storage.GetInstanceAndData(setup.InstanceOwnerPartyId, setup.InstanceGuid).data[dataElement.Id];
}
