using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

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

    // --- RemovedEventsReceiveStackDetector -------------------------------------------------------

    [Fact]
    public void EventsReceiveStackDetector_FlagsHandlerImplementationsAndDiRegistrations()
    {
        _app.Write(
            "logic/MyEventHandler.cs",
            """
            using Altinn.App.Core.Features;
            public class MyEventHandler : IEventHandler
            {
                public string EventType => "app.my-org.something-happened";
                public Task<bool> ProcessEvent(CloudEvent cloudEvent) => Task.FromResult(true);
            }
            """
        );
        _app.Write(
            "Program.cs",
            """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddTransient<IEventHandler, MyEventHandler>();
            builder.Services.AddHttpClient<IEventsSubscription, EventsSubscriptionClient>();
            builder.Services.AddSingleton<IEventSecretCodeProvider, MySecretCodeProvider>();
            """
        );

        var result = new RemovedEventsReceiveStackDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("MyEventHandler.cs") && w.Contains("MyEventHandler : IEventHandler")
        );
        Assert.Contains(result.Warnings, w => w.Contains("Program.cs") && w.Contains("IEventsSubscription"));
        Assert.Contains(result.Warnings, w => w.Contains("Program.cs") && w.Contains("IEventSecretCodeProvider"));
    }

    [Fact]
    public void EventsReceiveStackDetector_DoesNotFlagEventPublishing()
    {
        _app.Write(
            "logic/MyPublisher.cs",
            """
            using Altinn.App.Core.Internal.Events;
            public class MyPublisher
            {
                private readonly IEventsClient _eventsClient;
                public MyPublisher(IEventsClient eventsClient) => _eventsClient = eventsClient;
                public Task Publish() => _eventsClient.AddEvent("app.my-org.something-happened", new Instance());
            }
            """
        );

        var result = new RemovedEventsReceiveStackDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void EventsReceiveStackDetector_CleanApp_ReportsNothing()
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

        var result = new RemovedEventsReceiveStackDetector(Scanner()).Detect();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
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

    // --- CorrespondenceApiMigration --------------------------------------------------------------

    private IReadOnlyList<string> _lastMigrationWarnings = [];

    private string MigrateCorrespondence(string relativePath, string source)
    {
        var path = _app.Write(relativePath, source);
        var result = new CorrespondenceApiMigration(Scanner()).Migrate();
        _lastMigrationWarnings = result.Warnings;

        var migrated = File.ReadAllText(path).ReplaceLineEndings("\n");

        // A rewriter that emits code the parser rejects would hand the developer an app that no longer
        // builds, which is worse than the warning it replaced. Asserted for every case, not per-test.
        var syntaxErrors = CSharpSyntaxTree
            .ParseText(migrated)
            .GetDiagnostics()
            .Where(d => d.Severity == DiagnosticSeverity.Error)
            .Select(d => d.ToString())
            .ToList();
        Assert.Empty(syntaxErrors);

        return migrated;
    }

    [Fact]
    public void CorrespondenceMigration_RemovesNoOpCallsFromFluentChain()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public CorrespondenceRequest Build() =>
                    CorrespondenceRequestBuilder
                        .Create()
                        .WithResourceId("resource")
                        .WithSender(_org)
                        .WithSendersReference("ref")
                        .WithAllowSystemDeleteAfter(_deleteAfter)
                        .Build();
            }
            """
        );

        Assert.DoesNotContain("WithSender(", migrated);
        Assert.DoesNotContain("WithAllowSystemDeleteAfter", migrated);
        // Surviving chain and its formatting must be intact.
        Assert.Contains(
            "            .WithResourceId(\"resource\")\n            .WithSendersReference(\"ref\")\n",
            migrated
        );
        Assert.Contains(".Build();", migrated);
        Assert.Equal(3, _lastMigrationWarnings.Count); // summary + two rewrites
    }

    [Fact]
    public void CorrespondenceMigration_RemovesNoOpStatementEntirely()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public void Configure()
                {
                    builder.WithSender(_org);
                    builder.WithSendersReference("ref");
                }
            }
            """
        );

        Assert.DoesNotContain("WithSender(", migrated);
        Assert.Contains("builder.WithSendersReference(\"ref\");", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_UnlinksNoOpButKeepsRestOfStatementChain()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public void Configure()
                {
                    builder.WithSender(_org).WithSendersReference("ref");
                }
            }
            """
        );

        Assert.Contains("builder.WithSendersReference(\"ref\");", migrated);
        Assert.DoesNotContain("WithSender(", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_KeepsSurvivingCallsWhenTheNoOpEndsTheStatement()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public void Configure()
                {
                    builder.WithResourceId("resource").WithSender(_org);
                }
            }
            """
        );

        // Deleting the whole statement here would take WithResourceId with it.
        Assert.Contains("builder.WithResourceId(\"resource\");", migrated);
        Assert.DoesNotContain("WithSender(", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_DoesNotRewriteWithDataWhenTheNameIsAmbiguousAcrossFiles()
    {
        // `payload` is a byte array in one file and a Stream in the other. Letting the first match win
        // would emit `new MemoryStream(stream)`, which does not compile - and the syntax check cannot
        // catch it, because the result still parses.
        _app.Write(
            "logic/A.cs",
            """
            public class A
            {
                public void Send(byte[] payload) => Builder.Create().WithData(payload);
            }
            """
        );
        var pathB = _app.Write(
            "logic/B.cs",
            """
            public class B
            {
                public void Send(Stream payload) => Builder.Create().WithData(payload);
            }
            """
        );

        var result = new CorrespondenceApiMigration(Scanner()).Migrate();

        // Each is resolved from its own scope, so both are handled correctly rather than conflated.
        Assert.Contains("WithData(payload)", File.ReadAllText(pathB));
        Assert.DoesNotContain("new MemoryStream(payload)", File.ReadAllText(pathB));
        Assert.Contains("new MemoryStream(payload)", File.ReadAllText(Path.Combine(_app.Root, "App", "logic", "A.cs")));
        Assert.False(result.ManualActionRequired);
    }

    [Fact]
    public void CorrespondenceMigration_ReportsWithDataWhenAnOutOfScopeNameIsAmbiguous()
    {
        // Nothing in the calling scope declares `Innhold`, and the app-wide fallback finds it declared
        // as both a byte array and a Stream. Picking either would risk emitting code that does not
        // compile, so it is reported instead.
        _app.Write("models/A.cs", "public record VedleggA(byte[] Innhold);");
        _app.Write("models/B.cs", "public record VedleggB(Stream Innhold);");
        var path = _app.Write(
            "logic/Send.cs",
            """
            public class Send
            {
                public void Attach(dynamic vedlegg) => Builder.Create().WithData(vedlegg.Innhold);
            }
            """
        );

        var result = new CorrespondenceApiMigration(Scanner()).Migrate();

        Assert.Contains("WithData(vedlegg.Innhold)", File.ReadAllText(path));
        Assert.DoesNotContain("new MemoryStream(", File.ReadAllText(path));
        Assert.True(result.ManualActionRequired);
        Assert.Contains(result.Warnings, w => w.Contains("could not be classified"));
    }

    [Fact]
    public void CorrespondenceMigration_WarnsAboutDiscardedArgumentContainingACall()
    {
        MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public void Configure()
                {
                    builder.WithSender(ComputeSender()).WithSendersReference("ref");
                }
            }
            """
        );

        Assert.Contains(_lastMigrationWarnings, w => w.Contains("no longer evaluated"));
    }

    [Fact]
    public void CorrespondenceMigration_LeavesShapesItCannotRewriteForTheDetector()
    {
        var source = """
            public class Send
            {
                public void Arrow() => builder.WithSender(_org);

                public void NullConditional() => builder?.WithRequestedSendTime(_time);
            }
            """;
        var migrated = MigrateCorrespondence("logic/Send.cs", source);

        // Unchanged: `=> builder;` would not compile, and `?.` binds via a member binding.
        Assert.Equal(source.ReplaceLineEndings("\n"), migrated);
        Assert.Empty(_lastMigrationWarnings);

        // The detector is the fallback for exactly these.
        var detected = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();
        Assert.True(detected.ManualActionRequired);
        Assert.Contains(Locations(detected), w => w.Contains("WithSender"));
        Assert.Contains(Locations(detected), w => w.Contains("WithRequestedSendTime"));
    }

    [Fact]
    public void CorrespondenceMigration_RemovesNoOpInitializersAndRenamesRecipient()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public CorrespondenceRequest Request() =>
                    new CorrespondenceRequest
                    {
                        Sender = _org,
                        SendersReference = "ref",
                        AllowSystemDeleteAfter = _deleteAfter,
                    };

                public CorrespondenceNotification Notification() =>
                    new CorrespondenceNotification { CustomRecipient = _recipient, RequestedSendTime = _time };
            }
            """
        );

        Assert.DoesNotContain("Sender = _org", migrated);
        Assert.DoesNotContain("AllowSystemDeleteAfter", migrated);
        Assert.DoesNotContain("RequestedSendTime", migrated);
        Assert.Contains("SendersReference = \"ref\"", migrated);
        Assert.Contains("CustomRecipients = [_recipient]", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_DoesNotTouchSameNamedPropertiesOnOtherTypes()
    {
        var source = """
            public class Read
            {
                public object Response() =>
                    new GetCorrespondenceStatusResponse { Sender = _org, AllowSystemDeleteAfter = _x };

                public object Unrelated() => new MyOwnModel { Sender = _org, RequestedSendTime = _t };
            }
            """;
        var migrated = MigrateCorrespondence("logic/Read.cs", source);

        Assert.Equal(source.ReplaceLineEndings("\n"), migrated);
        Assert.Empty(_lastMigrationWarnings);
    }

    [Fact]
    public void CorrespondenceMigration_ReplacesLegacyPayloadConstructors()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            public class Send
            {
                public SendCorrespondencePayload Enum(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthorisation.Maskinporten);

                public GetCorrespondenceStatusPayload Factory(Guid id) =>
                    new GetCorrespondenceStatusPayload(id, () => _client.GetAltinnExchangedToken(_scopes));
            }
            """
        );

        Assert.Contains(
            "new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default())",
            migrated
        );
        Assert.Contains(
            "CorrespondenceAuthenticationMethod.Custom(() => _client.GetAltinnExchangedToken(_scopes))",
            migrated
        );
        Assert.DoesNotContain("CorrespondenceAuthorisation", migrated);
        // The replacement type lives in a namespace the file may not have imported.
        Assert.Contains("using Altinn.App.Core.Features;", migrated);
        // The scope widening must be surfaced, not applied silently.
        Assert.Contains(_lastMigrationWarnings, w => w.Contains("instances.read"));
    }

    [Fact]
    public void CorrespondenceMigration_DoesNotDuplicateAnExistingUsing()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            using Altinn.App.Core.Features;

            public class Send
            {
                public SendCorrespondencePayload Enum(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthorisation.Maskinporten);
            }
            """
        );

        Assert.Equal(1, migrated.Split("using Altinn.App.Core.Features;").Length - 1);
    }

    [Fact]
    public void CorrespondenceMigration_LeavesMigratedPayloadConstructionAlone()
    {
        var source = """
            public class Send
            {
                public SendCorrespondencePayload Default(CorrespondenceRequest request) =>
                    new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default());
            }
            """;
        var migrated = MigrateCorrespondence("logic/Send.cs", source);

        Assert.Equal(source.ReplaceLineEndings("\n"), migrated);
        Assert.Empty(_lastMigrationWarnings);
    }

    [Fact]
    public void CorrespondenceMigration_RenamesRemovedBuilderStepInterface()
    {
        var migrated = MigrateCorrespondence(
            "logic/Steps.cs",
            """
            public class Steps
            {
                private ICorrespondenceRequestBuilderSender? _step;

                public ICorrespondenceRequestBuilderSender Start() =>
                    CorrespondenceRequestBuilder.Create().WithResourceId("resource");
            }
            """
        );

        Assert.Contains("ICorrespondenceRequestBuilderSendersReference? _step", migrated);
        Assert.Contains("ICorrespondenceRequestBuilderSendersReference Start()", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_PreservesSurroundingFormatting()
    {
        var migrated = MigrateCorrespondence(
            "logic/Send.cs",
            """
            using Microsoft.Extensions.Logging;

            public class Send
            {
                public CorrespondenceNotification Notification() =>
                    new CorrespondenceNotification
                    {
                        NotificationTemplate = _template,
                        EmailSubject = "subject",
                        RequestedSendTime = _time,
                        CustomRecipient = _recipient,
                        SmsBody = "sms",
                    };

                public GetCorrespondenceStatusPayload Status(Guid id) =>
                    new GetCorrespondenceStatusPayload(
                        id,
                        () => _client.GetAltinnExchangedToken(_scopes)
                    );
            }
            """
        );

        // A rewrite that reflows the surrounding code produces an unreviewable diff and fails a
        // formatter gate, so the entries that survive must keep their own lines and indentation.
        Assert.Contains(
            """
                    {
                        NotificationTemplate = _template,
                        EmailSubject = "subject",
                        CustomRecipients = [_recipient],
                        SmsBody = "sms",
                    };
            """.ReplaceLineEndings("\n"),
            migrated
        );

        // The inserted call must sit where the expression it replaced sat, not at column 0.
        Assert.Contains(
            "            CorrespondenceAuthenticationMethod.Custom(() => _client.GetAltinnExchangedToken(_scopes))\n",
            migrated
        );

        // And the added using goes in sorted position, not appended after unrelated ones.
        Assert.StartsWith("using Altinn.App.Core.Features;\nusing Microsoft.Extensions.Logging;", migrated);
    }

    [Fact]
    public void CorrespondenceMigration_WrapsProvableByteDataAndLeavesStreamsAlone()
    {
        var migrated = MigrateCorrespondence(
            "logic/Attach.cs",
            """
            public record Vedlegg(string Navn, ReadOnlyMemory<byte> Innhold);

            public class Attach
            {
                public void Provable(Vedlegg vedlegg, byte[] raw)
                {
                    Builder.Create().WithData(raw);
                    Builder.Create().WithData(vedlegg.Innhold);
                    Builder.Create().WithData(Encoding.UTF8.GetBytes(_text));
                    Builder.Create().WithData("literal"u8.ToArray());
                }

                public void AlreadyStreams(Stream open)
                {
                    Builder.Create().WithData(new MemoryStream(_bytes));
                    Builder.Create().WithData(open);
                }
            }
            """
        );

        // Provably bytes - wrapped.
        Assert.Contains("WithData(new MemoryStream(raw))", migrated);
        Assert.Contains("WithData(new MemoryStream(vedlegg.Innhold))", migrated);
        Assert.Contains("WithData(new MemoryStream(Encoding.UTF8.GetBytes(_text)))", migrated);
        Assert.Contains("WithData(new MemoryStream(\"literal\"u8.ToArray()))", migrated);

        // Provably a stream - untouched. Wrapping either of these would not compile.
        Assert.Contains("WithData(new MemoryStream(_bytes));", migrated);
        Assert.DoesNotContain("new MemoryStream(new MemoryStream", migrated);
        Assert.Contains("WithData(open);", migrated);

        Assert.DoesNotContain(_lastMigrationWarnings, w => w.Contains("could not be classified"));
    }

    [Fact]
    public void CorrespondenceMigration_FollowsVarToItsInitializerToClassifyByteData()
    {
        var migrated = MigrateCorrespondence(
            "logic/Attach.cs",
            """
            public class Attach
            {
                public async Task Send()
                {
                    var bytes = await _dataClient.GetDataBytes(_party, _instance, _element);
                    Builder.Create().WithData(bytes);
                }
            }
            """
        );

        // `var` writes out no type, but its initializer settles it - the common shape for a payload
        // fetched from a client, and the one real-world case that would otherwise need a hand edit.
        Assert.Contains("WithData(new MemoryStream(bytes))", migrated);
        Assert.DoesNotContain(_lastMigrationWarnings, w => w.Contains("could not be classified"));
    }

    [Fact]
    public void CorrespondenceMigration_ReportsWithDataItCannotClassify()
    {
        MigrateCorrespondence(
            "logic/Attach.cs",
            """
            public class Attach
            {
                public void Ambiguous()
                {
                    var payload = await _client.GetSomething();
                    Builder.Create().WithData(payload);
                }
            }
            """
        );

        // `var` with an unrecognisable initializer stays unknown, so guessing would risk wrapping a Stream.
        Assert.Contains(_lastMigrationWarnings, w => w.Contains("could not be classified"));
        Assert.Contains(_lastMigrationWarnings, w => w.Contains("Attach.cs:6") && w.Contains("WithData(payload)"));
    }

    [Fact]
    public void CorrespondenceMigration_CleanApp_ChangesNothing()
    {
        var source = """
            public class MyService
            {
                public Task DoWork() => Task.CompletedTask;
            }
            """;
        var migrated = MigrateCorrespondence("logic/MyService.cs", source);

        Assert.Equal(source.ReplaceLineEndings("\n"), migrated);
        Assert.Empty(_lastMigrationWarnings);
    }

    [Fact]
    public void CorrespondenceDetector_FlagsTokenFactoryHeldInAVariable()
    {
        // A `Func<Task<JwtToken>>` in a field cannot be typed without binding, so it is reported rather
        // than missed - staying silent here hid the whole authorisation break from an app that never
        // wrote the enum inline.
        _app.Write(
            "logic/Purring.cs",
            """
            public class Purring
            {
                private Func<Task<JwtToken>> Tokenkilde => () => _client.GetAltinnExchangedToken(_scopes);

                public GetCorrespondenceStatusPayload Status(Guid id) =>
                    new GetCorrespondenceStatusPayload(id, Tokenkilde);
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(Locations(result), w => w.Contains("Purring.cs:6") && w.Contains("Tokenkilde"));
        Assert.Contains(result.Warnings, w => w.Contains("held in a variable"));
    }

    [Fact]
    public void CorrespondenceDetector_FlagsTargetTypedNewViaTheDeclaredType()
    {
        // `T x = new() { .. }` is ordinary modern C#. The creation node carries no type, so without
        // resolving it from the declaration this is missed entirely - and the app then hits a bare
        // compiler error with no guidance.
        _app.Write(
            "logic/Varsel.cs",
            """
            public class Varsel
            {
                public CorrespondenceNotificationRecipient Mottaker(string fnr)
                {
                    CorrespondenceNotificationRecipient mottaker = new()
                    {
                        NationalIdentityNumber = fnr,
                        IsReserved = true,
                    };
                    return mottaker;
                }
            }
            """
        );

        var result = new LegacyCorrespondenceCodeDetector(Scanner()).Detect();

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Varsel.cs:8") && w.Contains("CorrespondenceNotificationRecipient.IsReserved")
        );
    }

    [Fact]
    public void CorrespondenceMigration_RewritesTargetTypedNewViaTheDeclaredType()
    {
        var migrated = MigrateCorrespondence(
            "logic/Varsel.cs",
            """
            public class Varsel
            {
                public CorrespondenceNotification Notification()
                {
                    CorrespondenceNotification varsel = new()
                    {
                        NotificationTemplate = _template,
                        RequestedSendTime = _time,
                        CustomRecipient = _recipient,
                    };
                    return varsel;
                }
            }
            """
        );

        Assert.DoesNotContain("RequestedSendTime", migrated);
        Assert.Contains("CustomRecipients = [_recipient]", migrated);
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
