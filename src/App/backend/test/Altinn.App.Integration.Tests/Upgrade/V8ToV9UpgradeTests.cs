using System.Net;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;
using static Altinn.App.Integration.Tests.Upgrade.UpgradeTestHelpers;

namespace Altinn.App.Integration.Tests.Upgrade;

/// <summary>
/// Instances a v8 app leaves behind must keep working when the app is upgraded to v9 and deployed.
/// Each test starts <see cref="TestApps.UpgradeV8"/> (a released v8 version of the libraries), leaves instances at
/// different points in the process, swaps in <see cref="TestApps.UpgradeV9"/> (the same app after
/// <c>studioctl app upgrade v9</c>) under the same app id, and continues the instances on v9.
/// </summary>
[Trait("Category", "Integration")]
public class V8ToV9UpgradeTests(ITestOutputHelper output)
{
    private const string PartyId = "501337";
    private const string PdfDataType = "ref-data-as-pdf";

    [Fact]
    public async Task InstancesLeftInDataAndConfirmationTasks_CompleteAfterUpgrade()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.UpgradeV8);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        await AssertLibraryMajorVersion(fixture, 8);

        // In Task_1 with the form filled in
        using var filled = await Instantiate(fixture, token, PartyId);
        await SetFormValue(fixture, token, filled, "model", "property1", "filled on v8");

        // In Task_1 with the required field left empty
        using var empty = await Instantiate(fixture, token, PartyId);

        // In Task_2. v8 generated the PDF when Task_1 ended (enablePdfCreation)
        using var submitted = await Instantiate(fixture, token, PartyId);
        await SetFormValue(fixture, token, submitted, "model", "property1", "submitted on v8");
        await AssertProcessNext(fixture, token, submitted, action: null, expectedTask: "Task_2");

        // In Task_2 without the required field: v8 does not validate required fields on the server by default
        using var submittedEmpty = await Instantiate(fixture, token, PartyId);
        await AssertProcessNext(fixture, token, submittedEmpty, action: null, expectedTask: "Task_2");

        using var completed = await Instantiate(fixture, token, PartyId);
        await SetFormValue(fixture, token, completed, "model", "property1", "completed on v8");
        await AssertProcessNext(fixture, token, completed, action: null, expectedTask: "Task_2");
        await AssertProcessNext(fixture, token, completed, action: "confirm", expectedTask: null);

        await fixture.UpgradeTo(TestApps.UpgradeV9);
        await AssertLibraryMajorVersion(fixture, 9);

        // The upgrade replaced enablePdfCreation with a PDF service task between Task_1 and Task_2
        await SetFormValue(fixture, token, filled, "model", "property2", "added on v9");
        await AssertProcessNext(fixture, token, filled, action: null, expectedTask: "Task_2");
        await AssertProcessNext(fixture, token, filled, action: "confirm", expectedTask: null);
        Instance filledInstance = await GetInstance(fixture, token, filled);
        DataElement filledPdf = Assert.Single(filledInstance.Data, d => d.DataType == PdfDataType);
        Assert.Equal("PdfTask_Task_1", GeneratedFromTask(filledPdf));
        JsonNode filledFormData = await GetFormData(fixture, token, filled, "model");
        Assert.Equal("filled on v8", filledFormData["property1"]?.GetValue<string>());
        Assert.Equal("added on v9", filledFormData["property2"]?.GetValue<string>());

        // Already past the PDF service task, so the PDF v8 generated is the only one. v8 tags it with the
        // task it was generated from, the PDF service task tags it with the service task
        await AssertProcessNext(fixture, token, submitted, action: "confirm", expectedTask: null);
        Instance submittedInstance = await GetInstance(fixture, token, submitted);
        DataElement submittedPdf = Assert.Single(submittedInstance.Data, d => d.DataType == PdfDataType);
        Assert.Equal("Task_1", GeneratedFromTask(submittedPdf));

        // Data that v8 accepted is not validated again once the instance has left the task
        await AssertProcessNext(fixture, token, submittedEmpty, action: "confirm", expectedTask: null);

        Instance completedInstance = await GetInstance(fixture, token, completed);
        Assert.NotNull(completedInstance.Process.Ended);
        Assert.Single(completedInstance.Data, d => d.DataType == PdfDataType);

        // v9 validates required fields on the server by default (AppSettings.RequiredValidation), so an
        // instance v8 would have let through is now held in Task_1 until the field is filled in
        using (var blocked = await fixture.Instances.ProcessNext(token, empty))
        {
            Assert.Equal(HttpStatusCode.Conflict, blocked.Response.StatusCode);
        }
        await SetFormValue(fixture, token, empty, "model", "property1", "filled on v9");
        await AssertProcessNext(fixture, token, empty, action: null, expectedTask: "Task_2");
        await AssertProcessNext(fixture, token, empty, action: "confirm", expectedTask: null);
    }

    [Fact(
        Skip = "Known gap: v9 finds no workflow for a service task v8 left, so process/next moves on without running "
            + "it (no PDF here) and process/resume answers 409. Enable when v9 runs such a task."
    )]
    public async Task InstanceLeftInFailedServiceTask_RunsTheTaskAfterUpgrade()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.UpgradeV8, "failed-service-task");
        string token = await fixture.Auth.GetUserToken(userId: 1337);

        // The PDF task fails on v8 (see the scenario's UnavailablePdfServiceTask), which leaves the instance in it
        using var parked = await Instantiate(fixture, token, PartyId);
        await SetFormValue(fixture, token, parked, "model", "property1", "filled on v8");
        using (var failed = await fixture.Instances.ProcessNext(token, parked))
        {
            Assert.Equal(HttpStatusCode.InternalServerError, failed.Response.StatusCode);
        }
        fixture.TestErrored = false; // The 500 above is the point of the scenario
        Instance parkedInstance = await GetInstance(fixture, token, parked);
        Assert.Equal("PdfTask", parkedInstance.Process.CurrentTask?.ElementId);
        Assert.DoesNotContain(parkedInstance.Data, d => d.DataType == PdfDataType);

        await fixture.UpgradeTo(TestApps.UpgradeV9);

        await AssertProcessNext(fixture, token, parked, action: null, expectedTask: "Task_2");
        Instance continuedInstance = await GetInstance(fixture, token, parked);
        DataElement pdf = Assert.Single(continuedInstance.Data, d => d.DataType == PdfDataType);
        Assert.Equal("PdfTask", GeneratedFromTask(pdf));
    }
}
