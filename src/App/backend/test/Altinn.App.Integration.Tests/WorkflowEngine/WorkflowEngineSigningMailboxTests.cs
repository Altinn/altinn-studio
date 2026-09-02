using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;
using ProcessStateWithWorkflow = Altinn.App.Core.Internal.Process.Elements.AppProcessState;
using WorkflowActivityStatus = Altinn.App.Core.Internal.Process.Elements.WorkflowActivityStatus;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// The built-in signing task as a mailbox-backed pipeline, end to end: the transition into the task opens
/// the round and publishes its mailbox in the signing-state element, the signing endpoint forwards one sign
/// message into that mailbox, and the reply handler turns it into an app-written sign document whose hashes
/// the test recomputes from the stored bytes, concluding the round and auto-advancing the process.
/// </summary>
/// <remarks>
/// Deliberately assertion-based rather than snapshot-based, for the reason
/// <see cref="WorkflowEngineMailboxTests"/> gives: this suite auto-accepts new and changed snapshots locally.
/// </remarks>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineSigningMailboxTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string DataTaskId = "Task_1";
    private const string SigningTaskId = "Task_Sign";
    private const string EndEventId = "EndEvent_1";
    private const string SignedDataType = "model";
    private const string SignatureDataType = "signature";
    private const string SigningStateDataType = "signing-state";
    private const int SignerUserId = 1337;
    private const string SignerPartyId = "501337";
    private const string MainOperationIdPrefix = "Process next:";
    private const string MailboxReceiveOperationIdPrefix = "Mailbox receive:";

    // Keep in sync with StudioctlEnvironment.WaitForEngineReady - the engine's host-exposed address.
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");
    private static readonly TimeSpan _roundTimeout = TimeSpan.FromSeconds(90);

    // SignedTime is the engine's AcceptedAt, stamped on the engine container's clock, not the host's.
    private static readonly TimeSpan _clockSkewAllowance = TimeSpan.FromSeconds(30);

    /// <summary>
    /// The statuses a workflow never leaves. Everything else — including <c>Held</c> and <c>Waiting</c> —
    /// is active.
    /// </summary>
    private static readonly string[] _terminalStatuses =
    [
        "Completed",
        "Failed",
        "Canceled",
        "DependencyFailed",
        "Abandoned",
    ];

    [Fact]
    public async Task SigningRound_OneSigner_SignsThroughTheMailboxAndAutoAdvances()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: "signing-mailbox");
        var fixture = fixtureScope.Fixture;
        DateTimeOffset testStart = DateTimeOffset.UtcNow;

        string token = await fixture.Auth.GetUserToken(userId: SignerUserId);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = SignerPartyId } }
        );
        using var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal(DataTaskId, instance.Data.Model!.Process.CurrentTask!.ElementId);

        await PatchValidFormData(fixture, token, instance);

        // ---- Into the signing task: the round opens, and the instance stays committed on Task_Sign ----
        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processNext = await processNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, processNext.Response.StatusCode);
        Assert.Equal(SigningTaskId, processNext.Data.Model!.CurrentTask!.ElementId);

        // The receiver parked on the mailbox is what keeps the task "processing" for as long as the round is
        // open - the state the frontend's service-task carve-out keys on.
        using var processResponse = await fixture.Instances.GetProcess(token, instance);
        using var process = await processResponse.Read<ProcessStateWithWorkflow>();
        Assert.Equal(HttpStatusCode.OK, process.Response.StatusCode);
        Assert.Equal(SigningTaskId, process.Data.Model!.CurrentTask!.ElementId);
        Assert.NotNull(process.Data.Model.Workflow);
        Assert.Equal(WorkflowActivityStatus.Processing, process.Data.Model.Workflow.Status);

        using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
        string ns = Uri.EscapeDataString(instance.Data.Model.AppId);
        string collectionKey = instance.Data.Model.Id.Split('/')[1];

        // ---- The transition ends on the opening stage, its mint immediately before it ----
        EngineWorkflow main = await WaitForCompletedMainWorkflow(engineClient, ns, collectionKey, SigningTaskId);
        List<string> mainOperationIds = main.Steps.Select(s => s.OperationId).ToList();
        Assert.True(
            mainOperationIds.Count >= 2,
            $"The transition has fewer than two steps: [{string.Join(", ", mainOperationIds)}]"
        );
        Assert.Equal(
            new List<string> { "MintMailbox: 0", "ExecuteServiceTask: 0" },
            mainOperationIds.TakeLast(2).ToList()
        );
        Assert.Single(mainOperationIds, id => id.StartsWith("MintMailbox", StringComparison.Ordinal));

        string receiverOperationId = $"{MailboxReceiveOperationIdPrefix} {SigningTaskId} · 0";
        await WaitForWorkflow(engineClient, ns, collectionKey, receiverOperationId);

        // ---- The round's mailbox is published on the instance, and nothing is signed yet ----
        Instance openRound = await GetInstance(fixture, token, instance);
        DataElement signingStateElement = Assert.Single(openRound.Data, d => d.DataType == SigningStateDataType);
        Assert.Equal("application/json", signingStateElement.ContentType);
        SigningRoundState round = await DownloadJson<SigningRoundState>(fixture, token, openRound, signingStateElement);
        Assert.Equal(SigningTaskId, round.TaskId);
        Assert.NotEqual(Guid.Empty, round.MailboxId);
        Assert.True(round.Deadline > testStart, $"The round's deadline {round.Deadline:O} had already passed.");
        Assert.DoesNotContain(openRound.Data, d => d.DataType == SignatureDataType);

        // ---- Sign: forwarded into the mailbox, nothing written by the endpoint itself ----
        using (var signResponse = await Sign(fixture, token, openRound))
        {
            await AssertStatus(HttpStatusCode.Accepted, signResponse);
        }

        // ---- The handler wrote the sign document, concluded the round, and the process auto-advanced ----
        Instance signed = await WaitForSignatureAndProcessEnd(fixture, token, instance);
        Assert.Equal(EndEventId, signed.Process.EndEvent);
        Assert.Null(signed.Process.CurrentTask);

        DataElement signatureElement = Assert.Single(signed.Data, d => d.DataType == SignatureDataType);
        Assert.Equal("application/json", signatureElement.ContentType);
        Assert.Equal($"{SignatureDataType}.json", signatureElement.Filename);

        SignDocument signDocument = await DownloadJson<SignDocument>(fixture, token, signed, signatureElement);
        Assert.Equal(collectionKey, signDocument.InstanceGuid);
        Assert.Equal(SignerUserId.ToString(CultureInfo.InvariantCulture), signDocument.SigneeInfo.UserId);
        Assert.False(
            string.IsNullOrEmpty(signDocument.SigneeInfo.PersonNumber),
            "The signee's person number was not resolved from the signer's profile."
        );
        Assert.Null(signDocument.SigneeInfo.OrganisationNumber);
        Assert.Null(signDocument.SigneeInfo.SystemUserId);
        Assert.InRange(
            signDocument.SignedTime,
            (testStart - _clockSkewAllowance).UtcDateTime,
            DateTime.UtcNow + _clockSkewAllowance
        );

        // One signature per element of the signed data type, each hash the test's own SHA-256 over the bytes
        // as stored - read straight from storage, because the app's form-data GET re-serializes the model and
        // so does not return the bytes the handler hashed.
        List<DataElement> signedElements = signed.Data.Where(d => d.DataType == SignedDataType).ToList();
        Assert.NotEmpty(signedElements);
        Assert.Equal(signedElements.Count, signDocument.DataElementSignatures.Count);
        foreach (DataElement element in signedElements)
        {
            SignDocument.DataElementSignature signature = Assert.Single(
                signDocument.DataElementSignatures,
                s => s.DataElementId == element.Id
            );
            Assert.True(signature.Signed);
            byte[] storedBytes = await DownloadStoredBytes(fixture, token, signed, element);
            Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(storedBytes)), signature.Sha256Hash);
        }

        // ---- The process has ended, so there is no signing task to sign on any more ----
        using (var lateSignResponse = await Sign(fixture, token, signed))
        {
            await AssertStatus(HttpStatusCode.BadRequest, lateSignResponse);
        }

        // ---- Nothing left parked: one receiver, completed, and every workflow in the collection settled ----
        List<EngineWorkflow> workflows = await WaitForSettledCollection(engineClient, ns, collectionKey);
        EngineWorkflow receiver = Assert.Single(
            workflows,
            w => w.OperationId.StartsWith(MailboxReceiveOperationIdPrefix, StringComparison.Ordinal)
        );
        Assert.Equal(receiverOperationId, receiver.OperationId);
        Assert.Equal("Completed", receiver.OverallStatus);
        // The step names the handler it runs - this pipeline's conclusion, item 1.
        Assert.Equal("ExecuteServiceTask: 1", Assert.Single(receiver.Steps).OperationId);
    }

    private static async Task<AppFixture.ApiResponse> Sign(AppFixture fixture, string token, Instance instance)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/{instance.AppId}/instances/{instance.Id}/signing/sign"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        HttpResponseMessage response = await fixture.GetAppClient().SendAsync(request);
        return new AppFixture.ApiResponse(fixture, response);
    }

    private static async Task AssertStatus(HttpStatusCode expected, AppFixture.ApiResponse response)
    {
        if (response.Response.StatusCode != expected)
        {
            Assert.Fail(
                $"Expected {(int)expected} {expected} but got {(int)response.Response.StatusCode} "
                    + $"{response.Response.StatusCode}: {await response.Response.Content.ReadAsStringAsync()}"
            );
        }
    }

    private static async Task<Instance> GetInstance(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var refreshed = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, refreshed.Response.StatusCode);
        Assert.NotNull(refreshed.Data.Model);
        return refreshed.Data.Model;
    }

    private static async Task<T> DownloadJson<T>(
        AppFixture fixture,
        string token,
        Instance instance,
        DataElement element
    )
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/{instance.AppId}/instances/{instance.Id}/data/{element.Id}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = new AppFixture.ApiResponse(fixture, await fixture.GetAppClient().SendAsync(request));
        using var read = await response.Read<T>();
        Assert.Equal(HttpStatusCode.OK, read.Response.StatusCode);
        if (read.Data.Model is null)
        {
            Assert.Fail(
                $"Could not read data element {element.Id} ({element.DataType}) as {typeof(T).Name}: "
                    + $"{read.Data.Exception?.Message}\n{read.Data.Body}"
            );
        }

        return read.Data.Model;
    }

    private static async Task<byte[]> DownloadStoredBytes(
        AppFixture fixture,
        string token,
        Instance instance,
        DataElement element
    )
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/storage/api/v1/instances/{instance.Id}/data/{element.Id}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using HttpResponseMessage response = await fixture.GetLocaltestClient().SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            Assert.Fail(
                $"Reading data element {element.Id} from storage failed with {(int)response.StatusCode}: "
                    + await response.Content.ReadAsStringAsync()
            );
        }

        return await response.Content.ReadAsByteArrayAsync();
    }

    private static async Task<Instance> WaitForSignatureAndProcessEnd(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _roundTimeout;
        string lastSeen = "(nothing)";
        while (DateTimeOffset.UtcNow < deadline)
        {
            Instance refreshed = await GetInstance(fixture, token, instance);
            bool hasSignature = refreshed.Data.Any(d => d.DataType == SignatureDataType);
            if (hasSignature && refreshed.Process?.Ended is not null)
                return refreshed;

            lastSeen =
                $"task={refreshed.Process?.CurrentTask?.ElementId ?? "(none)"}, "
                + $"ended={refreshed.Process?.Ended?.ToString("O", CultureInfo.InvariantCulture) ?? "(no)"}, "
                + $"signature={hasSignature}";
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"The signing round did not conclude: no signature element and ended process within "
                + $"{_roundTimeout.TotalSeconds:0}s. Last seen: {lastSeen}\n"
                + $"----- APP LOGS -----\n{await fixture.GetAppLogs()}"
        );
        throw new UnreachableException();
    }

    private static async Task<List<EngineWorkflow>> WaitForSettledCollection(
        HttpClient engineClient,
        string ns,
        string collectionKey
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _roundTimeout;
        List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
        while (workflows.Any(w => !_terminalStatuses.Contains(w.OverallStatus)))
        {
            if (DateTimeOffset.UtcNow >= deadline)
            {
                Assert.Fail(
                    $"Workflows were still active {_roundTimeout.TotalSeconds:0}s after the process ended: "
                        + $"[{Describe(workflows)}]"
                );
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500));
            workflows = await ListWorkflows(engineClient, ns, collectionKey);
        }

        return workflows;
    }

    private static async Task<EngineWorkflow> WaitForCompletedMainWorkflow(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        string targetTask
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _roundTimeout;
        string seen = "(nothing)";
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            List<EngineWorkflow> candidates = workflows
                .Where(w =>
                    w.OperationId.StartsWith(MainOperationIdPrefix, StringComparison.Ordinal)
                    && w.OperationId.EndsWith($"-> {targetTask}", StringComparison.Ordinal)
                )
                .ToList();
            if (candidates.SingleOrDefault(w => w.OverallStatus == "Completed") is { } completed)
                return completed;

            seen = Describe(workflows);
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail(
            $"No completed '{MainOperationIdPrefix} ... -> {targetTask}' workflow within "
                + $"{_roundTimeout.TotalSeconds:0}s. Saw: [{seen}]"
        );
        throw new UnreachableException();
    }

    /// <summary>The one workflow with this exact OperationId, once it exists.</summary>
    private static async Task<EngineWorkflow> WaitForWorkflow(
        HttpClient engineClient,
        string ns,
        string collectionKey,
        string operationId
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + _roundTimeout;
        string seen = "(nothing)";
        while (DateTimeOffset.UtcNow < deadline)
        {
            List<EngineWorkflow> workflows = await ListWorkflows(engineClient, ns, collectionKey);
            if (workflows.SingleOrDefault(w => w.OperationId == operationId) is { } found)
                return found;

            seen = Describe(workflows);
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail($"No '{operationId}' workflow within {_roundTimeout.TotalSeconds:0}s. Saw: [{seen}]");
        throw new UnreachableException();
    }

    private static async Task<List<EngineWorkflow>> ListWorkflows(
        HttpClient engineClient,
        string ns,
        string collectionKey
    )
    {
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/workflows?collectionKey={Uri.EscapeDataString(collectionKey)}&pageSize=100"
        );
        if (response.StatusCode == HttpStatusCode.NoContent)
            return [];
        response.EnsureSuccessStatusCode();

        string body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<EnginePage>(body)!.Data;
    }

    private static string Describe(List<EngineWorkflow> workflows) =>
        string.Join(", ", workflows.Select(w => $"{w.OperationId}: {w.OverallStatus}"));

    private static async Task PatchValidFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Guid dataElementId = Guid.Parse(instance.Data.Model!.Data.Single(d => d.DataType == SignedDataType).Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new JsonPatch(
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);
    }

    private sealed record SigningRoundState(string TaskId, Guid MailboxId, DateTimeOffset Deadline);

    private sealed record EnginePage([property: JsonPropertyName("data")] List<EngineWorkflow> Data);

    private sealed record EngineWorkflow(
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("overallStatus")] string OverallStatus,
        [property: JsonPropertyName("steps")] List<EngineStep> Steps
    );

    private sealed record EngineStep(
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("status")] string Status
    );
}
