using System;
using System.IO;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ProcessEditing;

public sealed class ProcessEditingCancellationTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<ProcessEditingCancellationTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Save_WithAlreadyCanceledToken_DoesNotChangeFiles(bool renameTask)
    {
        AltinnRepoEditingContext context = await CreateApp();
        using WebApplicationFactory<Program> configuredFactory = CreateFactory();
        using IServiceScope scope = configuredFactory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProcessEditingService>();
        ProcessState initial = service.GetState(context);
        ProcessEditRequest request = renameTask
            ? Rename(initial)
            : new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                BpmnXml = initial.BpmnXml.Replace("Utfylling", "Updated name"),
            };
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.Save(context, request, cancellation.Token)
        );

        Assert.Equal(initial, service.GetState(context));
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedTask")));
    }

    [Theory]
    [InlineData("layoutSetCreation")]
    [InlineData("layoutSetDeletion")]
    [InlineData("layoutSetRename")]
    [InlineData("dataTypesChange")]
    public async Task Save_OperationWithAlreadyCanceledToken_DoesNotChangeFiles(string operation)
    {
        AltinnRepoEditingContext context = await CreateApp();
        using WebApplicationFactory<Program> configuredFactory = CreateFactory();
        using IServiceScope scope = configuredFactory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IProcessEditingService>();
        ProcessState initial = service.GetState(context);
        string metadata = await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json"));
        ProcessEditRequest request = operation switch
        {
            "layoutSetCreation" => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetCreation = new LayoutSetPayload
                {
                    LayoutSetConfigDto = new LayoutSetConfigDto { Id = "CustomReceipt", DataType = "model" },
                },
            },
            "layoutSetDeletion" => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetDeletion = new ProcessLayoutSetDeletion("Task_1"),
            },
            "layoutSetRename" => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetRename = new ProcessLayoutSetRename("Task_1", "RenamedTask"),
            },
            _ => new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                DataTypesChange = new DataTypesChange { ConnectedTaskId = "Task_1", NewDataTypes = ["subform-model"] },
            },
        };
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            service.Save(context, request, cancellation.Token)
        );

        Assert.Equal(initial, service.GetState(context));
        Assert.True(Directory.Exists(AppPath("ui/Task_1")));
        Assert.False(Directory.Exists(AppPath("ui/CustomReceipt")));
        Assert.False(Directory.Exists(AppPath("ui/RenamedTask")));
        Assert.Equal(metadata, await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Save_CanceledAfterAncillaryWrite_CompletesTheEdit(bool renameLayoutSet)
    {
        AltinnRepoEditingContext context = await CreateApp();
        // Normalize fixture line endings to match server-generated XML on every platform.
        string originalProcess = (await File.ReadAllTextAsync(ProcessPath)).ReplaceLineEndings("\n");
        await File.WriteAllTextAsync(ProcessPath, originalProcess);
        bool folderRenamedBeforeHandlers = false;
        bool processUnchangedAfterHandlers = false;
        using WebApplicationFactory<Program> configuredFactory = CreateFactory();
        using IServiceScope scope = configuredFactory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, context.Developer)], "Test")),
        };
        var realPublisher = scope.ServiceProvider.GetRequiredService<IPublisher>();
        using var cancellation = new CancellationTokenSource();
        var publisher = new Mock<IPublisher>(MockBehavior.Strict);
        publisher
            .Setup(value => value.Publish(It.IsAny<ProcessTaskIdChangedEvent>(), It.IsAny<CancellationToken>()))
            .Returns(
                async (ProcessTaskIdChangedEvent notification, CancellationToken token) =>
                {
                    folderRenamedBeforeHandlers =
                        Directory.Exists(AppPath("ui/RenamedTask")) && !Directory.Exists(AppPath("ui/Task_1"));
                    await realPublisher.Publish(notification, token);
                    processUnchangedAfterHandlers = await File.ReadAllTextAsync(ProcessPath) == originalProcess;
                    cancellation.Cancel();
                }
            );
        var service = ActivatorUtilities.CreateInstance<ProcessEditingService>(scope.ServiceProvider, publisher.Object);
        ProcessState initial = service.GetState(context);
        ProcessEditRequest request = renameLayoutSet
            ? new ProcessEditRequest
            {
                ExpectedVersion = initial.Version,
                LayoutSetRename = new ProcessLayoutSetRename("Task_1", "RenamedTask"),
            }
            : Rename(initial);
        string expectedProcess = originalProcess.Replace("\"Task_1\"", "\"RenamedTask\"");

        ProcessState saved = await service.Save(context, request, cancellation.Token);

        Assert.True(cancellation.IsCancellationRequested);
        Assert.True(folderRenamedBeforeHandlers);
        Assert.True(processUnchangedAfterHandlers);
        Assert.Equal(expectedProcess, saved.BpmnXml);
        Assert.Equal(expectedProcess, await File.ReadAllTextAsync(ProcessPath));
        Assert.Equal(saved, service.GetState(context));
        Assert.False(Directory.Exists(AppPath("ui/Task_1")));
        Assert.True(Directory.Exists(AppPath("ui/RenamedTask")));
        Assert.Contains("RenamedTask", await File.ReadAllTextAsync(AppPath("config/applicationmetadata.json")));
        publisher.Verify(
            value =>
                value.Publish(
                    It.Is<ProcessTaskIdChangedEvent>(notification => notification.PublisherNotifies),
                    CancellationToken.None
                ),
            Times.Once
        );
    }

    private async Task<AltinnRepoEditingContext> CreateApp()
    {
        string repository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", repository);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", repository, "testUser");
    }

    private WebApplicationFactory<Program> CreateFactory() =>
        Factory.WithWebHostBuilder(builder =>
        {
            TestWebHostDefaults.Configure(builder);
            builder.UseSetting("OpenTelemetry:Enabled", bool.FalseString);
            builder.ConfigureAppConfiguration(
                (_, configuration) =>
                {
                    configuration.AddJsonFile(GetConfigPath());
                    configuration.AddJsonStream(GenerateJsonOverrideConfig());
                }
            );
            builder.ConfigureTestServices(ConfigureTestServices);
        });

    private string AppPath(string relativePath) => Path.Combine(TestRepoPath, "App", relativePath);

    private string ProcessPath => AppPath("config/process/process.bpmn");

    private static ProcessEditRequest Rename(ProcessState state) =>
        new()
        {
            ExpectedVersion = state.Version,
            BpmnXml = state.BpmnXml.Replace("Task_1", "RenamedTask"),
            Metadata = new ProcessDefinitionMetadata
            {
                TaskIdChange = new TaskIdChange { OldId = "Task_1", NewId = "RenamedTask" },
            },
        };
}
