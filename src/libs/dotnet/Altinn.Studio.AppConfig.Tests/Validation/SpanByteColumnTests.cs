using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SpanByteColumnTests
{
    [Fact]
    public void BpmnTaskSpan_CountsBytes_NotChars()
    {
        // ø: two-bytes
        const string prefix = "    <!-- søknad -->";
        var bpmn = $$"""
            <definitions>
              <process>
            {{prefix}}<task id="Task_1"><extensionElements><taskExtension><taskType>data</taskType></taskExtension></extensionElements></task>
              </process>
            </definitions>
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/config/process/process.bpmn"] = bpmn,
            }
        );

        var task = Assert.Single(AppConfigEngine.Open(dir).Current.Tasks);
        Assert.Equal("Task_1", task.Id);
        Assert.Equal(3, task.Position.Line);
        Assert.Equal(Encoding.UTF8.GetByteCount(prefix) + 2, task.Position.Column);
    }

    [Fact]
    public void CSharpIdentifierSpan_CountsBytes_NotChars()
    {
        const string declPrefix = "/* søknad */ public class ";
        const string propPrefix = "    /* æøå */ public string ";
        var model = $$"""
            namespace App.Models;

            {{declPrefix}}Soknad
            {
            {{propPrefix}}Navn { get; set; } = "";
            }
            """;
        var dir = new InMemoryAppDirectory(
            new() { ["App/config/applicationmetadata.json"] = TestMeta.Json(), ["App/models/Soknad.cs"] = model }
        );

        var csharpModel = AppConfigEngine.Open(dir).Current.CSharpModel;
        Assert.True(csharpModel.ContainsKey("App.Models.Soknad"));
        var info = csharpModel["App.Models.Soknad"];

        var id = info.Span ?? throw new InvalidOperationException("identifier span missing");
        var expectedCol = Encoding.UTF8.GetByteCount(declPrefix) + 1;
        Assert.Equal((3, expectedCol), (id.Line, id.Column));
        Assert.Equal(expectedCol + "Soknad".Length, id.EndColumn);

        var prop = Assert.Single(info.Properties, p => p.Name == "Navn");
        var propSpan = prop.Span ?? throw new InvalidOperationException("property span missing");
        var propStart = propPrefix.IndexOf("public", StringComparison.Ordinal);
        Assert.Equal(Encoding.UTF8.GetByteCount(propPrefix.AsSpan(0, propStart)) + 1, propSpan.Column);
    }
}
