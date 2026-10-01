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

    [Fact]
    public async Task Save_CanceledOnceWritingHasStarted_CompletesTheEditInOrder()
    {
        AltinnRepoEditingContext context = await CreateApp();
        string originalProcess = await File.ReadAllTextAsync(ProcessPath);
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
        ProcessEditRequest request = Rename(initial);

        ProcessState saved = await service.Save(context, request, cancellation.Token);

        Assert.True(cancellation.IsCancellationRequested);
        Assert.True(folderRenamedBeforeHandlers);
        Assert.True(processUnchangedAfterHandlers);
        Assert.Equal(request.BpmnXml, saved.BpmnXml);
        Assert.Equal(request.BpmnXml, await File.ReadAllTextAsync(ProcessPath));
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
