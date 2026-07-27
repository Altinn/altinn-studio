using System.Net;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineGeneratedFromTaskCleanupTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    /// <summary>
    /// Drives a full loop through a process with a PDF service task and a reject back-flow:
    /// Task_1 (data) → Task_Pdf (pdf, auto-advances) → Task_Confirm → reject → Task_1 → forward again → confirm → end.
    /// Verifies the generatedFromTask cleanup pipeline property on task re-entry:
    /// - the untagged autoCreated form data element survives re-entering Task_1 (same id, same content),
    /// - the PDF tagged with Task_Pdf survives the backward transition (it is only cleaned when Task_Pdf is re-entered),
    /// - re-traversing Task_Pdf deletes the previous visit's PDF and generates a fresh one (exactly one element, new id),
    /// - the Task_Pdf task-starting hook observes zero elements tagged with the entering task on every visit
    ///   (CleanupGeneratedFromTask runs before OnTaskStartingHook).
    /// </summary>
    [Fact]
    public async Task ProcessNext_RejectBackPastPdfServiceTask_CleansStalePdfAndPreservesFormData()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-generated-from-task-cleanup"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        // Instantiate → Task_1, with the autoCreated (untagged) form data element
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var instance = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.Equal("Task_1", instance.Data.Model!.Process.CurrentTask!.ElementId);
        string modelElementId = instance.Data.Model.Data.Single(d => d.DataType == "model").Id;

        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        Guid.Parse(modelElementId),
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

        // Task_1 → Task_Pdf (generates tagged PDF post-commit and auto-advances) → Task_Confirm
        using var firstNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var firstNext = await firstNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, firstNext.Response.StatusCode);
        Assert.Equal("Task_Confirm", firstNext.Data.Model!.CurrentTask!.ElementId);

        // First visit produced exactly one PDF, tagged as generated from Task_Pdf
        using var atConfirmResponse = await fixture.Instances.Get(token, instance);
        using var atConfirm = await atConfirmResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, atConfirm.Response.StatusCode);
        DataElement firstPdf = atConfirm.Data.Model!.Data.Single(d => d.DataType == "ref-data-as-pdf");
        Assert.NotNull(firstPdf.References);
        Assert.Contains(
            firstPdf.References,
            r => r.Relation == RelationType.GeneratedFrom && r.ValueType == ReferenceType.Task && r.Value == "Task_Pdf"
        );
        Assert.Equal(modelElementId, atConfirm.Data.Model.Data.Single(d => d.DataType == "model").Id);

        // Reject: Task_Confirm → gateway → back to Task_1
        using var rejectResponse = await fixture.Instances.ProcessNext(
            token,
            atConfirm,
            new ProcessNext { Action = "reject" }
        );
        using var rejectState = await rejectResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, rejectState.Response.StatusCode);
        Assert.Equal("Task_1", rejectState.Data.Model!.CurrentTask!.ElementId);

        // Re-entering Task_1 must not remove the untagged form data element (same id, same content),
        // and the PDF tagged with Task_Pdf is untouched until Task_Pdf itself is re-entered.
        using var afterReject = await fixture.Instances.Download(token, atConfirm);
        Instance afterRejectInstance = afterReject.Instance.Data.Model!;
        Assert.Equal("Task_1", afterRejectInstance.Process.CurrentTask!.ElementId);
        Assert.Equal(modelElementId, afterRejectInstance.Data.Single(d => d.DataType == "model").Id);
        DataElement pdfAfterReject = afterRejectInstance.Data.Single(d => d.DataType == "ref-data-as-pdf");
        Assert.Equal(firstPdf.Id, pdfAfterReject.Id);
        var formData = (InstanceDataDownload.Form)afterReject.Data.Single(d => d.DataType == "model");
        Argon.JToken formDataModel = formData.Data.Data.Model!;
        Assert.Equal("2", (string?)formDataModel["property1"]);
        Assert.Equal("2", (string?)formDataModel["property2"]);

        // Forward again: re-entering Task_Pdf removes the stale PDF before task-start logic runs,
        // and the service task generates a fresh one post-commit
        using var secondNextResponse = await fixture.Instances.ProcessNext(token, atConfirm);
        using var secondNext = await secondNextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, secondNext.Response.StatusCode);
        Assert.Equal("Task_Confirm", secondNext.Data.Model!.CurrentTask!.ElementId);

        using var afterRegenerationResponse = await fixture.Instances.Get(token, atConfirm);
        using var afterRegeneration = await afterRegenerationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, afterRegeneration.Response.StatusCode);
        DataElement secondPdf = afterRegeneration.Data.Model!.Data.Single(d => d.DataType == "ref-data-as-pdf");
        Assert.NotEqual(firstPdf.Id, secondPdf.Id);
        Assert.NotNull(secondPdf.References);
        Assert.Contains(
            secondPdf.References,
            r => r.Relation == RelationType.GeneratedFrom && r.ValueType == ReferenceType.Task && r.Value == "Task_Pdf"
        );
        Assert.Equal(modelElementId, afterRegeneration.Data.Model.Data.Single(d => d.DataType == "model").Id);

        // Confirm → EndEvent_1
        using var confirmResponse = await fixture.Instances.ProcessNext(
            token,
            atConfirm,
            new ProcessNext { Action = "confirm" }
        );
        using var confirmState = await confirmResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, confirmState.Response.StatusCode);
        Assert.Null(confirmState.Data.Model!.CurrentTask);
        Assert.Equal("EndEvent_1", confirmState.Data.Model.EndEvent);

        // The Task_Pdf task-starting hook ran after CleanupGeneratedFromTask on both visits,
        // so it never observed an element tagged with the entering task - not even the
        // first visit's PDF on re-entry.
        string logs = await fixture.GetSnapshotAppLogs();
        int hookObservations = CountOccurrences(
            logs,
            "GeneratedFromTaskCleanup.OnTaskStarting.Task_Pdf.TaggedElementCount="
        );
        int cleanHookObservations = CountOccurrences(
            logs,
            "GeneratedFromTaskCleanup.OnTaskStarting.Task_Pdf.TaggedElementCount=0"
        );
        Assert.Equal(2, hookObservations);
        Assert.Equal(2, cleanHookObservations);
    }

    private static int CountOccurrences(string text, string value)
    {
        int count = 0;
        int index = 0;
        while ((index = text.IndexOf(value, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += value.Length;
        }
        return count;
    }
}
