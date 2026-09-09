using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class SigningProcessTaskTests
{
    private const string TaskId = "Task_1";

    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new(MockBehavior.Strict);

    public SigningProcessTaskTests()
    {
        _hostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns("Production");
    }

    [Fact]
    public void ValidateConfiguration_MissingSignatureConfiguration_ReturnsFinding()
    {
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(TaskId)).Returns((AltinnTaskExtension?)null);
        SigningProcessTask task = CreateTask();

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(HostingEnvironment.Production))
            .ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("SignatureConfig is missing", finding);
    }

    [Fact]
    public void ValidateConfiguration_MissingSignatureDataType_ReturnsFinding()
    {
        SetupConfiguration(new AltinnSignatureConfiguration());
        SigningProcessTask task = CreateTask();

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(HostingEnvironment.Production))
            .ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("SignatureDataType", finding);
    }

    [Fact]
    public void ValidateConfiguration_UnpairedSigneeSettings_ReturnsFinding()
    {
        SetupConfiguration(
            new AltinnSignatureConfiguration
            {
                SignatureDataType = "SignatureDataType",
                SigneeProviderId = "SigneeProviderId",
            }
        );
        SigningProcessTask task = CreateTask(new FakeSigneeProvider());

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(HostingEnvironment.Development))
            .ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("must either be set together", finding);
    }

    [Fact]
    public void ValidateConfiguration_NoSigneeProviderWithConfiguredId_ReturnsFinding()
    {
        SetupConfiguration(CreateRuntimeDelegatedConfiguration(withGlobalCorrespondenceResource: true));
        SigningProcessTask task = CreateTask(new FakeSigneeProvider { Id = "another-provider" });

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(HostingEnvironment.Production))
            .ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("exactly one ISigneeProvider with id 'SigneeProviderId', found 0", finding);
    }

    [Theory]
    [InlineData(HostingEnvironment.Production, 1)]
    [InlineData(HostingEnvironment.Staging, 1)]
    [InlineData(HostingEnvironment.Development, 0)]
    [InlineData(HostingEnvironment.Unknown, 0)]
    public void ValidateConfiguration_MissingCorrespondenceResource_FailsOnlyWhereSigneesMustBeNotified(
        HostingEnvironment environment,
        int expectedFindings
    )
    {
        SetupConfiguration(CreateRuntimeDelegatedConfiguration(withGlobalCorrespondenceResource: false));
        SigningProcessTask task = CreateTask(new FakeSigneeProvider());

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(environment)).ToList();

        Assert.Equal(expectedFindings, findings.Count);
        if (expectedFindings > 0)
        {
            Assert.Contains("no correspondence resource is configured", findings[0]);
        }
    }

    [Fact]
    public void ValidateConfiguration_ValidRuntimeDelegatedConfiguration_ReturnsNoFindings()
    {
        SetupConfiguration(CreateRuntimeDelegatedConfiguration(withGlobalCorrespondenceResource: true));
        SigningProcessTask task = CreateTask(new FakeSigneeProvider());

        List<string> findings = task.ValidateConfiguration(CreateValidationContext(HostingEnvironment.Production))
            .ToList();

        Assert.Empty(findings);
    }

    [Fact]
    public void ValidateConfiguration_DataTypeNotAppOwned_ReturnsFindingInDevelopment()
    {
        _hostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns("Development");
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        SigningProcessTask task = CreateTask();
        ApplicationMetadata userOwnedMetadata = new("ttd/app")
        {
            DataTypes = [new DataType { Id = "SignatureDataType", TaskId = TaskId }],
        };

        List<string> findings = task.ValidateConfiguration(
                CreateValidationContext(HostingEnvironment.Development, userOwnedMetadata)
            )
            .ToList();

        Assert.NotEmpty(findings);
        Assert.All(findings, finding => Assert.StartsWith($"Task '{TaskId}':", finding));
    }

    [Fact]
    public void GetStartCommands_RuntimeDelegated_DeclaresResolveThenFrozenPlanScheduler()
    {
        SetupConfiguration(CreateRuntimeDelegatedConfiguration(withGlobalCorrespondenceResource: true));
        SigningProcessTask task = CreateTask();

        IReadOnlyList<WorkflowCommandRef> commands = task.GetStartCommands(TaskId);

        Assert.Equal(
            [
                new WorkflowCommandRef(
                    ResolveSigneesCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
                new WorkflowCommandRef(
                    ScheduleSigneeInitialization.Key,
                    CommandPayloadSerializer.Serialize(new ScheduleSigneeInitializationPayload(TaskId))
                ),
            ],
            commands
        );
    }

    [Fact]
    public void GetStartCommands_NotRuntimeDelegated_DeclaresNothing()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        SigningProcessTask task = CreateTask();

        Assert.Empty(task.GetStartCommands(TaskId));
    }

    [Fact]
    public void GetEndCommands_PdfAndRuntimeDelegated_DeclaresPdfThenRevoke()
    {
        AltinnSignatureConfiguration configuration = CreateRuntimeDelegatedConfiguration(
            withGlobalCorrespondenceResource: true
        );
        configuration.SigningPdfDataType = "signing-pdf";
        SetupConfiguration(configuration);
        SigningProcessTask task = CreateTask();

        IReadOnlyList<WorkflowCommandRef> commands = task.GetEndCommands(TaskId);

        Assert.Equal(
            [
                new WorkflowCommandRef(
                    GenerateSigningPdfCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
                new WorkflowCommandRef(
                    RevokeSigneeRightsCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
            ],
            commands
        );
    }

    [Fact]
    public void GetEndCommands_NoPdfNotDelegated_DeclaresNothing()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        SigningProcessTask task = CreateTask();

        Assert.Empty(task.GetEndCommands(TaskId));
    }

    [Fact]
    public void GetAbandonCommands_DeclaresAbort()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        SigningProcessTask task = CreateTask();

        Assert.Equal(
            [
                new WorkflowCommandRef(
                    AbortRuntimeDelegatedSigningCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
            ],
            task.GetAbandonCommands(TaskId)
        );
    }

    private SigningProcessTask CreateTask(params ISigneeProvider[] signeeProviders)
    {
        var services = new ServiceCollection();
        foreach (ISigneeProvider provider in signeeProviders)
        {
            services.AddSingleton(provider);
        }

        ServiceProvider serviceProvider = services.BuildServiceProvider();
        return new SigningProcessTask(
            _processReaderMock.Object,
            _hostEnvironmentMock.Object,
            serviceProvider,
            NullLogger<SigningProcessTask>.Instance
        );
    }

    private void SetupConfiguration(AltinnSignatureConfiguration configuration) =>
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(TaskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = configuration });

    private static ProcessTaskValidationContext CreateValidationContext(
        HostingEnvironment environment,
        ApplicationMetadata? applicationMetadata = null
    ) =>
        new()
        {
            TaskId = TaskId,
            Environment = environment,
            ApplicationMetadata =
                applicationMetadata
                ?? new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        new DataType
                        {
                            Id = "SignatureDataType",
                            TaskId = TaskId,
                            AllowedContributors = ["app:owned"],
                        },
                        new DataType
                        {
                            Id = "SigneeStatesDataTypeId",
                            TaskId = TaskId,
                            AllowedContributors = ["app:owned"],
                        },
                    ],
                },
        };

    private static AltinnSignatureConfiguration CreateRuntimeDelegatedConfiguration(
        bool withGlobalCorrespondenceResource
    ) =>
        new()
        {
            SignatureDataType = "SignatureDataType",
            SigneeStatesDataTypeId = "SigneeStatesDataTypeId",
            SigneeProviderId = "SigneeProviderId",
            CorrespondenceResources = withGlobalCorrespondenceResource
                ? [new AltinnEnvironmentConfig { Value = "app_ttd_correspondence" }]
                : null!,
        };

    private sealed class FakeSigneeProvider : ISigneeProvider
    {
        public string Id { get; init; } = "SigneeProviderId";

        public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters) =>
            throw new NotSupportedException("Not used by these tests.");
    }
}
