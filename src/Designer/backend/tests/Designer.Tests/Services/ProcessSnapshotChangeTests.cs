using System;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Xunit;

namespace Designer.Tests.Services;

public sealed class ProcessSnapshotChangeTests
{
    [Fact]
    public void Create_RenamePreservesXmlWithoutAddingOrRemovingTasks()
    {
        string previous = ProcessXml(
            TaskXml("Original", "signing", "<altinn:signatureDataType>signatures</altinn:signatureDataType>")
        );
        string proposed = previous.Replace("Original", "Renamed", StringComparison.Ordinal);

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(
            previous,
            proposed,
            new TaskIdChange { OldId = "Original", NewId = "Renamed" }
        );

        Assert.Empty(change.AddedTasks);
        Assert.Empty(change.RemovedTasks);
        Assert.Empty(change.DeletedDataTypeIds);
        Assert.Equal("Renamed", change.RetainedDataTypeOwners["signatures"]);
        Assert.True(XNode.DeepEquals(XDocument.Parse(proposed, LoadOptions.PreserveWhitespace), change.Document));
        Assert.False(change.DocumentModified);
    }

    [Fact]
    public void Create_DiagramOnlyChangeLeavesTheDocumentUnmodified()
    {
        string previous = ProcessXml(TaskXml("Task_1", "data", ""));
        string proposed = previous.Replace("untouched", "moved", StringComparison.Ordinal);

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(previous, proposed);

        Assert.Empty(change.AddedTasks);
        Assert.Empty(change.RemovedTasks);
        Assert.False(change.DocumentModified);
        Assert.True(XNode.DeepEquals(XDocument.Parse(proposed, LoadOptions.PreserveWhitespace), change.Document));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Create_RemovesSignatureReferencesOnlyAfterLastOwnerIsRemoved(bool shared)
    {
        string removed = TaskXml(
            "Removed",
            "signing",
            "<altinn:signatureDataType>signatures</altinn:signatureDataType>"
        );
        string retained = TaskXml(
            "Retained",
            "signing",
            shared ? "<altinn:signatureDataType>signatures</altinn:signatureDataType>" : ""
        );
        string references = TaskXml(
            "References",
            "signing",
            "<altinn:uniqueFromSignaturesInDataTypes><altinn:dataType>signatures</altinn:dataType><altinn:dataType>other-signatures</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes>"
        );

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(
            ProcessXml(removed + retained + references),
            ProcessXml(retained + references)
        );

        Assert.Equal("Removed", (string)Assert.Single(change.RemovedTasks).Attribute("id"));
        Assert.Empty(change.AddedTasks);
        Assert.Equal(shared ? [] : new[] { "signatures" }, change.DeletedDataTypeIds);
        string[] remainingReferences = change
            .Document.Descendants(XName.Get("dataType", "http://altinn.no/process"))
            .Select(element => element.Value)
            .ToArray();
        Assert.Equal(shared ? ["signatures", "other-signatures"] : new[] { "other-signatures" }, remainingReferences);
        Assert.Equal(!shared, change.DocumentModified);
    }

    [Fact]
    public void SerializeDocument_RemovesStaleReferenceAndPreservesOtherXml()
    {
        const string Declaration = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        const string RemovedReference = "<altinn:dataType>signatures</altinn:dataType>";
        string removed = TaskXml(
            "Removed",
            "signing",
            "<altinn:signatureDataType>signatures</altinn:signatureDataType>"
        );
        string references = TaskXml(
            "References",
            "signing",
            $"<altinn:uniqueFromSignaturesInDataTypes>{RemovedReference}<altinn:dataType>other-signatures</altinn:dataType></altinn:uniqueFromSignaturesInDataTypes>"
        );
        string proposed = Declaration + ProcessXml(references);

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(
            Declaration + ProcessXml(removed + references),
            proposed
        );

        Assert.True(change.DocumentModified);
        string expected = proposed.Replace(RemovedReference, "", StringComparison.Ordinal);
        Assert.Equal(Encoding.UTF8.GetBytes(expected), change.SerializeDocument());
    }

    [Theory]
    [InlineData("<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<?xml version=\"1.0\" encoding=\"UTF-8\"?>")]
    [InlineData("<?xml version=\"1.0\" encoding=\"utf-8\"?>", "<?xml version=\"1.0\" encoding=\"utf-8\"?>")]
    [InlineData("<?xml version=\"1.0\"?>", "<?xml version=\"1.0\"?>")]
    [InlineData(
        "<?xml version=\"1.0\" encoding=\"utf-16\" standalone=\"yes\"?>",
        "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>"
    )]
    [InlineData("", "")]
    public void SerializeDocument_PreservesDeclarationWithUtf8Encoding(string declaration, string expected)
    {
        string process = ProcessXml(TaskXml("Task_1", "data", ""));

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(process, declaration + process);

        Assert.Equal(Encoding.UTF8.GetBytes(expected + process), change.SerializeDocument());
    }

    [Fact]
    public void Create_IgnoresEmptyGeneratedDataTypesAndForeignElementsWithTheSameName()
    {
        string removed = TaskXml(
            "Removed",
            "signing",
            "<altinn:signatureDataType> </altinn:signatureDataType><foreign:signatureDataType>foreign-data</foreign:signatureDataType>"
        );

        ProcessSnapshotChange change = ProcessSnapshotChange.Create(ProcessXml(removed), ProcessXml(""));

        Assert.Empty(change.DeletedDataTypeIds);
        Assert.Empty(change.RetainedDataTypeOwners);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("Missing", "Renamed")]
    [InlineData("Original", "Missing")]
    public void Create_RejectsTaskReplacementWithoutMatchingRenameMetadata(string oldId, string newId)
    {
        TaskIdChange rename = oldId is null ? null : new TaskIdChange { OldId = oldId, NewId = newId };

        Assert.Throws<ArgumentException>(() =>
            ProcessSnapshotChange.Create(
                ProcessXml(TaskXml("Original", "data", "")),
                ProcessXml(TaskXml("Renamed", "data", "")),
                rename
            )
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Create_RejectsMultipleTaskTypes(bool inSavedProcess)
    {
        string valid = ProcessXml(TaskXml("Task_1", "data", ""));
        string invalid = ProcessXml(TaskXml("Task_1", "data", "<altinn:taskType>signing</altinn:taskType>"));

        ArgumentException exception = Assert.Throws<ArgumentException>(() =>
            ProcessSnapshotChange.Create(inSavedProcess ? invalid : valid, inSavedProcess ? valid : invalid)
        );
        Assert.Equal("The task 'Task_1' has more than one task type.", exception.Message);
    }

    private static string ProcessXml(string tasks) =>
        $"""
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" xmlns:foreign="urn:custom">
              <!-- Preserve diagram metadata, custom extensions and whitespace. -->
              <bpmn:process id="Process" foreign:attribute="custom">{tasks}</bpmn:process>
              <foreign:diagram value="untouched" />
            </bpmn:definitions>
            """;

    private static string TaskXml(string id, string type, string config) =>
        $"""
            <bpmn:serviceTask id="{id}"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>{type}</altinn:taskType>{config}</altinn:taskExtension></bpmn:extensionElements></bpmn:serviceTask>
            """;
}
