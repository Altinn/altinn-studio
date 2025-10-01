using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ServiceTasks;

public class PdfServiceTaskTests
{
    private readonly Mock<IAppMetadata> _appMetadata;
    private readonly Mock<IPdfService> _pdfService;
    private readonly Mock<IAppModel> _appModel;

    public PdfServiceTaskTests()
    {
        _appMetadata = new Mock<IAppMetadata>();
        _pdfService = new Mock<IPdfService>();
        _appModel = new Mock<IAppModel>();
    }

    [Fact]
    public async Task Execute_calls_pdf_service()
    {
        Instance i = new Instance() { Data = [new DataElement() { DataType = "DataType_1" }] };
        SetupAppMetadataWithDataTypes(
            [
                new DataType
                {
                    Id = "DataType_1",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic() { ClassRef = "DataType_1" },
                    EnablePdfCreation = true,
                },
            ]
        );
        PdfServiceTask pst = new PdfServiceTask(_appMetadata.Object, _pdfService.Object);
        await pst.Execute("Task_1", i);
        _appMetadata.Verify(am => am.GetApplicationMetadata(), Times.Once);
        _pdfService.Verify(ps => ps.GenerateAndStorePdf(i, "Task_1", CancellationToken.None), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _pdfService.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_pdf_service_is_called_only_once()
    {
        Instance i = new Instance()
        {
            Data =
            [
                new DataElement() { DataType = "DataType_1" },
                new DataElement() { DataType = "DataType_1" },
                new DataElement() { DataType = "DataType_2" },
                new DataElement() { DataType = "DataType_2" },
            ],
        };
        SetupAppMetadataWithDataTypes(
            [
                new DataType
                {
                    Id = "DataType_1",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic() { ClassRef = "DataType_1" },
                    EnablePdfCreation = true,
                },
                new DataType
                {
                    Id = "DataType_2",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic() { ClassRef = "DataType_2" },
                    EnablePdfCreation = true,
                },
            ]
        );
        PdfServiceTask pst = new PdfServiceTask(_appMetadata.Object, _pdfService.Object);
        await pst.Execute("Task_1", i);
        _appMetadata.Verify(am => am.GetApplicationMetadata());
        _pdfService.Verify(ps => ps.GenerateAndStorePdf(i, "Task_1", CancellationToken.None), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _pdfService.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_pdf_generation_is_never_called_if_no_dataelements_for_datatype()
    {
        Instance i = new Instance() { Data = [] };
        SetupAppMetadataWithDataTypes(
            [
                new DataType
                {
                    Id = "DataType_1",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic() { ClassRef = "DataType_1" },
                    EnablePdfCreation = true,
                },
                new DataType
                {
                    Id = "DataType_2",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic() { ClassRef = "DataType_2" },
                    EnablePdfCreation = true,
                },
            ]
        );
        PdfServiceTask pst = new PdfServiceTask(_appMetadata.Object, _pdfService.Object);
        await pst.Execute("Task_1", i);
        _appMetadata.Verify(am => am.GetApplicationMetadata());
        _appMetadata.VerifyNoOtherCalls();
        _pdfService.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_does_not_call_pdfservice_if_generate_pdf_are_false_for_all_datatypes()
    {
        DataElement d = new DataElement() { Id = "DataElement_1", DataType = "DataType_1" };
        Instance i = new Instance() { Data = [d] };
        SetupAppMetadataWithDataTypes(
            [
                new DataType
                {
                    Id = "DataType_1",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic()
                    {
                        ClassRef = "Altinn.App.Core.Tests.Internal.Process.ServiceTasks.TestData.DummyDataType",
                    },
                    EnablePdfCreation = false,
                },
            ]
        );
        PdfServiceTask pst = new PdfServiceTask(_appMetadata.Object, _pdfService.Object);
        await pst.Execute("Task_1", i);
        _appMetadata.Verify(am => am.GetApplicationMetadata(), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _pdfService.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_does_not_call_pdfservice_if_generate_pdf_are_false_for_all_datatypes_nde_pdf_flag_true()
    {
        DataElement d = new DataElement() { Id = "DataElement_1", DataType = "DataType_1" };
        Instance i = new Instance() { Data = [d] };
        SetupAppMetadataWithDataTypes(
            [
                new DataType
                {
                    Id = "DataType_1",
                    TaskId = "Task_1",
                    AppLogic = new ApplicationLogic()
                    {
                        ClassRef = "Altinn.App.Core.Tests.Internal.Process.ServiceTasks.TestData.DummyDataType",
                    },
                    EnablePdfCreation = false,
                },
            ]
        );
        PdfServiceTask pst = new PdfServiceTask(_appMetadata.Object, _pdfService.Object);
        await pst.Execute("Task_1", i);
        _appMetadata.Verify(am => am.GetApplicationMetadata(), Times.Once);
        _appMetadata.VerifyNoOtherCalls();
        _pdfService.VerifyNoOtherCalls();
        _appModel.VerifyNoOtherCalls();
    }

    private void SetupAppMetadataWithDataTypes(List<DataType>? dataTypes = null)
    {
        _appMetadata
            .Setup(am => am.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/test") { DataTypes = dataTypes ?? new List<DataType> { } });
    }
}
