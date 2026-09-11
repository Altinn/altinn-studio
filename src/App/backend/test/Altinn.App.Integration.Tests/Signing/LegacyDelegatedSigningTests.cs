using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Integration.Tests.WorkflowEngine;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;
using AppProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;

namespace Altinn.App.Integration.Tests.Signing;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public sealed class LegacyDelegatedSigningTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Theory]
    [InlineData("reject", false)]
    [InlineData(null, false)]
    [InlineData("reject", true)]
    [InlineData(null, true)]
    public async Task ExistingInstance_ReadAndLeaveSigning_RevokesWithoutInitialization(
        string? action,
        bool returnInstance
    )
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.DelegatedSigning);
        var fixture = fixtureScope.Fixture;
        using var reset = await fixture
            .GetDirectAppClient()
            .PostAsJsonAsync(
                "/test/delegated-signing/reset",
                new
                {
                    signees = new[] { "01899699552" },
                    holdProvider = true,
                    loseAbortResponseOnce = action == "reject",
                }
            );
        reset.EnsureSuccessStatusCode();

        string token = await fixture.Auth.GetUserToken();
        string ownerToken = await fixture.Auth.GetServiceOwnerToken();
        string signeeToken = await fixture.Auth.GetUserToken(userId: 1001);
        DateTime signedTime = new(2024, 1, 2, 12, 0, 0, DateTimeKind.Utc);

        // Storage seeding deliberately bypasses the app's instantiation workflow. This is the shape of an
        // instance already on a signing task when the first version using the workflow engine is deployed.
        using var created = await fixture.Storage.CreateInstance(
            token,
            new Instance
            {
                InstanceOwner = new InstanceOwner { PartyId = "501337", PersonNumber = "01039012345" },
                Process = new ProcessState
                {
                    StartEvent = "StartEvent_1",
                    Started = signedTime,
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "Task_Signing",
                        AltinnTaskType = "signing",
                        Started = signedTime,
                        Flow = 2,
                    },
                },
            }
        );
        // The Storage API uses string enums while the app API returns numeric ReadStatus values.
        using var instance = await created.Read<Instance>(
            new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } }
        );
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.True(
            instance.Data.Model is not null,
            $"Could not read seeded instance: {instance.Data.Exception}\n{instance.Data.Body}"
        );

        using var storedStateResponse = await fixture.Storage.InsertData(
            ownerToken,
            instance,
            "signee-states",
            LegacyState
        );
        using var storedState = await storedStateResponse.Read<DataElement>();
        Assert.Equal(HttpStatusCode.Created, storedState.Response.StatusCode);
        Assert.True(storedState.Data.Model!.References is null or { Count: 0 });

        var signature = new SignDocument
        {
            SigneeInfo = new Signee { PersonNumber = "01899699552" },
            SignedTime = signedTime,
        };
        using var storedSignatureResponse = await fixture.Storage.InsertData(
            ownerToken,
            instance,
            "signatures",
            JsonSerializer.Serialize(signature)
        );
        using var storedSignature = await storedSignatureResponse.Read<DataElement>();
        Assert.Equal(HttpStatusCode.Created, storedSignature.Response.StatusCode);
        await SeedDelegation(fixture, instance.Data.Model!);
        using var afterGrant = await fixture.Signing.GetState(signeeToken, instance);
        Assert.Equal(HttpStatusCode.OK, afterGrant.Response.StatusCode);

        using var processResponse = await fixture.Instances.GetProcess(token, instance);
        using var process = await processResponse.Read<Core.Internal.Process.Elements.AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);
        Assert.Equal(Core.Internal.Process.Elements.WorkflowActivityStatus.Idle, process.Data.Model!.Workflow!.Status);
        Assert.Null(process.Data.Model.Workflow.StartedAt);
        Assert.Null(process.Data.Model.Workflow.Failure);

        for (int read = 0; read < 2; read++)
        {
            using var stateResponse = await fixture.Signing.GetState(token, instance);
            using var state = await stateResponse.Read<SigningStateResponse>();
            Assert.Equal(HttpStatusCode.OK, state.Response.StatusCode);
            var signee = Assert.Single(state.Data.Model!.SigneeStates);
            Assert.Equal(510001, signee.PartyId);
            Assert.True(signee.DelegationSuccessful);
            Assert.Equal(NotificationStatus.Sent, signee.NotificationStatus);
            Assert.Equal(signedTime, signee.SignedTime);
            Assert.Null(signee.DelegationFailure);
            Assert.Null(signee.NotificationFailure);
        }

        // With all signatures already stored, advance without invoking the sign action a second time.
        using var nextResponse = await fixture.Instances.ProcessNext(
            action == "reject" ? token : signeeToken,
            instance,
            new ProcessNext { Action = action },
            returnInstance: returnInstance
        );
        using var next = await nextResponse.Read<JsonElement>();
        Assert.Equal(HttpStatusCode.OK, next.Response.StatusCode);
        var processJson = returnInstance ? next.Data.Model.GetProperty("process") : next.Data.Model;
        var nextProcess = processJson.Deserialize<AppProcessState>(
            new JsonSerializerOptions(JsonSerializerDefaults.Web)
        )!;

        using var afterResponse = await fixture.Instances.Get(token, instance);
        using var after = await afterResponse.Read<Instance>();
        if (action == "reject")
        {
            // Deliberately abandoning signing revokes rights and discards the old signatures and signee state.
            Assert.Equal("Task_1", nextProcess.CurrentTask!.ElementId);
            Assert.DoesNotContain(after.Data.Model!.Data, d => d.DataType is "signee-states" or "signatures");
        }
        else
        {
            Assert.Null(nextProcess.CurrentTask);
            Assert.Equal("EndEvent_1", nextProcess.EndEvent);
            Assert.Equal(
                storedState.Data.Model.Id,
                Assert.Single(after.Data.Model!.Data, d => d.DataType == "signee-states").Id
            );
            Assert.Equal(
                storedSignature.Data.Model!.Id,
                Assert.Single(after.Data.Model.Data, d => d.DataType == "signatures").Id
            );
            using var signingResponse = await fixture.Signing.GetState(token, after, "Task_Signing");
            using var signing = await signingResponse.Read<SigningStateResponse>();
            Assert.Equal(HttpStatusCode.OK, signing.Response.StatusCode);
            var oldSignee = Assert.Single(signing.Data.Model!.SigneeStates);
            // This is the stored outcome of initialization; effective rights are revoked separately.
            Assert.True(oldSignee.DelegationSuccessful);
            Assert.Equal(signedTime, oldSignee.SignedTime);
        }

        using var observations = await fixture
            .GetDirectAppClient()
            .GetFromJsonAsync<JsonDocument>("/test/delegated-signing/state");
        Assert.NotNull(observations);
        var root = observations.RootElement;
        Assert.Equal(0, root.GetProperty("providerCalls").GetInt32());
        Assert.Empty(root.GetProperty("delegations").EnumerateArray());
        Assert.Empty(root.GetProperty("notifications").EnumerateArray());
        var revoke = Assert.Single(root.GetProperty("revocations").EnumerateArray());
        Assert.Equal("186aaeb4-97e6-40f4-8d48-31782a66782b", revoke.GetProperty("recipient").GetString());
        Assert.Equal(200, revoke.GetProperty("statusCode").GetInt32());
        if (action == "reject")
        {
            Assert.Equal(1, root.GetProperty("lostAbortResponses").GetInt32());
            var abortAttempts = root.GetProperty("callbacks")
                .EnumerateArray()
                .Where(callback => callback.GetProperty("commandKey").GetString() == "AbortRuntimeDelegatedSigning")
                .ToArray();
            Assert.Equal(2, abortAttempts.Length);
            Assert.Single(abortAttempts.Select(callback => callback.GetProperty("stepId").GetGuid()).Distinct());
        }
    }

    private static async Task SeedDelegation(AppFixture fixture, Instance instance)
    {
        var app = instance.AppId.Split('/')[1];
        var instanceGuid = instance.Id.Split('/')[1];
        var resources = new[]
        {
            new { type = "urn:altinn:org", value = "ttd" },
            new { type = "urn:altinn:app", value = app },
            new { type = "urn:altinn:task", value = "Task_Signing" },
        };
        using var response = await fixture
            .GetLocaltestClient()
            .PostAsJsonAsync(
                $"/accessmanagement/api/v1/app/delegations/resource/app_ttd_{app}/instance/{instanceGuid}",
                new
                {
                    from = new { type = "urn:altinn:party:uuid", value = "e9dd7d91-32d8-4933-a108-07562762d572" },
                    to = new { type = "urn:altinn:party:uuid", value = "186aaeb4-97e6-40f4-8d48-31782a66782b" },
                    rights = new[] { "read", "sign" }.Select(action => new
                    {
                        resource = resources,
                        action = new { type = "urn:altinn:action", value = action },
                    }),
                }
            );
        response.EnsureSuccessStatusCode();
    }

    // Deliberately frozen pre-workflow JSON: ReferenceHandler.Preserve, no generatedFromTask metadata,
    // and no delegationFailure/notificationFailure fields added by the new initialization commands.
    private const string LegacyState = """
        {
          "$id": "1",
          "$values": [{
            "$id": "2",
            "taskId": "Task_Signing",
            "Signee": {
              "$id": "3", "$type": "person",
              "Party": { "PartyId": 510001, "PartyUuid": "186aaeb4-97e6-40f4-8d48-31782a66782b", "SSN": "01899699552", "Name": "Pengelens Partner" },
              "SocialSecurityNumber": "01899699552", "FullName": "Pengelens Partner"
            },
            "CommunicationConfig": null,
            "additionalActionsToDelegate": null,
            "signeeState": {
              "isAccessDelegated": true,
              "delegationFailedReason": null,
              "hasBeenMessagedForCallToSign": true,
              "ctaCorrespondenceId": "33333333-3333-3333-3333-333333333333",
              "callToSignFailedReason": null
            }
          }]
        }
        """;
}
