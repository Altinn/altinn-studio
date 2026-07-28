using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CSharpApiMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    /// <summary>
    /// The reported <c>path:line: symbol</c> lines only, excluding the leading guidance summary. Negative
    /// assertions must use these: a summary legitimately names the surviving APIs to migrate towards, so
    /// searching the whole warning set for an API name that must not be flagged matches the summary.
    /// </summary>
    private static IEnumerable<string> Locations(MigrationResult result) =>
        result.Warnings.Where(static w => w.Contains(".cs:", StringComparison.Ordinal));

    // --- RemovedTaskEventInterfaceDetector -------------------------------------------------------

    [Fact]
    public void TaskEventDetector_FlagsImplementationsAndDiRegistrations()
    {
        _app.Write(
            "logic/MyTaskEnd.cs",
            """
            using Altinn.App.Core.Features;
            public class MyTaskEnd : IProcessTaskEnd
            {
                public Task End(string taskId, Instance instance) => Task.CompletedTask;
            }
            """
        );
        _app.Write(
            "Program.cs",
            """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddTransient<IProcessTaskEnd, MyTaskEnd>();
            """
        );

        var result = new RemovedTaskEventInterfaceDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("MyTaskEnd.cs") && w.Contains("MyTaskEnd : IProcessTaskEnd"));
        Assert.Contains(result.Warnings, w => w.Contains("Program.cs") && w.Contains("IProcessTaskEnd"));
    }

    [Fact]
    public void TaskEventDetector_FlagsBaseListGenericTypeArgument()
    {
        _app.Write(
            "logic/Wrapper.cs",
            """
            public class Wrapper : List<IProcessTaskEnd>
            {
            }
            """
        );

        var result = new RemovedTaskEventInterfaceDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("Wrapper.cs") && w.Contains("IProcessTaskEnd"));
    }

    [Fact]
    public void TaskEventDetector_CleanApp_ReportsNothing()
    {
        _app.Write(
            "logic/MyService.cs",
            """
            public class MyService
            {
                public Task DoWork() => Task.CompletedTask;
            }
            """
        );

        var result = new RemovedTaskEventInterfaceDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    // --- ServiceTaskResultApiDetector ------------------------------------------------------------

    [Fact]
    public void ServiceTaskResultDetector_FlagsRemovedTypesAndFactories()
    {
        _app.Write(
            "logic/MyServiceTask.cs",
            """
            public class MyServiceTask
            {
                public ServiceTaskResult Run()
                {
                    var handling = new ServiceTaskErrorHandling(ServiceTaskErrorStrategy.Abort);
                    return ServiceTaskResult.FailedContinueProcessNext("reject");
                }
            }
            """
        );

        var result = new ServiceTaskResultApiDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("ServiceTaskErrorHandling"));
        Assert.Contains(result.Warnings, w => w.Contains("FailedContinueProcessNext"));
    }

    [Fact]
    public void ServiceTaskResultDetector_FlagsQualifiedFailedFactory_NotUnrelatedFailed()
    {
        _app.Write(
            "logic/MyServiceTask.cs",
            """
            public class MyServiceTask
            {
                public ServiceTaskResult Run() => ServiceTaskResult.Failed(_handling);

                public void Unrelated() => _telemetry.Failed("other");
            }
            """
        );

        var result = new ServiceTaskResultApiDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("MyServiceTask.cs:3") && w.Contains("ServiceTaskResult.Failed")
        );
        Assert.DoesNotContain(result.Warnings, w => w.Contains("MyServiceTask.cs:5"));
    }

    // --- LegacyEFormidlingCodeDetector -----------------------------------------------------------

    [Fact]
    public void EFormidlingCodeDetector_FlagsRemovedProviderAndAppSetting()
    {
        _app.Write(
            "logic/LegacyProvider.cs",
            """
            public class LegacyProvider : IEFormidlingLegacyConfigurationProvider
            {
                public bool Enabled(AppSettings settings) => settings.EnableEFormidling;
            }
            """
        );

        var result = new LegacyEFormidlingCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("LegacyProvider : IEFormidlingLegacyConfigurationProvider"));
        Assert.Contains(result.Warnings, w => w.Contains("EnableEFormidling"));
    }

    [Fact]
    public void EFormidlingCodeDetector_FlagsLegacySingleArgShipment_NotMigratedUsage()
    {
        _app.Write(
            "logic/LegacySender.cs",
            """
            public class LegacySender : IEFormidlingService
            {
                public Task SendEFormidlingShipment(Instance instance) => Task.CompletedTask;
            }
            """
        );
        _app.Write(
            "logic/MigratedSender.cs",
            """
            public class MigratedSender
            {
                private readonly IEFormidlingService _service;

                public Task Send(Instance instance, ValidAltinnEFormidlingConfiguration config) =>
                    _service.SendEFormidlingShipment(instance, config);
            }
            """
        );

        var result = new LegacyEFormidlingCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("LegacySender.cs") && w.Contains("SendEFormidlingShipment"));
        Assert.DoesNotContain(result.Warnings, w => w.Contains("MigratedSender.cs"));
    }

    [Fact]
    public void EFormidlingCodeDetector_FlagsLegacySingleArgInvocation()
    {
        _app.Write(
            "logic/Caller.cs",
            """
            public class Caller
            {
                private readonly IEFormidlingService _service;

                public Task Send(Instance instance) => _service.SendEFormidlingShipment(instance);
            }
            """
        );

        var result = new LegacyEFormidlingCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("Caller.cs:5") && w.Contains("SendEFormidlingShipment"));
    }

    [Fact]
    public void EFormidlingCodeDetector_FlagsLegacyNullConditionalInvocation()
    {
        _app.Write(
            "logic/Caller.cs",
            """
            public class Caller
            {
                private readonly IEFormidlingService? _service;

                public Task? Send(Instance instance) => _service?.SendEFormidlingShipment(instance);
            }
            """
        );

        var result = new LegacyEFormidlingCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("Caller.cs:5") && w.Contains("SendEFormidlingShipment"));
    }

    // --- RemovedInternalProcessTypeDetector ------------------------------------------------------

    [Fact]
    public void InternalProcessTypeDetector_FlagsRemovedHandlerReference()
    {
        _app.Write(
            "logic/Custom.cs",
            """
            public class Custom
            {
                private readonly EndTaskEventHandler _handler;
            }
            """
        );

        var result = new RemovedInternalProcessTypeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("EndTaskEventHandler"));
    }

    // --- EFormidlingReceiversSignatureMigration --------------------------------------------------

    [Fact]
    public void ReceiversMigration_AddsParameterToImplementation()
    {
        var path = _app.Write(
            "logic/Receivers.cs",
            """
            public class Receivers : IEFormidlingReceivers
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
            }
            """
        );

        var result = new EFormidlingReceiversSignatureMigration(
            Scanner(),
            projectNullableAnnotationsEnabled: true
        ).Migrate();

        Assert.False(result.ManualActionRequired);
        Assert.NotEmpty(result.Warnings);
        var migrated = File.ReadAllText(path);
        Assert.Contains("GetEFormidlingReceivers(Instance instance, string? receiverFromConfig)", migrated);
    }

    [Fact]
    public void ReceiversMigration_IsIdempotent()
    {
        var path = _app.Write(
            "logic/Receivers.cs",
            """
            public class Receivers : IEFormidlingReceivers
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance, string? receiverFromConfig) => throw new NotImplementedException();
            }
            """
        );
        var before = File.ReadAllText(path);

        var result = new EFormidlingReceiversSignatureMigration(
            Scanner(),
            projectNullableAnnotationsEnabled: true
        ).Migrate();

        Assert.Empty(result.Warnings);
        Assert.Equal(before, File.ReadAllText(path));
    }

    [Fact]
    public void ReceiversMigration_IgnoresUnrelatedMethod()
    {
        var path = _app.Write(
            "logic/NotAReceiver.cs",
            """
            public class NotAReceiver
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
            }
            """
        );
        var before = File.ReadAllText(path);

        var result = new EFormidlingReceiversSignatureMigration(
            Scanner(),
            projectNullableAnnotationsEnabled: true
        ).Migrate();

        Assert.Empty(result.Warnings);
        Assert.Equal(before, File.ReadAllText(path));
    }

    [Fact]
    public void ReceiversMigration_WithoutNullableContext_AddsUnannotatedParameter()
    {
        var path = _app.Write(
            "logic/Receivers.cs",
            """
            public class Receivers : IEFormidlingReceivers
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
            }
            """
        );

        var result = new EFormidlingReceiversSignatureMigration(
            Scanner(),
            projectNullableAnnotationsEnabled: false
        ).Migrate();

        Assert.NotEmpty(result.Warnings);
        var migrated = File.ReadAllText(path);
        Assert.Contains("GetEFormidlingReceivers(Instance instance, string receiverFromConfig)", migrated);
    }

    [Fact]
    public void ReceiversMigration_FileLevelNullableDirective_OverridesProjectDefault()
    {
        var enabledByDirective = _app.Write(
            "logic/EnabledByDirective.cs",
            """
            #nullable enable
            public class EnabledByDirective : IEFormidlingReceivers
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
            }
            """
        );
        var disabledByDirective = _app.Write(
            "logic/DisabledByDirective.cs",
            """
            #nullable disable
            public class DisabledByDirective : IEFormidlingReceivers
            {
                public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance) => throw new NotImplementedException();
            }
            """
        );

        new EFormidlingReceiversSignatureMigration(Scanner(), projectNullableAnnotationsEnabled: false).Migrate();

        Assert.Contains("string? receiverFromConfig", File.ReadAllText(enabledByDirective));
        Assert.Contains("string receiverFromConfig", File.ReadAllText(disabledByDirective));
        Assert.DoesNotContain("string? receiverFromConfig", File.ReadAllText(disabledByDirective));
    }

    [Theory]
    [InlineData("<Nullable>enable</Nullable>", true)]
    [InlineData("<Nullable>annotations</Nullable>", true)]
    [InlineData("<Nullable>warnings</Nullable>", false)]
    [InlineData("<Nullable>disable</Nullable>", false)]
    [InlineData("", false)]
    public void ProjectEnablesNullableAnnotations_ReadsCsprojNullableProperty(string property, bool expected)
    {
        var projectFile = _app.Write(
            "App.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
                {property}
              </PropertyGroup>
            </Project>
            """
        );

        Assert.Equal(expected, EFormidlingReceiversSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    [Fact]
    public void ProjectEnablesNullableAnnotations_FallsBackToNearestDirectoryBuildProps()
    {
        var projectFile = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
        _app.Write(
            "Directory.Build.props",
            """
            <Project>
              <PropertyGroup>
                <Nullable>enable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );

        Assert.True(EFormidlingReceiversSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    [Fact]
    public void ProjectEnablesNullableAnnotations_ProjectFileWinsOverDirectoryBuildProps()
    {
        var projectFile = _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <Nullable>disable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );
        _app.Write(
            "Directory.Build.props",
            """
            <Project>
              <PropertyGroup>
                <Nullable>enable</Nullable>
              </PropertyGroup>
            </Project>
            """
        );

        Assert.False(EFormidlingReceiversSignatureMigration.ProjectEnablesNullableAnnotations(projectFile));
    }

    // --- LegacyCorrespondenceCodeDetector --------------------------------------------------------

    [Fact]
    public void CorrespondenceDetector_FlagsLegacyAuthorisationEnumAndTokenFactoryPayload()
    {
        _app.Write(
            "logic/SendLetter.cs",
            """
            using Altinn.App.Core.Features.Correspondence.Models;
            public class SendLetter
            {
                public SendCorrespondencePayload Legacy(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthorisation.Maskinporten);

                public GetCorrespondenceStatusPayload LegacyFactory(Guid id) =>
                    new GetCorrespondenceStatusPayload(id, () => _client.GetAltinnExchangedToken(_scopes));
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("SendLetter.cs:5") && w.Contains("CorrespondenceAuthorisation")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("SendLetter.cs:8") && w.Contains("new GetCorrespondenceStatusPayload(.., lambda)")
        );
        Assert.Contains(result.Warnings, w => w.Contains("CorrespondenceAuthenticationMethod"));
    }

    [Fact]
    public void CorrespondenceDetector_DoesNotFlagMigratedPayloadConstruction()
    {
        _app.Write(
            "logic/SendLetter.cs",
            """
            public class SendLetter
            {
                public SendCorrespondencePayload Default(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());

                public SendCorrespondencePayload Custom(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(
                        request,
                        CorrespondenceAuthenticationMethod.Custom(() => _client.GetToken())
                    );
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void CorrespondenceDetector_FlagsNoOpBuilderMethodsIncludingNullConditional()
    {
        _app.Write(
            "logic/BuildLetter.cs",
            """
            public class BuildLetter
            {
                public CorrespondenceRequest Build() =>
                    CorrespondenceRequestBuilder
                        .Create()
                        .WithResourceId("resource")
                        .WithSender(_org)
                        .WithSendersReference("ref")
                        .WithAllowSystemDeleteAfter(_deleteAfter)
                        .Build();

                public void Notify() => _notificationBuilder?.WithRequestedSendTime(_sendTime);
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("BuildLetter.cs:7") && w.Contains("WithSender"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("BuildLetter.cs:9") && w.Contains("WithAllowSystemDeleteAfter")
        );
        Assert.Contains(result.Warnings, w => w.Contains("BuildLetter.cs:12") && w.Contains("WithRequestedSendTime"));
        // WithSendersReference survives v9 and must not be confused with WithSender.
        Assert.DoesNotContain(Locations(result), w => w.Contains("WithSendersReference"));
    }

    [Fact]
    public void CorrespondenceDetector_FlagsDroppedFieldsInObjectInitialisers()
    {
        _app.Write(
            "logic/Letter.cs",
            """
            public class Letter
            {
                public CorrespondenceRequest Request() =>
                    new CorrespondenceRequest
                    {
                        Sender = _org,
                        AllowSystemDeleteAfter = _deleteAfter,
                        SendersReference = "ref",
                    };

                public CorrespondenceNotification Notification() =>
                    new CorrespondenceNotification { RequestedSendTime = _sendTime };

                public CorrespondenceAttachment Attachment() =>
                    new CorrespondenceAttachment { DataLocationType = _location };
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("Letter.cs:6") && w.Contains("CorrespondenceRequest.Sender"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Letter.cs:7") && w.Contains("CorrespondenceRequest.AllowSystemDeleteAfter")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Letter.cs:12") && w.Contains("CorrespondenceNotification.RequestedSendTime")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Letter.cs:15") && w.Contains("CorrespondenceAttachment.DataLocationType")
        );
        Assert.DoesNotContain(Locations(result), w => w.Contains("SendersReference"));
    }

    [Fact]
    public void CorrespondenceDetector_DoesNotFlagSurvivingSenderAndIsReservedOnResponses()
    {
        _app.Write(
            "logic/ReadStatus.cs",
            """
            public class ReadStatus
            {
                public void Read(GetCorrespondenceStatusResponse status)
                {
                    var sender = status.Sender;
                    var reserved = status.Notifications[0].Recipient.IsReserved;
                    var location = status.Content.Attachments[0].DataLocationType;
                    var sendTime = _notificationOrder.RequestedSendTime;
                }
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void CorrespondenceDetector_FlagsRecipientOverrideSurface()
    {
        _app.Write(
            "logic/Override.cs",
            """
            public class Override
            {
                public ICorrespondenceNotificationOverrideBuilder Legacy() =>
                    CorrespondenceNotificationOverrideBuilder
                        .Create()
                        .WithRecipientToOverride(_org)
                        .WithCorrespondenceNotificationRecipients(_recipients);

                public CorrespondenceNotification Wrapped() =>
                    new CorrespondenceNotification
                    {
                        CustomNotificationRecipients = [new CorrespondenceNotificationRecipientWrapper()],
                    };

                public CorrespondenceNotificationRecipient Reserved() =>
                    new CorrespondenceNotificationRecipient { IsReserved = true };

                public CorrespondenceNotification Singular() =>
                    new CorrespondenceNotification { CustomRecipient = _recipient };

                public CorrespondenceNotification Plural() =>
                    new CorrespondenceNotification { CustomRecipients = [_recipient] };
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("Override.cs:6") && w.Contains("WithRecipientToOverride"));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Override.cs:7") && w.Contains("WithCorrespondenceNotificationRecipients")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Override.cs:12") && w.Contains("CorrespondenceNotification.CustomNotificationRecipients")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Override.cs:12") && w.Contains("CorrespondenceNotificationRecipientWrapper")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Override.cs:16") && w.Contains("CorrespondenceNotificationRecipient.IsReserved")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Override.cs:19") && w.Contains("CorrespondenceNotification.CustomRecipient")
        );
        // `CustomRecipients` (plural) is the v9 replacement and must not be reported.
        Assert.DoesNotContain(Locations(result), w => w.Contains("Override.cs:22"));
    }

    [Fact]
    public void CorrespondenceDetector_DoesNotFlagSurvivingRecipientOverrideApi()
    {
        _app.Write(
            "logic/Override.cs",
            """
            public class Override
            {
                public CorrespondenceNotification Build() =>
                    CorrespondenceNotificationBuilder
                        .Create()
                        .WithNotificationTemplate(_template)
                        .WithRecipientOverride(
                            CorrespondenceNotificationOverrideBuilder
                                .Create()
                                .WithOrganizationNumber(_org)
                                .WithEmailAddress("nobody@example.com")
                                .Build()
                        )
                        .Build();
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void CorrespondenceDetector_FlagsRemovedDataLocationTypeEnum()
    {
        _app.Write(
            "logic/Attach.cs",
            """
            public class Attach
            {
                private CorrespondenceDataLocationType _location =
                    CorrespondenceDataLocationType.ExistingCorrespondenceAttachment;
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Attach.cs:3") && w.Contains("CorrespondenceDataLocationType")
        );
    }

    [Fact]
    public void CorrespondenceDetector_FlagsFullyQualifiedLegacyAuthorisationEnum()
    {
        _app.Write(
            "logic/SendLetter.cs",
            """
            public class SendLetter
            {
                public SendCorrespondencePayload Legacy(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(
                        request,
                        Altinn.App.Core.Features.Correspondence.Models.CorrespondenceAuthorisation.Maskinporten
                    );
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("SendLetter.cs:6") && w.Contains("CorrespondenceAuthorisation")
        );
    }

    [Fact]
    public void CorrespondenceDetector_FlagsRemovedBuilderStepInterface()
    {
        _app.Write(
            "logic/Steps.cs",
            """
            public class Steps
            {
                public ICorrespondenceRequestBuilderSender Start() =>
                    CorrespondenceRequestBuilder.Create().WithResourceId("resource");
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Steps.cs:3") && w.Contains("ICorrespondenceRequestBuilderSender")
        );
    }

    [Fact]
    public void CorrespondenceDetector_CleanApp_ReportsNothing()
    {
        _app.Write(
            "logic/MyService.cs",
            """
            public class MyService
            {
                public Task DoWork() => Task.CompletedTask;
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    // --- Scanner ---------------------------------------------------------------------------------

    [Fact]
    public void Scanner_SkipsBuildOutput()
    {
        _app.Write("logic/Real.cs", "public class Real : IProcessTaskEnd {}");
        _app.Write("obj/Debug/Generated.cs", "public class Generated : IProcessTaskEnd {}");

        var files = Scanner().Files;

        Assert.Contains(files, f => f.RelativePath.EndsWith("Real.cs", StringComparison.Ordinal));
        Assert.DoesNotContain(files, f => f.RelativePath.Contains("obj"));
    }
}
