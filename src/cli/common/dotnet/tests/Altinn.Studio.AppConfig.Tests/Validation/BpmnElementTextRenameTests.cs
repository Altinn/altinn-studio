using System.Text;
using System.Xml.Linq;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class BpmnElementTextRenameTests
{
    private const string ProcessFile = "App/config/process/process.bpmn";

    private const string Process = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="defs">
          <bpmn:process id="proc" isExecutable="false">
            <bpmn:task id="Task_1">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_sign">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>signing</altinn:taskType>
                  <altinn:signatureConfig>
                    <altinn:dataTypesToSign>
                      <altinn:dataType>
                        attachment
                      </altinn:dataType>
                    </altinn:dataTypesToSign>
                    <altinn:signatureDataType>sig</altinn:signatureDataType>
                  </altinn:signatureConfig>
                </altinn:taskExtension>
              </bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_pdf">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>pdf</altinn:taskType>
                <altinn:pdfConfig>
                  <altinn:filenameTextResourceKey>pdf.filename</altinn:filenameTextResourceKey>
                  <altinn:autoPdfTaskIds><altinn:taskId>Task_1</altinn:taskId></altinn:autoPdfTaskIds>
                </altinn:pdfConfig>
              </altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:sequenceFlow id="flow1" sourceRef="Task_1" targetRef="Task_sign" />
          </bpmn:process>
        </bpmn:definitions>
        """;

    private static Dictionary<string, string> AppFiles() =>
        new()
        {
            ["App/config/applicationmetadata.json"] =
                """{"id":"ttd/bpmn-rename","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"},{"id":"attachment","taskId":"Task_1"},{"id":"sig","taskId":"Task_sign"}]}""",
            ["App/config/texts/resource.nb.json"] =
                """{"language":"nb","resources":[{"id":"pdf.filename","value":"Kvittering"}]}""",
            [ProcessFile] = Process,
        };

    [Fact]
    public void Rename_DataType_RewritesOnlyTheSignatureDataTypeElementText()
    {
        var files = AppFiles();

        var edits = ProposeRename(files, new Symbol(SymbolKind.DataType, "sig"), "signatures");

        var bpmnEdit = Assert.Single(edits, e => e.Span.File == ProcessFile);
        Assert.Equal("sig", bpmnEdit.OldValue);
        Assert.Equal("signatures", bpmnEdit.NewValue);
        var renamed = ApplyEdits(files, edits);
        Assert.Contains(
            "<altinn:signatureDataType>signatures</altinn:signatureDataType>",
            renamed[ProcessFile],
            StringComparison.Ordinal
        );
        AssertNoFindings(renamed, "REF-DATATYPE-ID");
    }

    [Fact]
    public void Rename_DataType_InListItemWithSurroundingWhitespace_KeepsTheWhitespace()
    {
        var files = AppFiles();

        var edits = ProposeRename(files, new Symbol(SymbolKind.DataType, "attachment"), "attachments");

        var bpmnEdit = Assert.Single(edits, e => e.Span.File == ProcessFile);
        Assert.Equal("attachment", bpmnEdit.OldValue);
        Assert.Equal(bpmnEdit.Span.Line, bpmnEdit.Span.EndLine);
        var renamed = ApplyEdits(files, edits);
        Assert.Contains(
            "<altinn:dataType>\n                attachments\n              </altinn:dataType>",
            renamed[ProcessFile],
            StringComparison.Ordinal
        );
        AssertNoFindings(renamed, "REF-DATATYPE-ID");
    }

    [Fact]
    public void Rename_Task_RewritesAutoPdfTaskIdElementText()
    {
        var files = AppFiles();

        var edits = ProposeRename(files, Symbol.Task("Task_1"), "Task_One");

        var autoPdf = Assert.Single(edits, e => e.Span.File == ProcessFile && e.OldValue == "Task_1");
        Assert.Equal("Task_One", autoPdf.NewValue);
        var renamed = ApplyEdits(files, edits);
        var bpmn = renamed[ProcessFile];
        Assert.Contains("<altinn:taskId>Task_One</altinn:taskId>", bpmn, StringComparison.Ordinal);
        Assert.Contains("<bpmn:task id=\"Task_One\">", bpmn, StringComparison.Ordinal);
        Assert.Contains("sourceRef=\"Task_One\"", bpmn, StringComparison.Ordinal);
        AssertNoFindings(renamed, "REF-TASK-ID");
    }

    [Fact]
    public void Rename_TextKey_EscapesTheNewNameAsXmlText()
    {
        var files = AppFiles();

        var edits = ProposeRename(files, new Symbol(SymbolKind.TextKey, "pdf.filename"), "pdf&filename");

        var bpmnEdit = Assert.Single(edits, e => e.Span.File == ProcessFile);
        Assert.Equal("pdf.filename", bpmnEdit.OldValue);
        Assert.Equal("pdf&amp;filename", bpmnEdit.NewValue);
        var renamed = ApplyEdits(files, edits);
        var filename = XDocument
            .Parse(renamed[ProcessFile])
            .Descendants()
            .Single(e => e.Name.LocalName == "filenameTextResourceKey");
        Assert.Equal("pdf&filename", filename.Value);
        AssertNoFindings(renamed, "REF-TEXT-RESOURCE-KEY");
    }

    private static List<ReplaceEdit> ProposeRename(Dictionary<string, string> files, Symbol symbol, string newName)
    {
        var engine = AppConfigEngine.Open(new MutableAppDirectory(files));
        engine.Build();
        var edits = new AppSymbols(engine).ProposeRename(symbol, newName).OfType<ReplaceEdit>().ToList();
        Assert.NotEmpty(edits);
        return edits;
    }

    private static void AssertNoFindings(Dictionary<string, string> files, string ruleId)
    {
        var report = AppConfigEngine.Open(new MutableAppDirectory(files)).Validate();
        Assert.Empty(report.App.ParseErrors);
        Assert.DoesNotContain(report.Findings, f => f.RuleId == ruleId);
    }

    private static Dictionary<string, string> ApplyEdits(Dictionary<string, string> files, List<ReplaceEdit> edits)
    {
        var result = new Dictionary<string, string>(files, StringComparer.Ordinal);
        foreach (var fileEdits in edits.GroupBy(e => e.Span.File))
        {
            var bytes = Encoding.UTF8.GetBytes(result[fileEdits.Key]);
            var lineStarts = LineStarts(bytes);
            var spliced = new List<byte>(bytes);
            foreach (var edit in fileEdits.OrderByDescending(e => (e.Span.Line, e.Span.Column)))
            {
                var span = edit.Span;
                Assert.True(span.EndLine > 0 && span.EndColumn > 0, $"edit at {span} has no end position");
                var start = Offset(lineStarts, span.Line, span.Column);
                var end = Offset(lineStarts, span.EndLine, span.EndColumn);
                Assert.Equal(edit.OldValue, Encoding.UTF8.GetString(bytes, start, end - start));
                spliced.RemoveRange(start, end - start);
                spliced.InsertRange(start, Encoding.UTF8.GetBytes(edit.NewValue));
            }
            result[fileEdits.Key] = Encoding.UTF8.GetString(spliced.ToArray());
        }
        return result;
    }

    private static int Offset(int[] lineStarts, int line, int column)
    {
        Assert.True(line > 0 && column > 0, $"invalid position {line}:{column}");
        return lineStarts[line - 1] + column - 1;
    }

    private static int[] LineStarts(byte[] bytes)
    {
        var starts = new List<int> { 0 };
        for (var i = 0; i < bytes.Length; i++)
            if (bytes[i] == (byte)'\n')
                starts.Add(i + 1);
        return starts.ToArray();
    }
}
