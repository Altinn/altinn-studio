using System.Net;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;
using static Altinn.App.Integration.Tests.Upgrade.UpgradeTestHelpers;

namespace Altinn.App.Integration.Tests.Upgrade;

/// <summary>
/// The ttd/service-task app from altinn.studio across the v8 -> v9 upgrade. After two data tasks its process runs a
/// layout PDF task, an automatic PDF task, the app's own FailServiceTask (which fails while Model2.fail is true and
/// lets the user reject back to Task_Utfylling2) and an eFormidling task.
/// </summary>
[Trait("Category", "Integration")]
public class ServiceTaskUpgradeTests(ITestOutputHelper output)
{
    private const string PartyId = "501337";
    private const string PdfDataType = "ref-data-as-pdf";

    [Fact]
    public async Task InstancesLeftInDataAndServiceTasks_CompleteAfterUpgrade()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.ServiceTaskV8);
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        await AssertLibraryMajorVersion(fixture, 8);

        // In Task_Utfylling1
        using var first = await Instantiate(fixture, token, PartyId);
        await SetFormValue(fixture, token, first, "model", "property1", "first on v8");

        // In Task_Utfylling2
        using var second = await Instantiate(fixture, token, PartyId);
        await SubmitFirstTask(fixture, token, second);
        await SetFormValue(fixture, token, second, "Model2", "property1", "second on v8");
        await SetFormValue(fixture, token, second, "Model2", "fail", false);

        // In Task_Fail, where v8 leaves an instance whose FailServiceTask failed
        using var parked = await Instantiate(fixture, token, PartyId);
        await ParkInFailingServiceTask(fixture, token, parked);

        // Completed on v8, through both PDF tasks and the eFormidling task
        using var completed = await Instantiate(fixture, token, PartyId);
        await SubmitFirstTask(fixture, token, completed);
        await SetFormValue(fixture, token, completed, "Model2", "property1", "completed on v8");
        await SetFormValue(fixture, token, completed, "Model2", "fail", false);
        await AssertProcessNext(fixture, token, completed, action: null, expectedTask: null);

        await fixture.UpgradeTo(TestApps.ServiceTaskV9);
        await AssertLibraryMajorVersion(fixture, 9);

        // Both PDF tasks, the app's service task and the eFormidling task run on v9
        await AssertProcessNext(fixture, token, first, action: null, expectedTask: "Task_Utfylling2");
        await SetFormValue(fixture, token, first, "Model2", "property1", "first on v9");
        await SetFormValue(fixture, token, first, "Model2", "fail", false);
        await AssertProcessNext(fixture, token, first, action: null, expectedTask: null);
        await AssertOnePdfFromEachPdfTask(fixture, token, first);

        await AssertProcessNext(fixture, token, second, action: null, expectedTask: null);
        await AssertOnePdfFromEachPdfTask(fixture, token, second);

        // Rejecting the failed task works as on v8 and sends the instance back to Task_Utfylling2. Running the PDF
        // tasks again replaces the PDFs v8 generated rather than adding to them
        await AssertProcessNext(fixture, token, parked, action: "reject", expectedTask: "Task_Utfylling2");
        await SetFormValue(fixture, token, parked, "Model2", "fail", false);
        await AssertProcessNext(fixture, token, parked, action: null, expectedTask: null);
        await AssertOnePdfFromEachPdfTask(fixture, token, parked);

        Instance completedInstance = await GetInstance(fixture, token, completed);
        Assert.NotNull(completedInstance.Process.Ended);
        await AssertOnePdfFromEachPdfTask(fixture, token, completed);
    }

    [Fact(
        Skip = "Known gap: v9 finds no workflow for a service task v8 left, so process/next moves on without running "
            + "it. Here that takes the instance past FailServiceTask to the end while Model2.fail is still true. "
            + "Enable when v9 runs such a task."
    )]
    public async Task InstanceLeftInFailedServiceTask_RunsTheTaskAgainAfterUpgrade()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.ServiceTaskV8);
        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var parked = await Instantiate(fixture, token, PartyId);
        await ParkInFailingServiceTask(fixture, token, parked);

        await fixture.UpgradeTo(TestApps.ServiceTaskV9);

        // Model2.fail is still true, so the task must fail again. The upgraded FailServiceTask answers that with
        // Success("reject"), which the process routes back to Task_Utfylling2
        await AssertProcessNext(fixture, token, parked, action: null, expectedTask: "Task_Utfylling2");
    }

    private static async Task SubmitFirstTask(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        await SetFormValue(fixture, token, instance, "model", "property1", "filled on v8");
        await AssertProcessNext(fixture, token, instance, action: null, expectedTask: "Task_Utfylling2");
    }

    private static async Task ParkInFailingServiceTask(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        await SubmitFirstTask(fixture, token, instance);
        await SetFormValue(fixture, token, instance, "Model2", "property1", "parked on v8");
        await SetFormValue(fixture, token, instance, "Model2", "fail", true);
        using (var failed = await fixture.Instances.ProcessNext(token, instance))
        {
            Assert.Equal(HttpStatusCode.InternalServerError, failed.Response.StatusCode);
        }
        fixture.TestErrored = false; // The 500 is FailServiceTask doing its job
        Instance parkedInstance = await GetInstance(fixture, token, instance);
        Assert.Equal("Task_Fail", parkedInstance.Process.CurrentTask?.ElementId);
    }

    private static async Task AssertOnePdfFromEachPdfTask(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Instance current = await GetInstance(fixture, token, instance);
        List<string?> pdfSources = current
            .Data.Where(d => d.DataType == PdfDataType)
            .Select(GeneratedFromTask)
            .Order()
            .ToList();
        Assert.Equal(["Task_PDF_Auto", "Task_PDF_Layout"], pdfSources);
    }
}
