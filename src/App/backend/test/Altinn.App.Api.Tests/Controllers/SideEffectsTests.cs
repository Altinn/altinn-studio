using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// Side effects an app starts from its own code, end to end through the workflow engine: a hook starts one, it
/// runs in a workflow of its own once the transition is saved, its stages hand values on, and its conclusion
/// polls until the outcome is in.
/// </summary>
public class SideEffectsTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 501337;

    public SideEffectsTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    private sealed record ArchiveRequest(string CaseId);

    /// <summary>What the side effect saw, in the order it saw it.</summary>
    private sealed class Observations
    {
        public List<string> Events { get; } = [];
    }

    private sealed class StartArchivingOnTaskStart : IOnTaskStartingHandler
    {
        public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

        public Task<HookResult> Execute(OnTaskStartingContext context)
        {
            context.SideEffects.Start<ArchiveSideEffect>(new ArchiveRequest("case-42"));
            return Task.FromResult<HookResult>(HookResult.Success());
        }
    }

    private sealed class ArchiveSideEffect(Observations observations) : ISideEffect
    {
        public string Name => "archive";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(Send).Finally(AwaitReceipt, new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(1) });

        private Task<ServiceTaskStageResult> Send(ServiceTaskContext context)
        {
            ArchiveRequest request = context.GetInput<ArchiveRequest>() ?? throw new InvalidOperationException();
            observations.Events.Add($"send {request.CaseId}");
            context.Values.Set("receiptId", $"receipt-for-{request.CaseId}");
            return Task.FromResult(ServiceTaskStageResult.Completed());
        }

        private Task<ServiceTaskResult> AwaitReceipt(ServiceTaskContext context)
        {
            string receiptId = context.Values.Get("receiptId") ?? "missing";
            if (context.Wait.DeferCount == 0)
            {
                observations.Events.Add($"waiting for {receiptId}");
                return Task.FromResult<ServiceTaskResult>(
                    ServiceTaskResult.Defer(TimeSpan.FromSeconds(30), "Waiting for the archive")
                );
            }

            observations.Events.Add($"confirmed {receiptId}");
            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task AHookStartsASideEffect_ThatRunsOnItsOwnAfterTheTransitionIsSaved()
    {
        var observations = new Observations();
        OverrideServicesForThisTest = services =>
        {
            services.AddSingleton(observations);
            services.AddSingleton<IOnTaskStartingHandler, StartArchivingOnTaskStart>();
            services.AddTransient<ISideEffect, ArchiveSideEffect>();
        };
        HttpClient client = GetRootedClient(Org, App);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            TestAuthentication.GetUserToken(userId: 1337, partyId: InstanceOwnerPartyId)
        );

        using var content = new StringContent(
            $$"""{ "instanceOwner": { "partyId": "{{InstanceOwnerPartyId}}" } }""",
            Encoding.UTF8,
            "application/json"
        );
        using HttpResponseMessage response = await client.PostAsync($"{Org}/{App}/instances/create", content);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        InstanceResponse created = JsonSerializer.Deserialize<InstanceResponse>(body, JsonSerializerOptions)!;

        Assert.Equal(
            ["send case-42", "waiting for receipt-for-case-42", "confirmed receipt-for-case-42"],
            observations.Events
        );

        string instanceGuid = created.Id.Split('/')[1];
        IReadOnlyList<WorkflowStatusResponse> workflows = await Services
            .GetRequiredService<IWorkflowEngineClient>()
            .ListWorkflows(Services.GetRequiredService<AppIdentifier>().ToString(), instanceGuid);
        WorkflowStatusResponse archive = Assert.Single(
            workflows,
            workflow => workflow.OperationId.EndsWith("· archive", StringComparison.Ordinal)
        );
        Assert.StartsWith(ProcessNextRequestFactory.SideEffectsOperationIdPrefix, archive.OperationId);
        Assert.False(archive.IsHead);
        Assert.Equal(PersistentItemStatus.Completed, archive.OverallStatus);

        TestData.DeleteInstanceAndData(Org, App, created.Id);
    }
}
