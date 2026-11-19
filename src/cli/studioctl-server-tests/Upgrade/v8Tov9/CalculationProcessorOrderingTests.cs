using System.Reflection;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.DependencyInjection;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CalculationProcessorOrderingTests
{
    [Theory]
    [InlineData("AddTransient<IDataProcessor, Existing>")]
    [InlineData("AddScoped<IDataProcessor, Existing>")]
    [InlineData("AddSingleton<Altinn.App.Core.Features.IDataProcessor, Existing>")]
    [InlineData("AddTransient<IDataProcessor>", "_ => new Existing()")]
    [InlineData("AddTransient<IDataWriteProcessor, Existing>")]
    [InlineData("AddTransient", "typeof(IDataProcessor), typeof(Existing)")]
    [InlineData("AddAppProcessors")]
    public void MigratedCalculations_RunBeforeExistingProcessors(string registration, string arguments = "")
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        var original = AppSource(
            $$"""
            services.AddTransient<IUnrelated, Unrelated>();
            // Keep the application's processors in their original order.
            services.{{registration}}({{arguments}});
            services.AddTransient<IDataProcessor, Second>();
            """
        );
        var before = RegisteredProcessors(original);
        app.Write("Program.cs", original);
        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var first = app.Read("Program.cs");
        var after = RegisteredProcessors(first);
        Assert.Equal(["FormDataProcessor", .. before.Updates], after.Updates);
        Assert.Equal(["FormDataProcessor", .. before.Writes], after.Writes);
        Assert.Contains("// Keep the application's processors in their original order.", first);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(first, app.Read("Program.cs"));
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void ConditionalRegistrations_ArePreserved(bool throughHelper, bool returnEarly)
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        app.Write(
            "Program.cs",
            AppSource(
                $$"""
                {{(
                    throughHelper
                        ? "services.AddAppProcessors();"
                        : "services.TryAddTransient<IDataProcessor, Existing>(); services.TryAddTransient<IDataWriteProcessor, Existing>();"
                )}}
                if ({{returnEarly.ToString().ToLowerInvariant()}}) return;
                services.AddTransient<IDataProcessor, Second>();
                """
            )
        );
        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var first = app.Read("Program.cs");
        var actual = RegisteredProcessors(first);
        Assert.Equal(
            returnEarly ? ["FormDataProcessor", "Existing"] : ["FormDataProcessor", "Existing", "Second"],
            actual.Updates
        );
        Assert.Equal(["FormDataProcessor", "Existing"], actual.Writes);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(first, app.Read("Program.cs"));
    }

    [Theory]
    [InlineData("MyApp.FormDataProcessor")]
    [InlineData("global::MyApp.FormDataProcessor")]
    public void QualifiedAppProcessor_WithGeneratedShortName_IsPreserved(string appProcessor)
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        app.Write(
            "Program.cs",
            $$"""
            void RegisterCustomAppServices(IServiceCollection services) {
                services.AddTransient<IDataProcessor, {{appProcessor}}>();
            }
            """
        );

        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var source = app.Read("Program.cs");
        Assert.Contains($"services.AddTransient<IDataProcessor, {appProcessor}>();", source);
        Assert.Contains("ServiceDescriptor.Transient<IDataProcessor, FormDataProcessor>()", source);
        Assert.Contains("ServiceDescriptor.Transient<IDataWriteProcessor, FormDataProcessor>()", source);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(source, app.Read("Program.cs"));
    }

    [Fact]
    public void MultipleGeneratedProcessors_AreRegisteredOnceAcrossRepeatedUpgrades()
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        app.Write("Program.cs", AppSource("services.AddAppProcessors();"));
        var updater = new ProgramCsUpdater(app.Root);
        foreach (
            var name in new[] { "FormDataProcessor", "OtherDataProcessor", "FormDataProcessor", "OtherDataProcessor" }
        )
            Assert.True(updater.RegisterDataProcessor(name));
        var actual = RegisteredProcessors(app.Read("Program.cs"));
        Assert.Equal(["OtherDataProcessor", "FormDataProcessor", "Existing"], actual.Updates);
        Assert.Equal(["OtherDataProcessor", "FormDataProcessor", "Existing"], actual.Writes);
        var before = app.Read("Program.cs");
        Assert.True(updater.RegisterDataProcessor("OtherDataProcessor"));
        Assert.Equal(before, app.Read("Program.cs"));
    }

    [Theory]
    [InlineData("IDataWriteProcessor", "FormDataProcessor")]
    [InlineData("IDataProcessor", "FormDataProcessor")]
    [InlineData("IDataWriteProcessor", "Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor")]
    [InlineData("IDataProcessor", "Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor")]
    [InlineData("IDataWriteProcessor", "global::Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor")]
    [InlineData("IDataProcessor", "global::Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor")]
    public void ExistingGeneratedRegistration_IsMovedAndReplacedWithoutRunningTwice(
        string oldInterface,
        string oldClass
    )
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        app.Write(
            "Program.cs",
            $$"""
            class Program {
                static void RegisterCustomAppServices(IServiceCollection services) {
                    services.AddTransient<IDataProcessor, Existing>();
                    services.AddTransient<{{oldInterface}}, {{oldClass}}>();
                }
            }
            """
        );
        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var source = app.Read("Program.cs");
        Assert.Equal(1, source.Split("IDataWriteProcessor, FormDataProcessor").Length - 1);
        Assert.Equal(1, source.Split("IDataProcessor, FormDataProcessor").Length - 1);
        Assert.Equal(1, source.Split("services.AddTransient<").Length - 1);
        Assert.True(
            source.IndexOf("IDataProcessor, FormDataProcessor", StringComparison.Ordinal)
                > source.IndexOf("IDataProcessor, Existing", StringComparison.Ordinal)
        );
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(source, app.Read("Program.cs"));
    }

    private static (string[] Updates, string[] Writes) RegisteredProcessors(string source)
    {
        var references = Assert
            .IsType<string>(AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES"))
            .Split(Path.PathSeparator)
            .Select(path => MetadataReference.CreateFromFile(path));
        var compilation = CSharpCompilation.Create(
            "Ordering_" + Guid.NewGuid().ToString("N"),
            [CSharpSyntaxTree.ParseText(source)],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
        using var stream = new MemoryStream();
        var emitted = compilation.Emit(stream);
        Assert.True(emitted.Success, string.Join("\n", emitted.Diagnostics));
        var assembly = Assembly.Load(stream.ToArray());
        var entry = assembly.GetType("Entry")?.GetMethod("Create") ?? throw new InvalidOperationException();
        var services = Assert.IsAssignableFrom<IServiceCollection>(entry.Invoke(null, null));
        using var provider = services.BuildServiceProvider();
        string[] Names(string type) =>
            provider
                .GetServices(
                    assembly.GetType("Altinn.App.Core.Features." + type) ?? throw new InvalidOperationException()
                )
                .Select(processor => processor?.GetType().Name ?? throw new InvalidOperationException())
                .ToArray();
        return (Names("IDataProcessor"), Names("IDataWriteProcessor"));
    }

    private static string AppSource(string registrations) =>
        $$"""
            using Microsoft.Extensions.DependencyInjection;
            using Microsoft.Extensions.DependencyInjection.Extensions;
            using Altinn.App.Core.Features;
            public static class Entry {
                public static IServiceCollection Create() {
                    IServiceCollection services = new ServiceCollection();
                    RegisterCustomAppServices(services);
                    return services;
                }
                static void RegisterCustomAppServices(IServiceCollection services) {
                    {{registrations}}
                }
            }
            public static class Helpers {
                public static void AddAppProcessors(this IServiceCollection services) {
                    services.TryAddTransient<IDataProcessor, Existing>();
                    services.TryAddTransient<IDataWriteProcessor, Existing>();
                }
            }
            namespace Altinn.App.Core.Features {
                public interface IDataProcessor { }
                public interface IDataWriteProcessor { }
            }
            namespace Altinn.App.Logic.ConvertedLegacyRules {
                public class FormDataProcessor : IDataProcessor, IDataWriteProcessor { }
                public class OtherDataProcessor : IDataProcessor, IDataWriteProcessor { }
            }
            public interface IUnrelated { }
            public class Unrelated : IUnrelated { }
            public class Existing : IDataProcessor, IDataWriteProcessor { }
            public class Second : IDataProcessor { }
            """;
}
