using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

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
        app.Write(
            "Program.cs",
            $$"""
            void RegisterCustomAppServices(IServiceCollection services) {
                services.AddTransient<IUnrelated, Unrelated>();
                // Keep the application's processors in their original order.
                services.{{registration}}({{arguments}});
                services.AddTransient<IDataProcessor, Second>();
            }
            """
        );
        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var first = app.Read("Program.cs");
        var originalRegistration = $"services.{registration}({arguments});";
        Assert.Contains(originalRegistration, first);
        Assert.Contains("IDataProcessor, FormDataProcessor", first);
        Assert.True(
            first.IndexOf("IDataProcessor, FormDataProcessor", StringComparison.Ordinal)
                < first.IndexOf(originalRegistration, StringComparison.Ordinal)
        );
        Assert.True(
            first.IndexOf(originalRegistration, StringComparison.Ordinal)
                < first.IndexOf("IDataProcessor, Second", StringComparison.Ordinal)
        );
        Assert.Contains("// Keep the application's processors in their original order.", first);
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
        Assert.Contains("services.AddTransient<IDataProcessor, FormDataProcessor>();", source);
        Assert.Contains("services.AddTransient<IDataWriteProcessor, FormDataProcessor>();", source);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(source, app.Read("Program.cs"));
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
        Assert.Equal(3, source.Split("services.AddTransient<").Length - 1);
        Assert.True(
            source.IndexOf("IDataProcessor, FormDataProcessor", StringComparison.Ordinal)
                < source.IndexOf("IDataProcessor, Existing", StringComparison.Ordinal)
        );
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(source, app.Read("Program.cs"));
    }
}
