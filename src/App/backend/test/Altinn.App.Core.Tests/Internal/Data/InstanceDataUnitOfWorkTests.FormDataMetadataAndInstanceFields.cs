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
    public async Task ReplaceFormData_SavesTheReplacement_AndGetFormDataReturnsIt()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created", CustomerName = "Original" },
            BlobVersion(1)
        );
        var replacement = new PaymentForm { Status = "replaced", CustomerName = "Replaced" };

        await setup.DataMutator.ReplaceFormData(formDataElement, replacement);
        PaymentForm current = await setup.DataMutator.GetFormData<PaymentForm>(formDataElement);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal("replaced", current.Status);
        Assert.Equal("Replaced", current.CustomerName);
        Assert.Equal(SerializePaymentForm(setup, formDataElement, replacement), GetStoredData(setup, formDataElement));
    }

    [Fact]
    public async Task ReplaceFormData_ChangesToTheModelAfterTheCall_AreNotSaved()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        var replacement = new PaymentForm { Status = "replaced" };

        await setup.DataMutator.ReplaceFormData(formDataElement, replacement);
        replacement.Status = "changed after the call";
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(
            SerializePaymentForm(setup, formDataElement, new PaymentForm { Status = "replaced" }),
            GetStoredData(setup, formDataElement)
        );
    }

    [Fact]
    public async Task ReplaceFormData_KeepsTheObjectGetFormDataReturned_AndReturnsIt()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        PaymentForm form = await setup.DataMutator.GetFormData<PaymentForm>(formDataElement);

        PaymentForm returned = await setup.DataMutator.ReplaceFormData(
            formDataElement,
            new PaymentForm { Status = "replaced" }
        );
        form.CustomerName = "Changed through the first object";
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Same(form, returned);
        Assert.Same(form, await setup.DataMutator.GetFormData<PaymentForm>(formDataElement));
        Assert.Equal(
            SerializePaymentForm(
                setup,
                formDataElement,
                new PaymentForm { Status = "replaced", CustomerName = "Changed through the first object" }
            ),
            GetStoredData(setup, formDataElement)
        );
    }

    [Fact]
    public async Task ReplaceFormData_WithTheCachedObject_KeepsItAsTheFormData()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        PaymentForm form = await setup.DataMutator.GetFormData<PaymentForm>(formDataElement);

        await setup.DataMutator.ReplaceFormData(formDataElement, form);
        form.Status = "after the call";
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(
            SerializePaymentForm(setup, formDataElement, new PaymentForm { Status = "after the call" }),
            GetStoredData(setup, formDataElement)
        );
    }

    [Fact]
    public async Task ReplaceFormData_GivesRowsWithoutARowIdOne()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );

        await setup.DataMutator.ReplaceFormData(
            formDataElement,
            new PaymentForm { Lines = [new PaymentLine { Description = "first" }, new PaymentLine()] }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        PaymentForm stored = JsonSerializer.Deserialize<PaymentForm>(
            GetStoredData(setup, formDataElement),
            JsonSerializerOptions.Web
        )!;
        Assert.All(stored.Lines!, line => Assert.NotEqual(Guid.Empty, line.AltinnRowId));
    }

    [Fact]
    public async Task ReplaceFormData_WithAModelOfAnotherClass_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.ReplaceFormData(formDataElement, new object())
        );

        Assert.Contains("applicationmetadata.json specifies", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReplaceFormData_ForAnAddedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        FormDataChange added = setup.DataMutator.AddFormDataElement(formDataElement.DataType, new PaymentForm());

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.ReplaceFormData(added.DataElementIdentifier, new PaymentForm())
        );

        Assert.Contains("change the object passed to AddFormDataElement", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReplaceFormData_ForAnAddedElementAfterTheSave_ReplacesIt()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        FormDataChange added = setup.DataMutator.AddFormDataElement(formDataElement.DataType, new PaymentForm());
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        await setup.DataMutator.ReplaceFormData(added.DataElementIdentifier, new PaymentForm { Status = "replaced" });

        PaymentForm current = await setup.DataMutator.GetFormData<PaymentForm>(added.DataElementIdentifier);
        Assert.Equal("replaced", current.Status);
    }

    [Fact]
    public async Task ReplaceFormData_ForARemovedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        setup.DataMutator.RemoveDataElement(formDataElement);

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.ReplaceFormData(formDataElement, new PaymentForm())
        );

        Assert.Contains("is marked for deletion", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ReplaceFormData_ForABinaryElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.ReplaceFormData(setup.DataElement, new PaymentForm())
        );

        Assert.Contains("does not have a class reference", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_OnAnExistingElement_SendsAMetadataOnlyUpdate()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.NewGuid();

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate
            {
                Tags = ["signed"],
                Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }],
                UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }],
                Refs = [referencedId],
                Filename = "renamed.json",
            }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), update.DataElementId);
        Assert.Null(update.ContentPartName);
        Assert.Null(update.Locked);
        Assert.Equal(["signed"], update.Tags);
        Assert.Equal([("archive", "yes")], update.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([("case", "42")], update.UserDefinedMetadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([referencedId], update.Refs);
        Assert.Equal("renamed.json", update.Filename);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_OnAnExistingElement_SavesWithTheDataTypesAuthenticationMethod()
    {
        AuthenticationResolutionSetup setup = CreateAuthenticationResolutionSetup(1);
        StorageAuthenticationMethod method = StorageAuthenticationMethod.ServiceOwner("scope:a");
        setup.UnitOfWork.OverrideAuthenticationMethod(setup.DataTypes[0], method);

        setup.UnitOfWork.UpdateDataElementMetadata(
            setup.DataElements[0],
            new DataElementMetadataUpdate { Tags = ["signed"] }
        );
        await setup.UnitOfWork.SaveChanges(setup.UnitOfWork.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Same(method, setup.AuthenticationMethod);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_ShowsTheValuesOnTheInstanceBeforeTheSave()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.NewGuid();

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate
            {
                Tags = ["signed"],
                Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }],
                UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }],
                Refs = [referencedId],
                Filename = "renamed.json",
            }
        );

        DataElement dataElement = setup.DataMutator.GetDataElement(setup.DataElement);
        Assert.Equal(["signed"], dataElement.Tags);
        Assert.Equal([("archive", "yes")], dataElement.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([("case", "42")], dataElement.UserDefinedMetadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([referencedId], dataElement.Refs);
        Assert.Equal("renamed.json", dataElement.Filename);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_ChangesToTheCallersListsAfterTheCall_AreNotSaved()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        List<string> tags = ["signed"];
        var metadataEntry = new KeyValueEntry { Key = "archive", Value = "yes" };

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = tags, Metadata = [metadataEntry] }
        );
        tags.Add("added after the call");
        metadataEntry.Value = "changed after the call";
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(["signed"], update.Tags);
        Assert.Equal([("archive", "yes")], update.Metadata?.Select(entry => (entry.Key, entry.Value)));
    }

    [Fact]
    public async Task UpdateDataElementMetadata_WithAContentUpdate_SendsOneUpdateItem()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var referencedId = Guid.NewGuid();
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate
            {
                Tags = ["signed"],
                Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }],
                UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }],
                Refs = [referencedId],
                Filename = "renamed.json",
            }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.NotNull(update.ContentPartName);
        Assert.Equal(["signed"], update.Tags);
        Assert.Equal([("archive", "yes")], update.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([("case", "42")], update.UserDefinedMetadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([referencedId], update.Refs);
        Assert.Equal("renamed.json", update.Filename);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_WithALockStatus_SendsOneUpdateItem()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.LockDataElementsForDataType(setup.DataElement.DataType);

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = ["signed"] }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Null(update.ContentPartName);
        Assert.True(update.Locked);
        Assert.Equal(["signed"], update.Tags);
        Assert.True(setup.DataMutator.GetDataElement(setup.DataElement).Locked);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_OnAnAddedElement_SendsTheValuesWithTheCreate()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        BinaryDataChange added = setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray(),
            metadata: [new KeyValueEntry { Key = "from-add", Value = "1" }]
        );

        setup.DataMutator.UpdateDataElementMetadata(
            added.DataElementIdentifier,
            new DataElementMetadataUpdate
            {
                Tags = ["signed"],
                Metadata = [new KeyValueEntry { Key = "from-update", Value = "2" }],
                UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }],
                Refs = [Guid.Parse(setup.DataElement.Id)],
                Filename = "named.json",
            }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        StorageInstanceMutationCreateDataElement create = Assert.Single(mutation.CreateDataElements);
        Assert.Equal(["signed"], create.Tags);
        Assert.Equal([("from-update", "2")], create.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([("case", "42")], create.UserDefinedMetadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal([Guid.Parse(setup.DataElement.Id)], create.Refs);
        Assert.Equal("named.json", create.Filename);
    }

    public static TheoryData<DataElementMetadataUpdate> SecondMetadataUpdates =>
        new()
        {
            new DataElementMetadataUpdate { Tags = ["second"] },
            new DataElementMetadataUpdate { Filename = "second.json" },
        };

    [Theory]
    [MemberData(nameof(SecondMetadataUpdates))]
    public async Task UpdateDataElementMetadata_CalledTwice_SendsTheLastValueOfEachProperty(
        DataElementMetadataUpdate second
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        var first = new DataElementMetadataUpdate
        {
            Tags = ["first"],
            Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }],
            UserDefinedMetadata = [new KeyValueEntry { Key = "case", Value = "42" }],
            Refs = [Guid.NewGuid()],
            Filename = "first.json",
        };

        setup.DataMutator.UpdateDataElementMetadata(setup.DataElement, first);
        setup.DataMutator.UpdateDataElementMetadata(setup.DataElement, second);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(second.Tags ?? first.Tags, update.Tags);
        Assert.Equal(
            (second.Metadata ?? first.Metadata)!.Select(entry => (entry.Key, entry.Value)),
            update.Metadata?.Select(entry => (entry.Key, entry.Value))
        );
        Assert.Equal(
            (second.UserDefinedMetadata ?? first.UserDefinedMetadata)!.Select(entry => (entry.Key, entry.Value)),
            update.UserDefinedMetadata?.Select(entry => (entry.Key, entry.Value))
        );
        Assert.Equal(second.Refs ?? first.Refs, update.Refs);
        Assert.Equal(second.Filename ?? first.Filename, update.Filename);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_WithNoValues_ChangesNothing()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.UpdateDataElementMetadata(setup.DataElement, new DataElementMetadataUpdate());
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Empty(GetMutationRequests(setup));
    }

    [Fact]
    public async Task UpdateDataElementMetadata_ForAnUnknownElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateDataElementMetadata(
                new DataElementIdentifier(Guid.NewGuid()),
                new DataElementMetadataUpdate { Tags = ["signed"] }
            )
        );

        Assert.Contains("not found on instance", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_ForARemovedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.RemoveDataElement(setup.DataElement);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateDataElementMetadata(
                setup.DataElement,
                new DataElementMetadataUpdate { Tags = ["signed"] }
            )
        );

        Assert.Contains("is marked for deletion", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_WithARefToAnAddedElement_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        BinaryDataChange added = setup.DataMutator.AddBinaryDataElement(
            "receipt",
            "application/json",
            "receipt.json",
            "{}"u8.ToArray()
        );

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateDataElementMetadata(
                setup.DataElement,
                new DataElementMetadataUpdate { Refs = [added.DataElementIdentifier.Guid] }
            )
        );

        Assert.Contains("its id is assigned when the instance is saved", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemoveDataElement_AfterUpdateDataElementMetadata_SendsOnlyTheDelete()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = ["signed"] }
        );

        setup.DataMutator.RemoveDataElement(setup.DataElement);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Empty(mutation.UpdateDataElements);
        Assert.Equal(Guid.Parse(setup.DataElement.Id), Assert.Single(mutation.DeleteDataElements).DataElementId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task SetDataValue_SetsAKeyOrRemovesItForNullOrEmpty_OnTheInstanceAndInTheSave(string? removingValue)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        Instance instance = setup.DataMutator.Instance;
        instance.DataValues = new() { ["removed"] = "old" };

        setup.DataMutator.SetDataValue("added", "new");
        setup.DataMutator.SetDataValue("removed", removingValue);
        Dictionary<string, string?>? shownBeforeTheSave = instance.DataValues is { } shown ? new(shown) : null;
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(new Dictionary<string, string?> { ["added"] = "new" }, shownBeforeTheSave);
        Assert.Equal(
            new Dictionary<string, string?> { ["added"] = "new", ["removed"] = removingValue },
            GetSingleMutation(setup).DataValues
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task SetPresentationText_SetsAKeyOrRemovesItForNullOrEmpty_OnTheInstanceAndInTheSave(
        string? removingValue
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        Instance instance = setup.DataMutator.Instance;
        instance.PresentationTexts = new() { ["removed"] = "old" };

        setup.DataMutator.SetPresentationText("added", "new");
        setup.DataMutator.SetPresentationText("removed", removingValue);
        Dictionary<string, string?>? shownBeforeTheSave = instance.PresentationTexts is { } shown ? new(shown) : null;
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(new Dictionary<string, string?> { ["added"] = "new" }, shownBeforeTheSave);
        Assert.Equal(
            new Dictionary<string, string?> { ["added"] = "new", ["removed"] = removingValue },
            GetSingleMutation(setup).PresentationTexts
        );
    }

    [Fact]
    public async Task SetDataValue_ForAKeyInDataFields_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.Services.AppMetadata.DataFields = [DerivedField()];

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.SetDataValue("derived", "x")
        );

        Assert.Contains("derived from dataFields", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SetPresentationText_ForAKeyInPresentationFields_Throws()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.Services.AppMetadata.PresentationFields = [DerivedField()];

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.SetPresentationText("derived", "x")
        );

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
    public async Task SaveChanges_CalledTwice_SendsStagedElementMetadataOnce()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = ["signed"] }
        );

        await SaveChangesTwice(setup);

        Assert.Single(GetMutationRequests(setup));
    }

    [Fact]
    public async Task SaveChanges_CalledTwice_SendsAStagedPresentationTextOnce()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        setup.DataMutator.SetPresentationText("title", "Application");

        await SaveChangesTwice(setup);

        Assert.Single(GetMutationRequests(setup));
    }

    private static async Task SaveChangesTwice(BinaryDataUnitOfWorkSetup setup)
    {
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));
    }

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
