using System.Net;
using System.Text;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;
using CoreProcessState = Altinn.App.Core.Internal.Process.Elements.AppProcessState;
using WorkflowActivityStatus = Altinn.App.Core.Internal.Process.Elements.WorkflowActivityStatus;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// A step whose answer is lost after its save, through a real engine and Storage. The second start stage of the
/// task reads two files, replaces one and removes the other. The scenario answers the engine with a 500 for that
/// stage's first run, after the save. The engine runs the stage again with the state the first run got, and the
/// transition must still complete.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineStepRerunTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string Scenario = "workflow-engine-step-rerun";

    [Fact]
    public async Task ProcessNext_StageThatReplacedAndRemovedFilesRunsAgainAfterItsSave_Completes()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        using (var reset = await fixture.GetDirectAppClient().PostAsync($"/test/{Scenario}/reset", null))
        {
            reset.EnsureSuccessStatusCode();
        }

        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        await PatchValidFormData(fixture, token, instance);

        // The retry waits out its backoff, so process/next answers 200 if the stage has completed by then and 202 if
        // it has not. The settled state is polled.
        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processNext = await processNextResponse.Read<CoreProcessState>();
        Assert.Contains(processNext.Response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Accepted });
        await WaitForIdle(fixture, token, instance);

        string logs = await fixture.GetSnapshotAppLogs();
        AssertInOrder(
            logs,
            "StepRerun.StoreFiles.Run1.Completed",
            "StepRerun.ReplaceAndRemove.Run1.Read:replaced-v1+removed-v1",
            "StepRerun.AnswerLost",
            // The second run reads what the first run read, although Storage has replaced one file and removed the
            // other since.
            "StepRerun.ReplaceAndRemove.Run2.Read:replaced-v1+removed-v1"
        );
        Assert.DoesNotContain("StepRerun.StoreFiles.Run2", logs);
        Assert.DoesNotContain("StepRerun.ReplaceAndRemove.Run3", logs);

        using var download = await fixture.Instances.Download(token, instance);
        Assert.Equal("Task_2", download.Instance.Data.Model!.Process.CurrentTask!.ElementId);
        DataElement attachment = Assert.Single(download.Instance.Data.Model.Data, d => d.DataType == "attachment");
        Assert.Equal("replaced.txt", attachment.Filename);
        var content = Assert.Single(download.Data.OfType<InstanceDataDownload.Binary>());
        Assert.Equal("replaced-v2", Encoding.UTF8.GetString(Assert.IsType<byte[]>(content.Data.Data.Model)));
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstance(AppFixture fixture, string token)
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiationResponse.Response.StatusCode);
        Assert.Equal("Task_1", readInstantiationResponse.Data.Model!.Process.CurrentTask!.ElementId);
        return readInstantiationResponse;
    }

    private static async Task PatchValidFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Guid dataElementId = Guid.Parse(instance.Data.Model!.Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        JsonPatchOperation.ParseList(
                            """
                            [
                                { "op": "replace", "path": "/property1", "value": "2" },
                                { "op": "replace", "path": "/property2", "value": "2" }
                            ]
                            """
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);
    }

    private static async Task WaitForIdle(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        DateTimeOffset deadline = DateTimeOffset.UtcNow + TimeSpan.FromSeconds(60);
        WorkflowActivityStatus? lastSeenStatus = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var processResponse = await fixture.Instances.GetProcess(token, instance);
            using var process = await processResponse.Read<CoreProcessState>();
            lastSeenStatus = process.Data.Model?.Workflow?.Status;
            if (lastSeenStatus == WorkflowActivityStatus.Idle)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail($"The transition did not settle within the deadline (last seen status: {lastSeenStatus}).");
    }

    private static void AssertInOrder(string logs, params string[] messages)
    {
        int previousIndex = -1;
        foreach (string message in messages)
        {
            int index = logs.IndexOf(message, previousIndex + 1, StringComparison.Ordinal);
            Assert.True(index >= 0, $"Could not find '{message}' after index {previousIndex} in logs:\n{logs}");
            previousIndex = index;
        }
    }
}
