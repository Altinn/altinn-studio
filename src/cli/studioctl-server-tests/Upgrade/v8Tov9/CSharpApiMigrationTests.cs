using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CSharpApiMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

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
