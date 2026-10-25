using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class PaymentProcessTaskTests
{
    [Fact]
    public void ValidateConfiguration_MissingConfiguration_ReturnsError()
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = null });

        string finding = Assert.Single(
            _paymentProcessTask.ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
        );

        Assert.Contains("PaymentConfig is missing", finding);
    }

    [Theory]
    [InlineData(null, "receipt", "PaymentDataType")]
    [InlineData(" ", "receipt", "PaymentDataType")]
    [InlineData("payment", null, "PaymentReceiptPdfDataType")]
    public void ValidateConfiguration_RejectsMissingPaymentDataTypes(
        string? paymentType,
        string? receiptType,
        string field
    )
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration
                    {
                        PaymentDataType = paymentType,
                        PaymentReceiptPdfDataType = receiptType,
                    },
                }
            );

        string finding = Assert.Single(
            _paymentProcessTask.ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
        );

        Assert.Contains(field, finding);
    }

    [Theory]
    [InlineData(HostingEnvironment.Development, false)]
    [InlineData(HostingEnvironment.Production, true)]
    public void ValidateConfiguration_PaymentDataTypeMustBeAppOwnedDuringDevelopment(
        HostingEnvironment environment,
        bool valid
    )
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration
                    {
                        PaymentDataType = "payment",
                        PaymentReceiptPdfDataType = "receipt",
                    },
                }
            );
        ProcessTaskValidationContext context = ValidationContext(environment);
        context.ApplicationMetadata.DataTypes.Add(new DataType { Id = "payment" });

        string[] findings = _paymentProcessTask.ValidateConfiguration(context).ToArray();

        if (valid)
            Assert.Empty(findings);
        else
            Assert.Contains("app:owned", Assert.Single(findings));
    }

    private static ProcessTaskValidationContext ValidationContext(HostingEnvironment environment) =>
        new()
        {
            TaskId = "Task_1",
            Environment = environment,
            ApplicationMetadata = new ApplicationMetadata("ttd/app") { DataTypes = [] },
        };

    private readonly Mock<IPdfService> _pdfServiceMock;
    private readonly Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IPaymentProcessor> _paymentProcessorMock;
    private readonly PaymentProcessTask _paymentProcessTask;

    public PaymentProcessTaskTests()
    {
        _pdfServiceMock = new Mock<IPdfService>();
        _processReaderMock = new Mock<IProcessReader>();
        _paymentProcessorMock = new Mock<IPaymentProcessor>();
        _paymentProcessorMock.Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        var services = new ServiceCollection();
        services.AddSingleton(_paymentProcessorMock.Object);
        var appImplementationFactory = new AppImplementationFactory(services.BuildServiceProvider());

        _paymentProcessTask = new PaymentProcessTask(
            _pdfServiceMock.Object,
            _processReaderMock.Object,
            appImplementationFactory
        );
    }

    [Fact]
    public async Task Start_ShouldTerminateProcessorAndRemovePaymentData()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Created);
        string paymentId = paymentInformation.PaymentDetails!.PaymentId;
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentProcessorMock
            .Setup(x =>
                x.TerminatePayment(
                    instance,
                    It.Is<PaymentInformation>(payment =>
                        payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);

        StageResult result = await RunStart(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _paymentProcessorMock.Verify(x =>
            x.TerminatePayment(
                instance,
                It.Is<PaymentInformation>(payment =>
                    payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                ),
                It.IsAny<CancellationToken>()
            )
        );
        dataMutator.Verify(x => x.RemoveDataElement(paymentDataElement));
    }

    [Fact]
    public async Task Start_PaidPayment_ShouldLeaveStoredPaymentUntouched()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Paid);
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        StageResult result = await RunStart(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _paymentProcessorMock.Verify(
            x =>
                x.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
    }

    [Fact]
    public async Task End_PaymentCompleted_ShouldGeneratePdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None))
            .ReturnsAsync(new byte[] { 1, 2, 3 });

        StageResult result = await RunEnd(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _pdfServiceMock.Verify(x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None));
        dataMutator.Verify(x =>
            x.AddBinaryDataElement(
                validPaymentConfiguration.PaymentReceiptPdfDataType,
                "application/pdf",
                "Betalingskvittering.pdf",
                It.IsAny<ReadOnlyMemory<byte>>(),
                taskId,
                It.IsAny<List<KeyValueEntry>?>()
            )
        );
    }

    [Fact]
    public async Task End_PaymentSkipped_ShouldNotGeneratePdfReceipt()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Skipped);

        StageResult result = await RunEnd(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _pdfServiceMock.Verify(
            x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None),
            Times.Never
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_ReceiptAlreadyStoredByThisTask_KeepsItInsteadOfStoringAnother()
    {
        // The ending step committed the receipt, then ran again: the stage must be idempotent.
        DataElement paymentDataElement = CreatePaymentDataElement();
        DataElement receipt = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentReceiptPdfDataType",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_1",
                },
            ],
        };
        Instance instance = CreateInstance(paymentDataElement, receipt);
        var dataMutator = CreateDataMutator(instance);

        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);

        StageResult result = await RunEnd(dataMutator.Object);

        Assert.IsType<CompletedStageResult>(result);
        _pdfServiceMock.VerifyNoOtherCalls();
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task End_PaymentNotCompleted_FailsRetryably()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        string taskId = instance.Process.CurrentTask.ElementId;

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        ValidAltinnPaymentConfiguration validPaymentConfiguration = altinnTaskExtension.PaymentConfiguration.Validate();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Created);

        _pdfServiceMock.Verify(
            x => x.GeneratePdf(instance, taskId, "nb", null, false, null, CancellationToken.None),
            Times.Never
        );
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    validPaymentConfiguration.PaymentReceiptPdfDataType,
                    "application/pdf",
                    "Betalingskvittering.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    taskId,
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );

        var failed = Assert.IsType<FailedStageResult>(await RunEnd(dataMutator.Object));
        Assert.Equal(FailureKind.Retryable, failed.Kind);
        Assert.Equal("The payment is not completed.", failed.ErrorMessage);
    }

    [Fact]
    public async Task Abandon_ShouldTerminateProcessorAndRemovePaymentData()
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(PaymentStatus.Created);
        string paymentId = paymentInformation.PaymentDetails!.PaymentId;
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(paymentInformation));

        var altinnTaskExtension = new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _paymentProcessorMock
            .Setup(x =>
                x.TerminatePayment(
                    instance,
                    It.Is<PaymentInformation>(payment =>
                        payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);

        StageResult result = await RunAbandon(dataMutator.Object);
        Assert.IsType<CompletedStageResult>(result);

        _paymentProcessorMock.Verify(x =>
            x.TerminatePayment(
                instance,
                It.Is<PaymentInformation>(payment =>
                    payment.PaymentDetails != null && payment.PaymentDetails.PaymentId == paymentId
                ),
                It.IsAny<CancellationToken>()
            )
        );
        dataMutator.Verify(x => x.RemoveDataElement(paymentDataElement));
    }

    [Fact]
    public async Task End_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = () => RunEnd(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task End_PaymentDataTypeIsNullOrWhitespace_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration { PaymentDataType = "" },
                }
            );

        Func<Task> act = () => RunEnd(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentDataType is missing*");
    }

    [Fact]
    public async Task End_ValidConfiguration_ShouldNotThrow()
    {
        DataElement paymentDataElement = CreatePaymentDataElement();
        Instance instance = CreateInstance(paymentDataElement);
        var dataMutator = CreateDataMutator(instance);

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        SetupPaymentInformation(dataMutator, paymentDataElement, PaymentStatus.Paid);
        _pdfServiceMock
            .Setup(ps =>
                ps.GeneratePdf(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    null,
                    false,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new byte[] { 1, 2, 3 });

        Func<Task> act = () => RunEnd(dataMutator.Object);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task Abandon_PaymentConfigurationIsNull_ShouldThrowApplicationConfigException()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns((AltinnTaskExtension?)null);

        Func<Task> act = () => RunAbandon(CreateDataMutator(CreateInstance()).Object);

        await act.Should().ThrowAsync<ApplicationConfigException>().WithMessage("*PaymentConfig is missing*");
    }

    [Fact]
    public async Task Abandon_ValidConfiguration_ShouldNotThrow()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(It.IsAny<string>()))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        Func<Task> act = () => RunAbandon(CreateDataMutator(CreateInstance()).Object);

        await act.Should().NotThrowAsync();
    }

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static void SetupPaymentInformation(
        Mock<IInstanceDataMutator> dataMutator,
        DataElement paymentDataElement,
        PaymentStatus status
    )
    {
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(JsonSerializer.SerializeToUtf8Bytes(CreatePaymentInformation(status)));
    }

    private Task<StageResult> RunStart(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineStart(new PipelineBuilder()), dataMutator);

    private Task<StageResult> RunEnd(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineEnd(new PipelineBuilder()), dataMutator);

    private Task<StageResult> RunAbandon(IInstanceDataMutator dataMutator) =>
        Run(_paymentProcessTask.DefineAbandon(new PipelineBuilder()), dataMutator);

    /// <summary>Runs the stages in order, as the engine would, stopping at the first that does not complete.</summary>
    private static async Task<StageResult> Run(ProcessTaskPipeline pipeline, IInstanceDataMutator dataMutator)
    {
        var context = new StageContext
        {
            InstanceDataMutator = dataMutator,
            Actor = new(),
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
        foreach (PipelineStage.Plain stage in pipeline.Stages)
        {
            StageResult result = await stage.Work(context);
            if (result is not CompletedStageResult)
            {
                return result;
            }
        }
        return StageResult.Completed();
    }

    private static Instance CreateInstance(params DataElement[] dataElements)
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
            },
            Data = [.. dataElements],
        };
    }

    private static AltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };
    }

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status)
    {
        return new PaymentInformation
        {
            TaskId = "Task_1",
            Status = status,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Receiver = new PaymentReceiver { Name = "Receiver" },
                Currency = "NOK",
                OrderLines =
                [
                    new PaymentOrderLine
                    {
                        Id = "line-1",
                        Name = "test",
                        PriceExVat = 100,
                        Quantity = 1,
                        VatPercent = 25,
                    },
                ],
            },
            PaymentDetails = new PaymentDetails { PaymentId = "payment-123" },
        };
    }

    private static DataElement CreatePaymentDataElement()
    {
        return new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "paymentDataType",
            ContentType = "application/json",
            Filename = "paymentDataType.json",
        };
    }
}
