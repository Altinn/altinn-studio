using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.Payment;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class PaymentProcessTaskTests
{
    private const string TaskId = "Task_1";

    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new();
    private readonly PaymentProcessTask _paymentProcessTask;

    public PaymentProcessTaskTests()
    {
        _hostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns("Production");
        _paymentProcessTask = new PaymentProcessTask(_processReaderMock.Object, _hostEnvironmentMock.Object);
    }

    [Fact]
    public void ValidateConfiguration_MissingConfiguration_ReturnsFinding()
    {
        _processReaderMock.Setup(pr => pr.GetAltinnTaskExtension(TaskId)).Returns((AltinnTaskExtension?)null);

        List<string> findings = _paymentProcessTask.ValidateConfiguration(CreateValidationContext()).ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("PaymentConfig is missing", finding);
    }

    [Fact]
    public void ValidateConfiguration_EmptyPaymentDataType_ReturnsFinding()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(TaskId))
            .Returns(
                new AltinnTaskExtension
                {
                    PaymentConfiguration = new AltinnPaymentConfiguration { PaymentDataType = "" },
                }
            );

        List<string> findings = _paymentProcessTask.ValidateConfiguration(CreateValidationContext()).ToList();

        string finding = Assert.Single(findings);
        Assert.Contains("PaymentDataType is missing", finding);
    }

    [Fact]
    public void ValidateConfiguration_ValidConfiguration_ReturnsNoFindings()
    {
        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(TaskId))
            .Returns(new AltinnTaskExtension { PaymentConfiguration = CreatePaymentConfiguration() });

        List<string> findings = _paymentProcessTask.ValidateConfiguration(CreateValidationContext()).ToList();

        Assert.Empty(findings);
    }

    [Fact]
    public void GetStartCommands_DeclaresCleanup()
    {
        Assert.Equal(
            [
                new WorkflowCommandRef(
                    CleanupPaymentCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
            ],
            _paymentProcessTask.GetStartCommands(TaskId)
        );
    }

    [Fact]
    public void GetEndCommands_DeclaresCompletePayment()
    {
        Assert.Equal(
            [
                new WorkflowCommandRef(
                    CompletePaymentCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
            ],
            _paymentProcessTask.GetEndCommands(TaskId)
        );
    }

    [Fact]
    public void GetAbandonCommands_DeclaresCleanup()
    {
        Assert.Equal(
            [
                new WorkflowCommandRef(
                    CleanupPaymentCommand.Key,
                    CommandPayloadSerializer.Serialize(new ProcessTaskPayload(TaskId))
                ),
            ],
            _paymentProcessTask.GetAbandonCommands(TaskId)
        );
    }

    private static ProcessTaskValidationContext CreateValidationContext() =>
        new()
        {
            TaskId = TaskId,
            Environment = Altinn.App.Core.Constants.HostingEnvironment.Production,
            ApplicationMetadata = new ApplicationMetadata("ttd/app")
            {
                DataTypes = [new DataType { Id = "paymentDataType", TaskId = TaskId }],
            },
        };

    private static AltinnPaymentConfiguration CreatePaymentConfiguration() =>
        new() { PaymentDataType = "paymentDataType", PaymentReceiptPdfDataType = "paymentReceiptPdfDataType" };
}
