using System.Collections.Immutable;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests;

public class InstancePropertyNotSavedAnalyzerTests
{
    private const string Usings = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features;
        using Altinn.App.Core.Models;
        using Altinn.Platform.Storage.Interface.Models;

        """;

    [Theory]
    [InlineData("instance.DueBefore = DateTime.Now", "Instance.DueBefore")]
    [InlineData("instance.Data = new List<DataElement>()", "Instance.Data")]
    [InlineData("instance.LastChanged = DateTime.Now", "Instance.LastChanged")]
    [InlineData("dataElement.Locked = true", "DataElement.Locked")]
    [InlineData("dataElement.IsRead = true", "DataElement.IsRead")]
    [InlineData("dataElement.ContentType += \"; charset=utf-8\"", "DataElement.ContentType")]
    [InlineData("dataElement.FileScanResult = default", "DataElement.FileScanResult")]
    [InlineData("instance.AppId ??= \"ttd/app\"", "Instance.AppId")]
    [InlineData("dataElement.Size++", "DataElement.Size")]
    [InlineData("instance.Data[0].Locked = true", "DataElement.Locked")]
    [InlineData("instance.Process.CurrentTask = null", "ProcessState.CurrentTask")]
    [InlineData("instance.Status.IsArchived = true", "InstanceStatus.IsArchived")]
    [InlineData("instance.Status.Substatus.Label = \"x\"", "Substatus.Label")]
    [InlineData("instance.InstanceOwner.PartyId = \"1\"", "InstanceOwner.PartyId")]
    [InlineData("instance.Data[0] = dataElement", "Instance.Data")]
    [InlineData("instance.Data.Add(dataElement)", "Instance.Data")]
    [InlineData("instance.Data.RemoveAll(d => d.Id == dataElement.Id)", "Instance.Data")]
    [InlineData("instance.CompleteConfirmations.Clear()", "Instance.CompleteConfirmations")]
    [InlineData("instance.Data?.Remove(dataElement)", "Instance.Data")]
    [InlineData("instance?.Data.Add(dataElement)", "Instance.Data")]
    [InlineData("instance?.Data?.Add(dataElement)", "Instance.Data")]
    [InlineData("instance.CompleteConfirmations?.Clear()", "Instance.CompleteConfirmations")]
    public async Task Reports_A_Change_To_A_Property_The_Save_Does_Not_Send(string change, string property)
    {
        var diagnostics = await Analyze(Method(change));

        Diagnostic diagnostic = Assert.Single(diagnostics);
        Assert.Equal("ALTINNAPP0503", diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Warning, diagnostic.Severity);
        Assert.StartsWith(
            $"'{property}' is not saved by the instance data mutator: ",
            diagnostic.GetMessage(),
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData("instance.DataValues = new()")]
    [InlineData("instance.DataValues ??= new()")]
    [InlineData("instance.DataValues[\"key\"] = \"value\"")]
    [InlineData("instance.PresentationTexts = new()")]
    [InlineData("dataElement.Tags = [\"tag\"]")]
    [InlineData("dataElement.Metadata = []")]
    [InlineData("dataElement.UserDefinedMetadata = []")]
    [InlineData("dataElement.Refs = []")]
    [InlineData("dataElement.Filename = \"x\"")]
    [InlineData("dataElement.Filename += \".pdf\"")]
    [InlineData("dataElement.Tags.Add(\"tag\")")]
    [InlineData("instance.DataValues.Remove(\"key\")")]
    [InlineData("dataElement.Metadata[0].Value = \"x\"")]
    [InlineData("dataElement.Metadata.Add(new KeyValueEntry())")]
    [InlineData("instance.Data.Find(d => d.Id == dataElement.Id)")]
    [InlineData("new List<DataElement>(instance.Data).Add(dataElement)")]
    [InlineData("instance.DataValues?.Remove(\"key\")")]
    [InlineData("dataElement?.Tags?.Add(\"tag\")")]
    [InlineData("instance.Data?.Find(d => d.Id == dataElement.Id)")]
    public async Task Does_Not_Report_A_Property_The_Save_Sends_Or_A_Read(string assignment)
    {
        var diagnostics = await Analyze(Method(assignment));

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Does_Not_Report_Object_Initializers_Or_Reads()
    {
        var diagnostics = await Analyze(
            """
            public static class Code
            {
                public static object Run(Instance instance, DataElement dataElement)
                {
                    var created = new Instance { DueBefore = DateTime.Now, Data = [new DataElement { Locked = true }] };
                    var nested = new Instance { Status = new InstanceStatus { IsArchived = true }, Data = { dataElement } };
                    DataElement copy = new() { IsRead = dataElement.IsRead, ContentType = dataElement.ContentType };
                    DateTime? dueBefore = instance.DueBefore;
                    return (created, nested, copy, dueBefore, instance.Data.Count);
                }
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Reports_Each_Unsaved_Target_Of_A_Deconstruction()
    {
        var diagnostics = await Analyze(
            Method("(instance.DueBefore, dataElement.Filename, dataElement.IsRead) = (null, \"x\", true)")
        );

        Assert.Equal(
            ["'Instance.DueBefore'", "'DataElement.IsRead'"],
            diagnostics.Select(d => d.GetMessage().Split(' ')[0])
        );
    }

    [Fact]
    public async Task Reports_A_Derived_Type_And_An_Implicit_This()
    {
        var diagnostics = await Analyze(
            """
            public sealed class MyInstance : Instance
            {
                public string? Extra { get; set; }

                public void Run() => DueBefore = DateTime.Now;
            }

            public static class Code
            {
                public static void Run(MyInstance instance)
                {
                    instance.Org = "ttd";
                    instance.Extra = "not a Storage property";
                }
            }
            """
        );

        Assert.Equal(
            ["'Instance.DueBefore'", "'Instance.Org'"],
            diagnostics.OrderBy(d => d.Location.SourceSpan.Start).Select(d => d.GetMessage().Split(' ')[0])
        );
    }

    [Fact]
    public async Task Reports_In_An_App_Interface_That_Gets_The_Mutators_Instance()
    {
        var diagnostics = await Analyze(
            """
            public sealed class Processor : IInstantiationProcessor
            {
                public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    instance.DueBefore = DateTime.Now.AddDays(7);
                    return Task.CompletedTask;
                }
            }
            """
        );

        Diagnostic diagnostic = Assert.Single(diagnostics);
        Assert.Equal("ALTINNAPP0503", diagnostic.Id);
        Assert.Equal(
            "instance.DueBefore",
            diagnostic.Location.SourceTree?.GetText().ToString(diagnostic.Location.SourceSpan)
        );
    }

    [Fact]
    public async Task Message_Lists_Every_Property_The_Save_Sends()
    {
        // The list Altinn.App.Core saves by, which the analyzer has its own copy of.
        var saveProperties = typeof(IInstantiationProcessor).Assembly.GetType(
            "Altinn.App.Core.Internal.Data.InstanceSaveProperties",
            throwOnError: true
        )!;
        string[] instance = (string[])saveProperties.GetField("Instance")!.GetValue(null)!;
        string[] dataElement = (string[])saveProperties.GetField("DataElement")!.GetValue(null)!;
        Assert.NotEmpty(instance);
        Assert.NotEmpty(dataElement);

        var diagnostics = await Analyze(Method("instance.DueBefore = null"));

        Diagnostic diagnostic = Assert.Single(diagnostics);
        string expected = string.Join(
            ", ",
            instance.Select(name => $"Instance.{name}").Concat(dataElement.Select(name => $"DataElement.{name}"))
        );
        Assert.EndsWith($"Only these are saved: {expected}.", diagnostic.GetMessage(), StringComparison.Ordinal);
    }

    private static string Method(string assignment) =>
        $$"""
            public static class Code
            {
                public static void Run(Instance instance, DataElement dataElement)
                {
                    {{assignment}};
                }
            }
            """;

    private static async Task<ImmutableArray<Diagnostic>> Analyze(string source)
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Append(typeof(IInstantiationProcessor).Assembly)
            .Append(typeof(Instance).Assembly)
            .Distinct()
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(Usings + source, path: "/repo/App/Code.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        return await compilation
            .WithAnalyzers([new InstancePropertyNotSavedAnalyzer()])
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);
    }
}
