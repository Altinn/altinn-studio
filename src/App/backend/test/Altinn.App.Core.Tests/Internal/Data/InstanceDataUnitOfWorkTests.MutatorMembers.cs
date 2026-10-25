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
    public async Task GetFormDataCopy_IncludesChangesMadeInMemory()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        var form = Assert.IsType<PaymentForm>(await setup.DataMutator.GetFormData(formDataElement));
        form.Status = "paid";

        PaymentForm copy = await setup.DataMutator.GetFormDataCopy<PaymentForm>(formDataElement);

        Assert.Equal("paid", copy.Status);
    }

    [Fact]
    public async Task GetFormDataCopy_ChangesToTheCopy_AreNotSaved()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );

        PaymentForm copy = await setup.DataMutator.GetFormDataCopy<PaymentForm>(formDataElement);
        copy.Status = "changed";

        Assert.Empty(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false).AllChanges);
        Assert.Equal("created", (await setup.DataMutator.GetFormData<PaymentForm>(formDataElement)).Status);
    }

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
    public async Task ReplaceFormData_WithTheCachedObject_SavesItsStateAtTheCall()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        PaymentForm form = await setup.DataMutator.GetFormData<PaymentForm>(formDataElement);
        form.Status = "at the call";

        await setup.DataMutator.ReplaceFormData(formDataElement, form);
        form.Status = "after the call";
        PaymentForm current = await setup.DataMutator.GetFormData<PaymentForm>(formDataElement);
        current.CustomerName = "Changed through the new object";
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.NotSame(form, current);
        Assert.Equal(
            SerializePaymentForm(
                setup,
                formDataElement,
                new PaymentForm { Status = "at the call", CustomerName = "Changed through the new object" }
            ),
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

    [Theory]
    [InlineData("anotherClass", "applicationmetadata.json specifies")]
    [InlineData("addedElement", "change the object passed to AddFormDataElement")]
    [InlineData("removedElement", "is marked for deletion")]
    [InlineData("binaryElement", "does not have a class reference")]
    public async Task ReplaceFormData_ForAnElementItCannotReplace_Throws(string target, string expectedMessage)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("{}"u8.ToArray(), blobVersionId: BlobVersion(1));
        DataElement formDataElement = AddPersistedPaymentForm(
            setup,
            new PaymentForm { Status = "created" },
            BlobVersion(1)
        );
        DataElementIdentifier dataElementIdentifier = formDataElement;
        object model = new PaymentForm();
        switch (target)
        {
            case "anotherClass":
                model = new object();
                break;
            case "addedElement":
                dataElementIdentifier = setup
                    .DataMutator.AddFormDataElement(formDataElement.DataType, new PaymentForm())
                    .DataElementIdentifier;
                break;
            case "removedElement":
                setup.DataMutator.RemoveDataElement(formDataElement);
                break;
            case "binaryElement":
                dataElementIdentifier = setup.DataElement;
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(target));
        }

        InvalidOperationException exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            setup.DataMutator.ReplaceFormData(dataElementIdentifier, model)
        );

        Assert.Contains(expectedMessage, exception.Message, StringComparison.Ordinal);
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
        setup.DataMutator.UpdateBinaryDataElement(
            setup.DataElement,
            setup.DataElement.ContentType!,
            "updated"u8.ToArray()
        );

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = ["signed"], Filename = "renamed.json" }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.NotNull(update.ContentPartName);
        Assert.Equal(["signed"], update.Tags);
        Assert.Equal("renamed.json", update.Filename);
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

    [Fact]
    public async Task UpdateDataElementMetadata_CalledTwice_KeepsTheLastValueOfEachProperty()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate { Tags = ["signed"], Filename = "first.json" }
        );
        setup.DataMutator.UpdateDataElementMetadata(
            setup.DataElement,
            new DataElementMetadataUpdate
            {
                Metadata = [new KeyValueEntry { Key = "archive", Value = "yes" }],
                Filename = "second.json",
            }
        );
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        StorageInstanceMutationUpdateDataElement update = Assert.Single(GetSingleMutation(setup).UpdateDataElements);
        Assert.Equal(["signed"], update.Tags);
        Assert.Equal([("archive", "yes")], update.Metadata?.Select(entry => (entry.Key, entry.Value)));
        Assert.Equal("second.json", update.Filename);
    }

    [Fact]
    public async Task UpdateDataElementMetadata_WithNoValues_ChangesNothing()
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());

        setup.DataMutator.UpdateDataElementMetadata(setup.DataElement, new DataElementMetadataUpdate());
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Empty(GetMutationRequests(setup));
    }

    [Theory]
    [InlineData("unknownElement", "not found on instance")]
    [InlineData("removedElement", "is marked for deletion")]
    [InlineData("refToAddedElement", "its id is assigned when the instance is saved")]
    public async Task UpdateDataElementMetadata_ForATargetItCannotChange_Throws(string target, string expectedMessage)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        DataElementIdentifier dataElementIdentifier = setup.DataElement;
        var update = new DataElementMetadataUpdate { Tags = ["signed"] };
        switch (target)
        {
            case "unknownElement":
                dataElementIdentifier = new DataElementIdentifier(Guid.NewGuid());
                break;
            case "removedElement":
                setup.DataMutator.RemoveDataElement(setup.DataElement);
                break;
            case "refToAddedElement":
                BinaryDataChange added = setup.DataMutator.AddBinaryDataElement(
                    "receipt",
                    "application/json",
                    "receipt.json",
                    "{}"u8.ToArray()
                );
                update = new DataElementMetadataUpdate { Refs = [added.DataElementIdentifier.Guid] };
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(target));
        }

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            setup.DataMutator.UpdateDataElementMetadata(dataElementIdentifier, update)
        );

        Assert.Contains(expectedMessage, exception.Message, StringComparison.Ordinal);
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
    [InlineData(false, null)]
    [InlineData(false, "")]
    [InlineData(true, null)]
    [InlineData(true, "")]
    public async Task SetDataValueOrPresentationText_SetsAKeyOrRemovesItForNullOrEmpty_OnTheInstanceAndInTheSave(
        bool presentationText,
        string? removingValue
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        Instance instance = setup.DataMutator.Instance;
        Dictionary<string, string?> existing = new() { ["removed"] = "old" };
        if (presentationText)
        {
            instance.PresentationTexts = existing;
        }
        else
        {
            instance.DataValues = existing;
        }
        Action<string, string?> set = presentationText
            ? setup.DataMutator.SetPresentationText
            : setup.DataMutator.SetDataValue;

        set("added", "new");
        set("removed", removingValue);
        Dictionary<string, string?>? shown = presentationText ? instance.PresentationTexts : instance.DataValues;
        Dictionary<string, string?>? shownBeforeTheSave = shown is null ? null : new(shown);
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Equal(new Dictionary<string, string?> { ["added"] = "new" }, shownBeforeTheSave);
        StorageInstanceMutationRequest mutation = GetSingleMutation(setup);
        Assert.Equal(
            new Dictionary<string, string?> { ["added"] = "new", ["removed"] = removingValue },
            presentationText ? mutation.PresentationTexts : mutation.DataValues
        );
    }

    [Theory]
    [InlineData(false, "dataFields")]
    [InlineData(true, "presentationFields")]
    public async Task SetDataValueOrPresentationText_ForAKeyDerivedFromTheModel_Throws(
        bool presentationText,
        string expectedSetting
    )
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        List<DataField> fields =
        [
            new DataField
            {
                Id = "derived",
                DataTypeId = "payment-form",
                Path = nameof(PaymentForm.Status),
            },
        ];
        if (presentationText)
        {
            setup.Services.AppMetadata.PresentationFields = fields;
        }
        else
        {
            setup.Services.AppMetadata.DataFields = fields;
        }
        Action<string, string?> set = presentationText
            ? setup.DataMutator.SetPresentationText
            : setup.DataMutator.SetDataValue;

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() => set("derived", "x"));

        Assert.Contains($"derived from {expectedSetting}", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SetSubstatus_IsShownOnTheInstanceAndSentWithUserAndWorkflowSaves(bool workflowOwned)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create(
            "initial"u8.ToArray(),
            new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 3),
            seedStorageVersions: true
        );

        setup.DataMutator.SetSubstatus(new Substatus { Label = "awaiting-payment", Description = "Waiting" });
        Substatus? shown = setup.DataMutator.Instance.Status?.Substatus;
        DataElementChanges changes = setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        if (workflowOwned)
        {
            await setup.DataMutator.SaveWorkflowOwnedAggregate(
                changes,
                "workflow-substatus-key",
                CancellationToken.None
            );
        }
        else
        {
            await setup.DataMutator.SaveChanges(changes);
        }

        Assert.Equal(("awaiting-payment", "Waiting"), (shown?.Label, shown?.Description));
        Substatus? sent = GetSingleMutation(setup).Substatus;
        Assert.Equal(("awaiting-payment", "Waiting"), (sent?.Label, sent?.Description));
    }

    [Theory]
    [InlineData("metadata")]
    [InlineData("presentationText")]
    [InlineData("substatus")]
    public async Task SaveChanges_CalledTwice_SendsAStagedInstanceChangeOnce(string member)
    {
        await using var setup = await BinaryDataUnitOfWorkSetup.Create("initial"u8.ToArray());
        switch (member)
        {
            case "metadata":
                setup.DataMutator.UpdateDataElementMetadata(
                    setup.DataElement,
                    new DataElementMetadataUpdate { Tags = ["signed"] }
                );
                break;
            case "presentationText":
                setup.DataMutator.SetPresentationText("title", "Application");
                break;
            case "substatus":
                setup.DataMutator.SetSubstatus(new Substatus { Label = "awaiting-payment" });
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(member));
        }

        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));
        await setup.DataMutator.SaveChanges(setup.DataMutator.GetDataElementChanges(initializeAltinnRowId: false));

        Assert.Single(GetMutationRequests(setup));
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
