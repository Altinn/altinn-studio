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
    [InlineData("IDataWriteProcessor")]
    [InlineData("IDataProcessor")]
    public void ExistingGeneratedRegistration_IsMovedAndReplacedWithoutRunningTwice(string oldInterface)
    {
        using var output = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        using var app = new TempAppFolder();
        app.Write(
            "Program.cs",
            $$"""
            class Program {
                static void RegisterCustomAppServices(IServiceCollection services) {
                    services.AddTransient<IDataProcessor, Existing>();
                    services.AddTransient<{{oldInterface}}, FormDataProcessor>();
                }
            }
            """
        );
        var updater = new ProgramCsUpdater(app.Root);
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        var source = app.Read("Program.cs");
        Assert.DoesNotContain("IDataWriteProcessor, FormDataProcessor", source);
        Assert.Equal(1, source.Split("IDataProcessor, FormDataProcessor").Length - 1);
        Assert.True(
            source.IndexOf("IDataProcessor, FormDataProcessor", StringComparison.Ordinal)
                < source.IndexOf("IDataProcessor, Existing", StringComparison.Ordinal)
        );
        Assert.True(updater.RegisterDataProcessor("FormDataProcessor"));
        Assert.Equal(source, app.Read("Program.cs"));
    }
}
