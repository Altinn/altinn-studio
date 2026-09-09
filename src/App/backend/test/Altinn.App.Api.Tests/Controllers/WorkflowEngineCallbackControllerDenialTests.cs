using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// Covers the one branch that turns a bare platform 403 into an explanation: a command that fails
/// because Altinn Authorization refused the app while it acted as the service owner.
/// </summary>
public class WorkflowEngineCallbackControllerDenialTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;

    public WorkflowEngineCallbackControllerDenialTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    /// <summary>
    /// Stands in for any command whose platform call is refused. The status code is all the app has to
    /// go on, which is why the diagnosis is broad and its message states its own precondition.
    /// </summary>
    private sealed class ForbiddenCommand : IWorkflowEngineCommand
    {
        internal const string Key = "test-forbidden-command";

        public string GetKey() => Key;

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) =>
            Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Retryable(
                    new PlatformHttpException(HttpStatusCode.Forbidden, "Storage refused the request")
                )
            );
    }

    [Fact]
    public async Task A_Service_Owner_Denial_Is_Tagged_On_The_Callback_Activity()
    {
        var instanceGuid = Guid.NewGuid();
        OverrideServicesForThisTest = services =>
        {
            services.AddTransient<IWorkflowEngineCommand, ForbiddenCommand>();
            services.AddTelemetrySink(additionalActivitySources: source => source.Name == "Microsoft.AspNetCore");
        };

        using var client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GetRequiredService<IWorkflowCallbackTokenGenerator>().GenerateToken(instanceGuid)
        );

        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
            },
            Data = [],
        };
        var payload = new AppCallbackPayload
        {
            CommandKey = ForbiddenCommand.Key,
            Actor = new Actor { Language = "nb" },
            ExecutionReferenceTime = DateTimeOffset.UnixEpoch,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
            State = Services
                .GetRequiredService<WorkflowStateSigner>()
                .Sign(
                    JsonSerializer.Serialize(
                        new WorkflowCallbackState
                        {
                            Instance = instance,
                            InstanceVersion = 9,
                            ProcessStateVersion = 4,
                            FormData = [],
                        }
                    ),
                    SigningDomain.CallbackState
                ),
        };
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var response = await client.PostAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/workflow-engine-callbacks/{ForbiddenCommand.Key}",
            content
        );

        // A retryable failure is still answered with 500 so the engine retries it - the diagnosis does
        // not change the classification.
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var snapshot = await GetTelemetrySnapshot(numberOfActivities: 1, numberOfMetrics: 0);
        Assert.NotNull(snapshot.Activities);
        var callback = Assert.Single(snapshot.Activities, a => a.Name.EndsWith(".Callback", StringComparison.Ordinal));
        Assert.Contains(
            callback.Tags,
            tag =>
                tag.Key == Telemetry.InternalLabels.ServiceOwnerAuthorizationDenied
                && tag.Value is bool denied
                && denied
        );
        Assert.Equal(ActivityStatusCode.Error, callback.Status);
    }
}
