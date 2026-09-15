using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// The controller's half of the state carry: restored from the incoming blob, handed to the command,
/// written back into the returned blob.
/// </summary>
public class WorkflowEngineCallbackControllerCarryTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;

    private static readonly Guid _carriedMailboxId = new("018f4e00-0000-7000-8000-0000000000bb");
    private static readonly Guid _mintedMailboxId = new("018f4e00-0000-7000-8000-0000000000cc");
    private static readonly DateTimeOffset _deadline = new(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);

    /// <summary>The item index the tests key the carried mailbox on.</summary>
    private const int OpeningIndex = 0;

    public WorkflowEngineCallbackControllerCarryTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    /// <summary>
    /// Stands in for whichever command the callback resolves: reports the carry it was handed and, on request,
    /// records a mailbox the way the mint does.
    /// </summary>
    private sealed class CarryProbeCommand : IWorkflowEngineCommand
    {
        public static string Key => "CarryProbe";

        public CarriedMailbox? SeenMailbox { get; private set; }

        public bool Mints { get; set; }

        public string GetKey() => Key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            SeenMailbox = context.StateCarry.FindMailbox(OpeningIndex);
            if (Mints)
            {
                context.StateCarry.RecordMailbox(OpeningIndex, _mintedMailboxId, _deadline);
            }

            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
    }

    private static Instance CreateInstance(Guid instanceGuid) =>
        new()
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data = [],
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private async Task<(WorkflowCallbackState Returned, CarryProbeCommand Probe)> RunCallback(
        Guid? incomingMailboxId,
        bool mints
    )
    {
        var instanceGuid = Guid.NewGuid();
        var probe = new CarryProbeCommand { Mints = mints };

        using HttpClient client = GetRootedClient(
            Org,
            App,
            configureServices: services => services.AddSingleton<IWorkflowEngineCommand>(probe)
        );
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );
        var signer = Services.GetRequiredService<WorkflowStateSigner>();

        var incoming = new WorkflowCallbackState
        {
            Instance = CreateInstance(instanceGuid),
            InstanceVersion = 9,
            ProcessStateVersion = 4,
            FormData = [],
            Mailboxes = incomingMailboxId is { } carried
                ? new Dictionary<string, CarriedMailbox>
                {
                    ["0"] = new CarriedMailbox { Id = carried, Deadline = _deadline },
                }
                : null,
        };
        var payload = new AppCallbackPayload
        {
            CommandKey = CarryProbeCommand.Key,
            Actor = new Actor { Language = "nb" },
            ExecutionReferenceTime = DateTimeOffset.UnixEpoch,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
            State = signer.Sign(JsonSerializer.Serialize(incoming), SigningDomain.CallbackState),
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/workflow-engine-callbacks/{CarryProbeCommand.Key}",
            content
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(
            await response.Content.ReadAsStringAsync(),
            JsonSerializerOptions
        );
        Assert.NotNull(callbackResponse?.State);

        var returned = JsonSerializer.Deserialize<WorkflowCallbackState>(
            signer.Verify(callbackResponse.State, SigningDomain.CallbackState)
        )!;
        return (returned, probe);
    }

    [Fact]
    public async Task Callback_ForwardsTheCarriedMailboxToACommandThatIgnoresIt()
    {
        (WorkflowCallbackState returned, CarryProbeCommand probe) = await RunCallback(_carriedMailboxId, mints: false);

        Assert.Equal(_carriedMailboxId, probe.SeenMailbox?.Id);
        Assert.Equal(_deadline, probe.SeenMailbox?.Deadline);
        AssertPublishes(returned, _carriedMailboxId);
    }

    [Fact]
    public async Task Callback_PublishesAMailboxTheCommandRecorded()
    {
        (WorkflowCallbackState returned, CarryProbeCommand probe) = await RunCallback(
            incomingMailboxId: null,
            mints: true
        );

        Assert.Null(probe.SeenMailbox);
        AssertPublishes(returned, _mintedMailboxId);
    }

    [Fact]
    public async Task Callback_ForAWorkflowWithNoMailbox_PublishesNone()
    {
        (WorkflowCallbackState returned, CarryProbeCommand probe) = await RunCallback(
            incomingMailboxId: null,
            mints: false
        );

        Assert.Null(probe.SeenMailbox);
        Assert.Null(returned.Mailboxes);
    }

    private static void AssertPublishes(WorkflowCallbackState returned, Guid mailboxId)
    {
        Assert.NotNull(returned.Mailboxes);
        CarriedMailbox published = Assert.Contains("0", returned.Mailboxes);
        Assert.Equal(mailboxId, published.Id);
        Assert.Equal(_deadline, published.Deadline);
    }
}
