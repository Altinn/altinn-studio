using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Integration.Tests.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.Storage;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public sealed class LocalTestInstanceMutationTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string IfInstanceVersionMatchHeader = "If-Instance-Version-Match";
    private const string IdempotencyKeyHeader = "Idempotency-Key";
    private const string InstanceVersionHeader = "Instance-Version";
    private const string ProcessStateVersionHeader = "Process-State-Version";
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    public async Task CommitMutation_WhenCreateDataElementIsPostedTwiceWithSameIdempotencyKey_ReplaysCreatedDataElementIds()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        string idempotencyKey = Guid.NewGuid().ToString();

        using HttpResponseMessage firstResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey
        );
        MutationResponse firstMutation = await ReadMutationResponse(firstResponse);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.False(firstMutation.Replayed);
        string createdDataElementId = Assert.Single(firstMutation.CreatedDataElementIds ?? []);

        using HttpResponseMessage contentResponse = await GetStorageDataElementContent(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            Guid.Parse(createdDataElementId)
        );
        Assert.Equal(HttpStatusCode.OK, contentResponse.StatusCode);
        string? expectedContentETag = contentResponse.Headers.ETag?.ToString();
        AssertMutationContentETag(firstMutation, createdDataElementId, expectedContentETag);

        using HttpResponseMessage replayResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey
        );
        MutationResponse replayMutation = await ReadMutationResponse(replayResponse);

        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.True(replayMutation.Replayed);
        Assert.Equal(firstMutation.CreatedDataElementIds, replayMutation.CreatedDataElementIds);
        AssertMutationContentETag(replayMutation, createdDataElementId, expectedContentETag);

        using HttpResponseMessage storedResponse = await GetStorageInstance(fixture, token, ownerPartyId, instanceGuid);
        Instance storedInstance = await ReadJson<Instance>(storedResponse);
        DataElement attachment = Assert.Single(storedInstance.Data, data => data.DataType == "attachment");
        Assert.Equal(createdDataElementId, attachment.Id);
    }

    [Fact]
    public async Task CommitMutation_WhenDeleteInstanceIsReplayed_ReturnsDeleteMarkersAndSingleDeletedEvent()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        string idempotencyKey = Guid.NewGuid().ToString();

        using HttpResponseMessage firstResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey,
            new { deleteInstance = new { hard = true } }
        );
        MutationResponse firstMutation = await ReadMutationResponse(firstResponse);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.False(firstMutation.Replayed);
        AssertDeleteMarkers(firstMutation.Instance);

        using HttpResponseMessage replayResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey,
            new { deleteInstance = new { hard = true } }
        );
        MutationResponse replayMutation = await ReadMutationResponse(replayResponse);

        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.True(replayMutation.Replayed);
        AssertDeleteMarkers(replayMutation.Instance);

        using HttpResponseMessage eventsResponse = await GetInstanceEvents(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            InstanceEventType.Deleted
        );
        InstanceEventList events = await ReadJson<InstanceEventList>(eventsResponse);
        InstanceEvent deletedEvent = Assert.Single(events.InstanceEvents);
        Assert.Equal(InstanceEventType.Deleted.ToString(), deletedEvent.EventType);
        Assert.Equal($"{ownerPartyId}/{instanceGuid}", deletedEvent.InstanceId);
    }

    [Fact]
    public async Task CommitMutation_WhenDeletedDataElementMutationIsReplayed_ReturnsBeforeCurrentDataValidation()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int deleteVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        string idempotencyKey = Guid.NewGuid().ToString();
        using HttpResponseMessage firstResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        MutationResponse firstMutation = await ReadMutationResponse(firstResponse);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.False(firstMutation.Replayed);

        using HttpResponseMessage replayResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        MutationResponse replayMutation = await ReadMutationResponse(replayResponse);

        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.True(replayMutation.Replayed);
        Assert.DoesNotContain(replayMutation.Instance?.Data ?? [], dataElement => dataElement.Id == dataElementId);
    }

    [Fact]
    public async Task CommitMutation_WhenIdempotencyKeyIsReusedForAnotherInstance_ReturnsConflict()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance firstInstance = await CreateInstance(fixture, token, partyId: 501337);
        Instance secondInstance = await CreateInstance(fixture, token, partyId: 501337);
        (int firstOwnerPartyId, Guid firstInstanceGuid) = SplitInstanceId(firstInstance);
        (int secondOwnerPartyId, Guid secondInstanceGuid) = SplitInstanceId(secondInstance);
        int firstVersion = await GetCurrentInstanceVersion(fixture, token, firstOwnerPartyId, firstInstanceGuid);
        int secondVersion = await GetCurrentInstanceVersion(fixture, token, secondOwnerPartyId, secondInstanceGuid);
        string idempotencyKey = Guid.NewGuid().ToString();

        using HttpResponseMessage firstResponse = await PostJsonMutation(
            fixture,
            token,
            firstOwnerPartyId,
            firstInstanceGuid,
            firstVersion,
            idempotencyKey,
            new { dataValues = new Dictionary<string, string> { ["key-owner"] = "first" } }
        );
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using HttpResponseMessage secondResponse = await PostJsonMutation(
            fixture,
            token,
            secondOwnerPartyId,
            secondInstanceGuid,
            secondVersion,
            idempotencyKey,
            new { dataValues = new Dictionary<string, string> { ["key-owner"] = "second" } }
        );

        string body = await secondResponse.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);
        Assert.Contains("Idempotency key was already used for another instance.", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CommitMutation_WhenIdempotentMutationIsReplayedAfterInstanceAdvanced_ReturnsVersionMismatch()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int originalVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        string idempotencyKey = Guid.NewGuid().ToString();

        using HttpResponseMessage firstResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            originalVersion,
            idempotencyKey,
            new { dataValues = new Dictionary<string, string> { ["first"] = "value" } }
        );
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        int advancedFromVersion = GetVersionHeaders(firstResponse).InstanceVersion;
        using HttpResponseMessage advanceResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            advancedFromVersion,
            idempotencyKey: null,
            new { presentationTexts = new Dictionary<string, string> { ["title"] = "advanced" } }
        );
        Assert.Equal(HttpStatusCode.OK, advanceResponse.StatusCode);

        using HttpResponseMessage replayResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            originalVersion,
            idempotencyKey,
            new { dataValues = new Dictionary<string, string> { ["first"] = "value" } }
        );

        Assert.Equal(HttpStatusCode.PreconditionFailed, replayResponse.StatusCode);
    }

    [Fact]
    public async Task CommitMutation_WhenStaleIdempotencyKeyHasNoRecord_ReturnsVersionMismatch()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int originalVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage advanceResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            originalVersion,
            idempotencyKey: null,
            new { dataValues = new Dictionary<string, string> { ["advanced"] = "true" } }
        );
        Assert.Equal(HttpStatusCode.OK, advanceResponse.StatusCode);

        using HttpResponseMessage replayResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            originalVersion,
            Guid.NewGuid().ToString(),
            new { dataValues = new Dictionary<string, string> { ["advanced"] = "true" } }
        );

        Assert.Equal(HttpStatusCode.PreconditionFailed, replayResponse.StatusCode);
    }

    [Fact]
    public async Task CommitMutation_WhenCreateAndInstanceUpdateAreApplied_UsesOneMutationTimestamp()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage response = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: null,
            mutationExtras: new { dataValues = new Dictionary<string, string> { ["source"] = "mutation" } }
        );
        MutationResponse mutation = await ReadMutationResponse(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string createdDataElementId = Assert.Single(mutation.CreatedDataElementIds ?? []);
        DataElement createdDataElement = Assert.Single(
            mutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == createdDataElementId
        );
        Assert.Equal(createdDataElement.LastChanged, mutation.Instance?.LastChanged);
        Assert.Equal(createdDataElement.LastChangedBy, mutation.Instance?.LastChangedBy);
        Assert.Equal(createdDataElement.Created, createdDataElement.LastChanged);
        Assert.Equal(createdDataElement.CreatedBy, createdDataElement.LastChangedBy);
    }

    [Fact]
    public async Task CommitMutation_WhenMetadataOnlyUpdateTouchesLockedElement_StampsElementFromMutationTimestamp()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null,
            locked: true
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);
        DataElement createdDataElement = Assert.Single(
            createMutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == dataElementId
        );
        Assert.True(createdDataElement.Locked);

        await Task.Delay(TimeSpan.FromMilliseconds(20));

        int updateVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage updateResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            updateVersion,
            idempotencyKey: null,
            new { updateDataElements = new[] { new { dataElementId, tags = new[] { "metadata-only" } } } }
        );
        MutationResponse updateMutation = await ReadMutationResponse(updateResponse);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        DataElement updatedDataElement = Assert.Single(
            updateMutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == dataElementId
        );
        Assert.Equal(updateMutation.Instance?.LastChanged, updatedDataElement.LastChanged);
        Assert.Equal(updateMutation.Instance?.LastChangedBy, updatedDataElement.LastChangedBy);
        Assert.True(updatedDataElement.LastChanged > createdDataElement.LastChanged);
        Assert.Contains("metadata-only", updatedDataElement.Tags ?? []);
    }

    [Fact]
    public async Task CommitMutation_WhenCreateAndContentUpdateAreApplied_StampsTouchedElementsFromMutationTimestamp()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string updatedDataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int updateVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage updateResponse = await PostCreateAndUpdateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            updateVersion,
            updatedDataElementId
        );
        MutationResponse updateMutation = await ReadMutationResponse(updateResponse);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        string createdDataElementId = Assert.Single(updateMutation.CreatedDataElementIds ?? []);
        DataElement createdDataElement = Assert.Single(
            updateMutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == createdDataElementId
        );
        DataElement updatedDataElement = Assert.Single(
            updateMutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == updatedDataElementId
        );
        Assert.Equal(updateMutation.Instance?.LastChanged, createdDataElement.LastChanged);
        Assert.Equal(updateMutation.Instance?.LastChangedBy, createdDataElement.LastChangedBy);
        Assert.Equal(updateMutation.Instance?.LastChanged, updatedDataElement.LastChanged);
        Assert.Equal(updateMutation.Instance?.LastChangedBy, updatedDataElement.LastChangedBy);
        Assert.Equal("updated-by-mutation.txt", updatedDataElement.Filename);
        Assert.Equal("true", updateMutation.Instance?.DataValues?["mixed-content-update"]);
    }

    [Fact]
    public async Task CommitMutation_WhenLastReadDataElementIsDeleted_SetsInstanceUnread()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        using HttpResponseMessage readStatusResponse = await PutReadStatus(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            ReadStatus.Read
        );
        Assert.Equal(HttpStatusCode.OK, readStatusResponse.StatusCode);

        int deleteVersion = GetVersionHeaders(readStatusResponse).InstanceVersion;
        using HttpResponseMessage deleteResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey: null,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        MutationResponse deleteMutation = await ReadMutationResponse(deleteResponse);

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        Assert.Equal(ReadStatus.Unread, deleteMutation.Instance?.Status?.ReadStatus);
        Assert.DoesNotContain(deleteMutation.Instance?.Data ?? [], dataElement => dataElement.Id == dataElementId);
        Assert.DoesNotContain(deleteMutation.Instance?.Data ?? [], dataElement => dataElement.IsRead);
    }

    [Fact]
    public async Task CommitMutation_WhenLockedDataElementIsDeletedWithoutIgnoreLock_ReturnsConflict()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null,
            locked: true
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int deleteVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage deleteResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey: null,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        string body = await deleteResponse.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Conflict, deleteResponse.StatusCode);
        Assert.Contains(
            $"Data element {dataElementId} is locked and cannot be updated or deleted.",
            body,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task CommitMutation_WhenLockedDataElementIsDeletedWithIgnoreLock_Deletes()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null,
            locked: true
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int deleteVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage deleteResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey: null,
            new { deleteDataElements = new[] { new { dataElementId, ignoreLock = true } } }
        );
        MutationResponse deleteMutation = await ReadMutationResponse(deleteResponse);

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        Assert.DoesNotContain(deleteMutation.Instance?.Data ?? [], dataElement => dataElement.Id == dataElementId);
    }

    [Fact]
    public async Task CommitMutation_WhenLockedDataElementIsUnlockedThenDeleted_Deletes()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null,
            locked: true
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int unlockVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage unlockResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            unlockVersion,
            idempotencyKey: null,
            new { updateDataElements = new[] { new { dataElementId, locked = false } } }
        );
        Assert.Equal(HttpStatusCode.OK, unlockResponse.StatusCode);

        int deleteVersion = GetVersionHeaders(unlockResponse).InstanceVersion;
        using HttpResponseMessage deleteResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey: null,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        MutationResponse deleteMutation = await ReadMutationResponse(deleteResponse);

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        Assert.DoesNotContain(deleteMutation.Instance?.Data ?? [], dataElement => dataElement.Id == dataElementId);
    }

    [Fact]
    public async Task CommitMutation_WhenHardDeletedDataElementIsDeleted_DoesNotTreatHardDeleteFlagAsLock()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int createVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string dataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);

        int hardDeleteFlagVersion = GetVersionHeaders(createResponse).InstanceVersion;
        using HttpResponseMessage flagResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            hardDeleteFlagVersion,
            idempotencyKey: null,
            new
            {
                updateDataElements = new[]
                {
                    new
                    {
                        dataElementId,
                        deleteStatus = new DeleteStatus { IsHardDeleted = true, HardDeleted = DateTime.UtcNow },
                    },
                },
            }
        );
        Assert.Equal(HttpStatusCode.OK, flagResponse.StatusCode);

        int deleteVersion = GetVersionHeaders(flagResponse).InstanceVersion;
        using HttpResponseMessage deleteResponse = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            deleteVersion,
            idempotencyKey: null,
            new { deleteDataElements = new[] { new { dataElementId } } }
        );
        MutationResponse deleteMutation = await ReadMutationResponse(deleteResponse);

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        Assert.DoesNotContain(deleteMutation.Instance?.Data ?? [], dataElement => dataElement.Id == dataElementId);
    }

    [Fact]
    public async Task CommitMutation_WhenReadInstanceCreatesUnreadDataElement_SetsUpdatedSinceLastReview()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string userToken = await fixture.Auth.GetUserToken(userId: 1337);
        string serviceOwnerToken = await fixture.Auth.GetServiceOwnerToken();
        Instance instance = await CreateInstance(fixture, userToken, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);

        using HttpResponseMessage readStatusResponse = await PutReadStatus(
            fixture,
            userToken,
            ownerPartyId,
            instanceGuid,
            ReadStatus.Read
        );
        Assert.Equal(HttpStatusCode.OK, readStatusResponse.StatusCode);

        int createVersion = GetVersionHeaders(readStatusResponse).InstanceVersion;
        using HttpResponseMessage createResponse = await PostCreateAttachmentMutation(
            fixture,
            serviceOwnerToken,
            ownerPartyId,
            instanceGuid,
            createVersion,
            idempotencyKey: null
        );
        MutationResponse createMutation = await ReadMutationResponse(createResponse);

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        string createdDataElementId = Assert.Single(createMutation.CreatedDataElementIds ?? []);
        DataElement createdDataElement = Assert.Single(
            createMutation.Instance?.Data ?? [],
            dataElement => dataElement.Id == createdDataElementId
        );
        Assert.False(createdDataElement.IsRead);
        Assert.Equal(ReadStatus.UpdatedSinceLastReview, createMutation.Instance?.Status?.ReadStatus);
    }

    [Fact]
    public async Task CommitMutation_WhenDeleteInstanceIsCombinedWithAnotherOperation_ReturnsBadRequest()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: null,
            new
            {
                deleteInstance = new { hard = true },
                dataValues = new Dictionary<string, string> { ["should-not-apply"] = "true" },
            }
        );

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            "deleteInstance cannot be combined with other aggregate mutation operations.",
            body,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task CommitMutation_WhenIdempotencyKeyIsNotGuid_ReturnsBadRequest()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: "not-a-guid",
            new { dataValues = new Dictionary<string, string> { ["key"] = "value" } }
        );

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Idempotency-Key must be a GUID.", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CommitMutation_WhenUpdateDataElementIdIsReferencedMoreThanOnce_ReturnsBadRequest()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        Guid dataElementId = Guid.NewGuid();

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: null,
            new
            {
                updateDataElements = new[]
                {
                    new { dataElementId, tags = new[] { "first" } },
                    new { dataElementId, tags = new[] { "second" } },
                },
            }
        );

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            $"dataElementId '{dataElementId}' is referenced by more than one data element mutation operation.",
            body,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task CommitMutation_WhenDataElementIdIsReferencedByUpdateAndDelete_ReturnsBadRequest()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        Guid dataElementId = Guid.NewGuid();

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: null,
            new
            {
                updateDataElements = new[] { new { dataElementId, tags = new[] { "updated" } } },
                deleteDataElements = new[] { new { dataElementId } },
            }
        );

        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            $"dataElementId '{dataElementId}' is referenced by more than one data element mutation operation.",
            body,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task CommitMutation_WhenMultipleInstanceUpdatesAreApplied_IncrementsInstanceVersionOnce()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        VersionHeaders before = await GetCurrentVersions(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            before.InstanceVersion,
            idempotencyKey: null,
            new
            {
                dataValues = new Dictionary<string, string> { ["first"] = "one" },
                presentationTexts = new Dictionary<string, string> { ["title"] = "Mutation title" },
            }
        );

        VersionHeaders after = GetVersionHeaders(response);
        MutationResponse mutation = await ReadMutationResponse(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(before.InstanceVersion + 1, after.InstanceVersion);
        Assert.Equal(before.ProcessStateVersion, after.ProcessStateVersion);
        Assert.Equal("one", mutation.Instance?.DataValues?["first"]);
        Assert.Equal("Mutation title", mutation.Instance?.PresentationTexts?["title"]);
    }

    [Fact]
    public async Task CommitMutation_WhenProcessStateIsUpdated_IncrementsProcessStateVersionOnce()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        VersionHeaders before = await GetCurrentVersions(fixture, token, ownerPartyId, instanceGuid);

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            before.InstanceVersion,
            idempotencyKey: null,
            new
            {
                processState = new
                {
                    state = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
                },
                dataValues = new Dictionary<string, string> { ["after-process"] = "true" },
            }
        );

        VersionHeaders after = GetVersionHeaders(response);
        MutationResponse mutation = await ReadMutationResponse(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(before.InstanceVersion + 1, after.InstanceVersion);
        Assert.Equal(before.ProcessStateVersion + 1, after.ProcessStateVersion);
        Assert.Equal("Task_1", mutation.Instance?.Process?.CurrentTask?.ElementId);
        Assert.Equal("true", mutation.Instance?.DataValues?["after-process"]);
    }

    [Fact]
    public async Task CommitMutation_WhenProcessStateEnds_ArchivesResponseAndStoredInstance()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        DateTime ended = new(2026, 7, 10, 12, 34, 56, DateTimeKind.Utc);

        using HttpResponseMessage response = await PostJsonMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            idempotencyKey: null,
            new { processState = new { state = new ProcessState { Ended = ended, EndEvent = "EndEvent_1" } } }
        );
        MutationResponse mutation = await ReadMutationResponse(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertArchiveStatus(mutation.Instance, ended);

        using HttpResponseMessage storedResponse = await GetStorageInstance(fixture, token, ownerPartyId, instanceGuid);
        Instance storedInstance = await ReadJson<Instance>(storedResponse);

        Assert.Equal(HttpStatusCode.OK, storedResponse.StatusCode);
        AssertArchiveStatus(storedInstance, ended);
    }

    [Fact]
    public async Task CommitMutation_WhenFilenameLessBinaryPartContainsInvalidUtf8_StoresOriginalBytes()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        Instance instance = await CreateInstance(fixture, token, partyId: 501337);
        (int ownerPartyId, Guid instanceGuid) = SplitInstanceId(instance);
        int instanceVersion = await GetCurrentInstanceVersion(fixture, token, ownerPartyId, instanceGuid);
        byte[] expectedBytes = [0x00, 0xFF, 0xC3, 0x28, 0x41, 0x80, 0xFE];

        using HttpResponseMessage response = await PostCreateBinaryAttachmentMutationWithoutFilename(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            instanceVersion,
            expectedBytes
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        MutationResponse mutation = await ReadMutationResponse(response);
        string createdDataElementId = Assert.Single(mutation.CreatedDataElementIds ?? []);

        using HttpResponseMessage contentResponse = await GetStorageDataElementContent(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            Guid.Parse(createdDataElementId)
        );
        byte[] actualBytes = await contentResponse.Content.ReadAsByteArrayAsync();

        Assert.Equal(HttpStatusCode.OK, contentResponse.StatusCode);
        Assert.Equal(expectedBytes, actualBytes);

        using HttpResponseMessage storedInstanceResponse = await GetStorageInstance(
            fixture,
            token,
            ownerPartyId,
            instanceGuid
        );
        Assert.Equal(HttpStatusCode.OK, storedInstanceResponse.StatusCode);
        Instance storedInstance = await ReadJson<Instance>(storedInstanceResponse);
        DataElement createdDataElement = Assert.Single(
            storedInstance.Data,
            dataElement => dataElement.Id == createdDataElementId
        );
        Assert.Null(createdDataElement.Filename);
    }

    private static async Task<Instance> CreateInstance(AppFixture fixture, string token, int partyId)
    {
        using AppFixture.ApiResponse response = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = partyId.ToString() } }
        );
        using AppFixture.ReadApiResponse<Instance> readResponse = await response.Read<Instance>();

        Assert.Equal(HttpStatusCode.Created, readResponse.Response.StatusCode);
        Assert.Null(readResponse.Data.Exception);
        return readResponse.Data.Model ?? throw new InvalidOperationException("Instantiation returned no instance.");
    }

    private static async Task<HttpResponseMessage> PostCreateAttachmentMutation(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        int expectedInstanceVersion,
        string? idempotencyKey,
        bool locked = false,
        object? mutationExtras = null
    )
    {
        Dictionary<string, object> mutation = new()
        {
            ["createDataElements"] = new[]
            {
                new
                {
                    dataType = "attachment",
                    contentPartName = "attachment",
                    contentType = "text/plain",
                    filename = "mutation-replay.txt",
                    locked,
                },
            },
        };
        foreach (var property in mutationExtras?.GetType().GetProperties() ?? [])
        {
            mutation[property.Name] = property.GetValue(mutationExtras)!;
        }

        string mutationJson = JsonSerializer.Serialize(mutation, _jsonOptions);
        var content = new MultipartFormDataContent
        {
            { new StringContent(mutationJson, Encoding.UTF8, "application/json"), "mutation" },
            {
                new ByteArrayContent(Encoding.UTF8.GetBytes("created by LocalTest mutation replay test"))
                {
                    Headers = { ContentType = new MediaTypeHeaderValue("text/plain") },
                },
                "attachment",
                "mutation-replay.txt"
            },
        };

        return await PostMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            expectedInstanceVersion,
            idempotencyKey,
            content
        );
    }

    private static async Task<HttpResponseMessage> PostCreateBinaryAttachmentMutationWithoutFilename(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        int expectedInstanceVersion,
        byte[] bytes
    )
    {
        var mutation = new
        {
            createDataElements = new[]
            {
                new
                {
                    dataType = "attachment",
                    contentPartName = "attachment",
                    contentType = "application/octet-stream",
                },
            },
        };
        string mutationJson = JsonSerializer.Serialize(mutation, _jsonOptions);
        var content = new MultipartFormDataContent
        {
            { new StringContent(mutationJson, Encoding.UTF8, "application/json"), "mutation" },
            {
                new ByteArrayContent(bytes)
                {
                    Headers = { ContentType = new MediaTypeHeaderValue("application/octet-stream") },
                },
                "attachment"
            },
        };

        return await PostMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            expectedInstanceVersion,
            idempotencyKey: null,
            content
        );
    }

    private static async Task<HttpResponseMessage> PostCreateAndUpdateAttachmentMutation(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        int expectedInstanceVersion,
        string updatedDataElementId
    )
    {
        var mutation = new
        {
            createDataElements = new[]
            {
                new
                {
                    dataType = "attachment",
                    contentPartName = "createdAttachment",
                    contentType = "text/plain",
                    filename = "created-with-content-update.txt",
                },
            },
            updateDataElements = new[]
            {
                new
                {
                    dataElementId = Guid.Parse(updatedDataElementId),
                    contentPartName = "updatedAttachment",
                    contentType = "text/plain",
                    filename = "updated-by-mutation.txt",
                },
            },
            dataValues = new Dictionary<string, string> { ["mixed-content-update"] = "true" },
        };
        string mutationJson = JsonSerializer.Serialize(mutation, _jsonOptions);
        var content = new MultipartFormDataContent
        {
            { new StringContent(mutationJson, Encoding.UTF8, "application/json"), "mutation" },
            {
                new ByteArrayContent(Encoding.UTF8.GetBytes("created in mixed mutation"))
                {
                    Headers = { ContentType = new MediaTypeHeaderValue("text/plain") },
                },
                "createdAttachment",
                "created-with-content-update.txt"
            },
            {
                new ByteArrayContent(Encoding.UTF8.GetBytes("updated in mixed mutation"))
                {
                    Headers = { ContentType = new MediaTypeHeaderValue("text/plain") },
                },
                "updatedAttachment",
                "updated-by-mutation.txt"
            },
        };

        return await PostMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            expectedInstanceVersion,
            idempotencyKey: null,
            content
        );
    }

    private static async Task<HttpResponseMessage> PostJsonMutation(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        int expectedInstanceVersion,
        string? idempotencyKey,
        object mutation
    )
    {
        var content = new StringContent(
            JsonSerializer.Serialize(mutation, _jsonOptions),
            Encoding.UTF8,
            "application/json"
        );

        return await PostMutation(
            fixture,
            token,
            ownerPartyId,
            instanceGuid,
            expectedInstanceVersion,
            idempotencyKey,
            content
        );
    }

    private static async Task<HttpResponseMessage> PostMutation(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        int expectedInstanceVersion,
        string? idempotencyKey,
        HttpContent content
    )
    {
        var client = fixture.GetLocaltestClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/storage/api/v1/instances/{ownerPartyId}/{instanceGuid}/mutations"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add(IfInstanceVersionMatchHeader, expectedInstanceVersion.ToString());
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            request.Headers.Add(IdempotencyKeyHeader, idempotencyKey);
        }

        request.Content = content;
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> PutReadStatus(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        ReadStatus readStatus
    )
    {
        var client = fixture.GetLocaltestClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"/storage/api/v1/instances/{ownerPartyId}/{instanceGuid}/readstatus?status={readStatus}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> GetStorageInstance(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid
    )
    {
        var client = fixture.GetLocaltestClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/storage/api/v1/instances/{ownerPartyId}/{instanceGuid}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> GetStorageDataElementContent(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        Guid dataElementId
    )
    {
        var client = fixture.GetLocaltestClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/storage/api/v1/instances/{ownerPartyId}/{instanceGuid}/data/{dataElementId}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> GetInstanceEvents(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid,
        InstanceEventType eventType
    )
    {
        var client = fixture.GetLocaltestClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/storage/api/v1/instances/{ownerPartyId}/{instanceGuid}/events?eventTypes={eventType}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await client.SendAsync(request);
    }

    private static async Task<int> GetCurrentInstanceVersion(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid
    )
    {
        VersionHeaders versions = await GetCurrentVersions(fixture, token, ownerPartyId, instanceGuid);
        return versions.InstanceVersion;
    }

    private static async Task<VersionHeaders> GetCurrentVersions(
        AppFixture fixture,
        string token,
        int ownerPartyId,
        Guid instanceGuid
    )
    {
        using HttpResponseMessage response = await GetStorageInstance(fixture, token, ownerPartyId, instanceGuid);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return GetVersionHeaders(response);
    }

    private static VersionHeaders GetVersionHeaders(HttpResponseMessage response)
    {
        Assert.True(
            response.Headers.TryGetValues(InstanceVersionHeader, out IEnumerable<string>? values),
            $"Missing {InstanceVersionHeader} response header."
        );
        string instanceVersion = Assert.Single(values);

        Assert.True(
            response.Headers.TryGetValues(ProcessStateVersionHeader, out IEnumerable<string>? processValues),
            $"Missing {ProcessStateVersionHeader} response header."
        );
        string processStateVersion = Assert.Single(processValues);

        return new VersionHeaders(int.Parse(instanceVersion), int.Parse(processStateVersion));
    }

    private static async Task<MutationResponse> ReadMutationResponse(HttpResponseMessage response)
    {
        MutationResponse mutation = await ReadJson<MutationResponse>(response);
        Assert.NotNull(mutation.Instance);
        Assert.NotNull(mutation.CreatedDataElementIds);
        return mutation;
    }

    private static async Task<T> ReadJson<T>(HttpResponseMessage response)
    {
        string body = await response.Content.ReadAsStringAsync();
        T? model = JsonSerializer.Deserialize<T>(body, _jsonOptions);
        return model ?? throw new InvalidOperationException($"Response body was empty or invalid JSON: {body}");
    }

    private static void AssertDeleteMarkers(Instance? instance)
    {
        Assert.NotNull(instance);
        Assert.NotNull(instance.Status);
        Assert.True(instance.Status.IsHardDeleted);
        Assert.True(instance.Status.IsSoftDeleted);
        Assert.NotNull(instance.Status.HardDeleted);
        Assert.NotNull(instance.Status.SoftDeleted);
        Assert.NotNull(instance.LastChanged);
        Assert.NotNull(instance.LastChangedBy);
    }

    private static void AssertArchiveStatus(Instance? instance, DateTime ended)
    {
        Assert.NotNull(instance);
        Assert.NotNull(instance.Status);
        Assert.True(instance.Status.IsArchived);
        Assert.Equal(ended, instance.Status.Archived);
    }

    private static void AssertMutationContentETag(MutationResponse mutation, string dataElementId, string? expectedETag)
    {
        Assert.False(string.IsNullOrWhiteSpace(expectedETag));
        string expected = expectedETag ?? throw new InvalidOperationException("Expected ETag was missing.");
        Assert.StartsWith("\"", expected);
        Assert.EndsWith("\"", expected);

        Assert.NotNull(mutation.DataElementContentEtags);
        Assert.True(
            mutation.DataElementContentEtags.TryGetValue(dataElementId, out string? actualETag),
            $"Missing content ETag for data element {dataElementId}."
        );
        Assert.Equal(expected, actualETag);
    }

    private static (int OwnerPartyId, Guid InstanceGuid) SplitInstanceId(Instance instance)
    {
        string[] parts = instance.Id.Split('/');
        Assert.Equal(2, parts.Length);
        return (int.Parse(parts[0]), Guid.Parse(parts[1]));
    }

    private sealed record MutationResponse(
        Instance? Instance,
        IReadOnlyList<string>? CreatedDataElementIds,
        bool Replayed,
        [property: JsonPropertyName("dataElementContentEtags")]
            IReadOnlyDictionary<string, string>? DataElementContentEtags
    );

    private sealed record VersionHeaders(int InstanceVersion, int ProcessStateVersion);
}
