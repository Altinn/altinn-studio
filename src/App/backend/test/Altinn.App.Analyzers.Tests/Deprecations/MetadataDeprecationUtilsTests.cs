using Altinn.App.Analyzers.Deprecations;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Deprecations;

public class MetadataDeprecationUtilsTests
{
    private const string Path = "/repo/App/config/applicationmetadata.json";

    private static List<Diagnostic> Collect(string json)
    {
        var diagnostics = new List<Diagnostic>();
        MetadataDeprecationUtils.CollectDeprecationDiagnostics(
            new InMemoryAdditionalText(Path, json),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    [Fact]
    public async Task EnablePdfCreation_True_Emits_Error()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                { "id": "model", "enablePdfCreation": true }
              ]
            }
            """
        );

        Assert.Contains(diagnostics, d => d.Id == Diagnostics.Deprecations.EnablePdfCreation.Id);
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Error, d.Severity));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task EnablePdfCreation_False_Or_Absent_Emits_Nothing()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                { "id": "withFalse", "enablePdfCreation": false },
                { "id": "withoutProp" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task EnablePdfCreation_Multiple_DataTypes_Emits_One_Per_DataType()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                { "id": "first", "enablePdfCreation": true },
                { "id": "second", "enablePdfCreation": false },
                { "id": "third", "enablePdfCreation": true }
              ]
            }
            """
        );

        Assert.Equal(2, diagnostics.Count(d => d.Id == Diagnostics.Deprecations.EnablePdfCreation.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task EFormidling_Block_Emits_Error()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "eFormidling": {
                "serviceId": "DPF",
                "receiver": "910075918",
                "sendAfterTaskId": "Task_1"
              },
              "dataTypes": []
            }
            """
        );

        Assert.Contains(diagnostics, d => d.Id == Diagnostics.Deprecations.LegacyEFormidling.Id);
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Error, d.Severity));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task EFormidling_Null_Or_Absent_Emits_Nothing()
    {
        var withNull = Collect(
            """
            { "id": "ttd/app", "eFormidling": null, "dataTypes": [] }
            """
        );
        var absent = Collect(
            """
            { "id": "ttd/app", "dataTypes": [] }
            """
        );

        Assert.Empty(withNull);
        Assert.Empty(absent);
    }

    [Fact]
    public async Task Both_Deprecations_Emit_Together()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "eFormidling": { "receiver": "910075918" },
              "dataTypes": [
                { "id": "model", "enablePdfCreation": true }
              ]
            }
            """
        );

        Assert.Contains(diagnostics, d => d.Id == Diagnostics.Deprecations.EnablePdfCreation.Id);
        Assert.Contains(diagnostics, d => d.Id == Diagnostics.Deprecations.LegacyEFormidling.Id);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Malformed_Json_Does_Not_Throw_And_Emits_Nothing()
    {
        var diagnostics = Collect("{ this is not valid json ");

        Assert.Empty(diagnostics);
    }
}
