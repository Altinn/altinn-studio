using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf;

public class PdfPreviewTaskResolverTests
{
    private readonly Mock<IProcessReader> _processReader = new();
    private readonly Mock<IAppResources> _resources = new();

    private static ProcessTask DataTask(string id) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "data" } },
        };

    private static ServiceTask PdfTask(string id, AltinnPdfConfiguration? config = null) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension { TaskType = "pdf", PdfConfiguration = config },
            },
        };

    private static ServiceTask SubformPdfTask(string id, AltinnSubformPdfConfiguration? config) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension { TaskType = "subformPdf", SubformPdfConfiguration = config },
            },
        };

    private static Instance NewInstance(string? currentTaskId, List<DataElement>? data = null) =>
        new()
        {
            Id = "509378/9c6e6c72-4479-4d6d-9e26-e2ab63d4a2f8",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = currentTaskId is null
                ? null
                : new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = currentTaskId } },
            Data = data ?? [],
        };

    private void SetupProcessTask(ProcessTask task)
    {
        _processReader.Setup(x => x.GetFlowElement(task.Id)).Returns(task);
        _processReader.Setup(x => x.GetAltinnTaskExtension(task.Id)).Returns(task.ExtensionElements?.TaskExtension);
    }

    private PdfPreviewTaskResolver Target() => new(_processReader.Object, _resources.Object);

    [Fact]
    public void Resolve_NoTaskIdNoDataElementId_UsesCurrentTask()
    {
        var task = DataTask("Task_1");
        SetupProcessTask(task);
        var instance = NewInstance("Task_1");

        PdfPreviewTarget target = Target().Resolve(instance, taskId: null, dataElementId: null);

        Assert.Equal("Task_1", target.TaskId);
        Assert.Null(target.PathTaskId);
        Assert.Null(target.AutoPdfTaskIds);
        Assert.Null(target.SubformPdfContext);
    }

    [Fact]
    public void Resolve_NoTaskIdAndInstanceHasNoCurrentTask_Throws404()
    {
        var instance = NewInstance(currentTaskId: null);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: null, dataElementId: null)
        );

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public void Resolve_UnknownTaskId_Throws404()
    {
        _processReader.Setup(x => x.GetFlowElement("Task_Missing")).Returns((ProcessElement?)null);
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_Missing", dataElementId: null)
        );

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public void Resolve_TaskWithoutExtensionElements_GetsDefaultTarget()
    {
        // IProcessReader.GetAltinnTaskExtension throws for a task that has no extensionElements at all; the
        // resolver must not depend on it for the task-type lookup, and should preview such a task's own layout.
        var task = new ProcessTask { Id = "Task_Plain", ExtensionElements = null };
        _processReader.Setup(x => x.GetFlowElement(task.Id)).Returns(task);
        _processReader
            .Setup(x => x.GetAltinnTaskExtension(task.Id))
            .Throws(new ProcessException("No AltinnTaskExtension found on task"));
        var instance = NewInstance("Task_1");

        PdfPreviewTarget target = Target().Resolve(instance, taskId: "Task_Plain", dataElementId: null);

        Assert.Equal("Task_Plain", target.TaskId);
        Assert.Equal("Task_Plain", target.PathTaskId);
        Assert.Null(target.AutoPdfTaskIds);
        Assert.Null(target.SubformPdfContext);
    }

    [Fact]
    public void Resolve_TaskIdIsNotAProcessTask_Throws404()
    {
        var gateway = new ExclusiveGateway { Id = "Gateway_1" };
        _processReader.Setup(x => x.GetFlowElement("Gateway_1")).Returns(gateway);
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Gateway_1", dataElementId: null)
        );

        Assert.Equal(404, ex.StatusCode);
    }

    [Theory]
    [InlineData("Task_1", null)] // current task -> no path segment needed
    [InlineData("Task_2", "Task_2")] // a different task -> path segment needed to route there
    public void Resolve_DataTask_SetsPathTaskIdOnlyWhenDifferentFromCurrentTask(
        string taskId,
        string? expectedPathTaskId
    )
    {
        SetupProcessTask(DataTask("Task_1"));
        SetupProcessTask(DataTask("Task_2"));
        var instance = NewInstance("Task_1");

        PdfPreviewTarget target = Target().Resolve(instance, taskId, dataElementId: null);

        Assert.Equal(taskId, target.TaskId);
        Assert.Equal(expectedPathTaskId, target.PathTaskId);
        Assert.Null(target.AutoPdfTaskIds);
        Assert.Null(target.SubformPdfContext);
    }

    [Fact]
    public void Resolve_DataTask_WithDataElementId_Throws400()
    {
        SetupProcessTask(DataTask("Task_1"));
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Model" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_1", dataElementId: "elem-1")
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_PdfTask_WithDataElementId_Throws400()
    {
        SetupProcessTask(PdfTask("Task_Pdf", new AltinnPdfConfiguration { AutoPdfTaskIds = ["Task_1"] }));
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Model" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_Pdf", dataElementId: "elem-1")
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_PdfTask_WithAutoPdfTaskIds_ReturnsThemOnTarget()
    {
        SetupProcessTask(PdfTask("Task_Pdf", new AltinnPdfConfiguration { AutoPdfTaskIds = ["Task_1", "Task_2"] }));
        _resources.Setup(x => x.GetLayoutSettingsForFolder("Task_Pdf")).Returns((LayoutSettings?)null);
        var instance = NewInstance("Task_1");

        PdfPreviewTarget target = Target().Resolve(instance, taskId: "Task_Pdf", dataElementId: null);

        Assert.Equal("Task_Pdf", target.TaskId);
        Assert.Equal("Task_Pdf", target.PathTaskId);
        Assert.Equal(["Task_1", "Task_2"], target.AutoPdfTaskIds);
        Assert.Null(target.SubformPdfContext);
    }

    [Fact]
    public void Resolve_PdfTask_WithUiFolder_NoAutoPdfTaskIds_Succeeds()
    {
        SetupProcessTask(PdfTask("Task_Pdf", null));
        _resources.Setup(x => x.GetLayoutSettingsForFolder("Task_Pdf")).Returns(new LayoutSettings());
        var instance = NewInstance("Task_1");

        PdfPreviewTarget target = Target().Resolve(instance, taskId: "Task_Pdf", dataElementId: null);

        Assert.Equal("Task_Pdf", target.TaskId);
        Assert.Null(target.AutoPdfTaskIds);
    }

    [Fact]
    public void Resolve_PdfTask_NoUiFolderNoAutoPdfTaskIds_Throws400()
    {
        SetupProcessTask(PdfTask("Task_Pdf", null));
        _resources.Setup(x => x.GetLayoutSettingsForFolder("Task_Pdf")).Returns((LayoutSettings?)null);
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_Pdf", dataElementId: null)
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_SubformPdfTask_WithoutDataElementId_Throws400()
    {
        SetupProcessTask(
            SubformPdfTask(
                "Task_SubformPdf",
                new AltinnSubformPdfConfiguration { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" }
            )
        );
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_SubformPdf", dataElementId: null)
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_SubformPdfTask_DataElementNotFound_Throws404()
    {
        SetupProcessTask(
            SubformPdfTask(
                "Task_SubformPdf",
                new AltinnSubformPdfConfiguration { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" }
            )
        );
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_SubformPdf", dataElementId: "missing-elem")
        );

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public void Resolve_SubformPdfTask_DataElementHasWrongDataType_Throws400()
    {
        SetupProcessTask(
            SubformPdfTask(
                "Task_SubformPdf",
                new AltinnSubformPdfConfiguration { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" }
            )
        );
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "OtherType" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_SubformPdf", dataElementId: "elem-1")
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_SubformPdfTask_MissingConfiguration_Throws400()
    {
        SetupProcessTask(SubformPdfTask("Task_SubformPdf", config: null));
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Sub" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: "Task_SubformPdf", dataElementId: "elem-1")
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_SubformPdfTask_ValidRequest_ReturnsSubformPdfContext()
    {
        SetupProcessTask(
            SubformPdfTask(
                "Task_SubformPdf",
                new AltinnSubformPdfConfiguration { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" }
            )
        );
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Sub" }]);

        PdfPreviewTarget target = Target().Resolve(instance, taskId: "Task_SubformPdf", dataElementId: "elem-1");

        Assert.Equal("Task_SubformPdf", target.TaskId);
        Assert.Null(target.PathTaskId);
        Assert.Null(target.AutoPdfTaskIds);
        Assert.NotNull(target.SubformPdfContext);
        Assert.Equal("subform-x", target.SubformPdfContext!.ComponentId);
        Assert.Equal("elem-1", target.SubformPdfContext.DataElementId);
    }

    [Fact]
    public void Resolve_DataElementIdOnly_ResolvesToTheMatchingSubformPdfTask()
    {
        var subformPdfTask = SubformPdfTask(
            "Task_SubformPdf",
            new AltinnSubformPdfConfiguration { SubformComponentId = "subform-x", SubformDataTypeId = "Sub" }
        );
        SetupProcessTask(subformPdfTask);
        _processReader.Setup(x => x.GetProcessTasks()).Returns([DataTask("Task_1"), subformPdfTask]);
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Sub" }]);

        PdfPreviewTarget target = Target().Resolve(instance, taskId: null, dataElementId: "elem-1");

        Assert.Equal("Task_SubformPdf", target.TaskId);
        Assert.Equal("subform-x", target.SubformPdfContext!.ComponentId);
    }

    [Fact]
    public void Resolve_DataElementIdOnly_NoMatchingSubformPdfTask_Throws404()
    {
        _processReader.Setup(x => x.GetProcessTasks()).Returns([DataTask("Task_1")]);
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Sub" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: null, dataElementId: "elem-1")
        );

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public void Resolve_DataElementIdOnly_SeveralMatchingSubformPdfTasks_Throws400()
    {
        var subformPdfTaskA = SubformPdfTask(
            "Task_SubformPdfA",
            new AltinnSubformPdfConfiguration { SubformComponentId = "subform-a", SubformDataTypeId = "Sub" }
        );
        var subformPdfTaskB = SubformPdfTask(
            "Task_SubformPdfB",
            new AltinnSubformPdfConfiguration { SubformComponentId = "subform-b", SubformDataTypeId = "Sub" }
        );
        _processReader.Setup(x => x.GetProcessTasks()).Returns([subformPdfTaskA, subformPdfTaskB]);
        var instance = NewInstance("Task_1", [new DataElement { Id = "elem-1", DataType = "Sub" }]);

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: null, dataElementId: "elem-1")
        );

        Assert.Equal(400, ex.StatusCode);
    }

    [Fact]
    public void Resolve_DataElementIdOnly_DataElementNotFoundOnInstance_Throws404()
    {
        _processReader.Setup(x => x.GetProcessTasks()).Returns([DataTask("Task_1")]);
        var instance = NewInstance("Task_1");

        var ex = Assert.Throws<PdfPreviewException>(() =>
            Target().Resolve(instance, taskId: null, dataElementId: "missing-elem")
        );

        Assert.Equal(404, ex.StatusCode);
    }
}
