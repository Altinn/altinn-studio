using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public sealed class PaymentControllerProcessStatusGuardTests
    : ApiTestBase,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;

    public PaymentControllerProcessStatusGuardTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper) { }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task CurrentPaymentTask_WhenNotIdle_ReturnsReadOnlyStatusWithoutPersisting(ProcessStatus status)
    {
        using HttpClient setupClient = GetRootedUserClient(Org, App);
        Guid instanceGuid = await CreateIsolatedInstance(setupClient);
        try
        {
            var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
            processReader
                .Setup(reader => reader.GetAltinnTaskExtension("Task_1"))
                .Returns(CreatePaymentTaskExtension());
            var paymentService = new Mock<IPaymentService>(MockBehavior.Strict);
            paymentService
                .Setup(service =>
                    service.CheckPaymentStatus(
                        It.IsAny<Instance>(),
                        It.IsAny<ValidAltinnPaymentConfiguration>(),
                        "Task_1",
                        It.IsAny<string?>()
                    )
                )
                .ReturnsAsync(
                    new PaymentInformation
                    {
                        TaskId = "Task_1",
                        Status = PaymentStatus.Paid,
                        OrderDetails = new OrderDetails
                        {
                            PaymentProcessorId = "test",
                            Currency = "NOK",
                            OrderLines = [],
                            Receiver = new(),
                        },
                    }
                );
            using HttpClient client = GetRootedUserClient(
                Org,
                App,
                configureServices: services =>
                {
                    services.RemoveAll<IProcessReader>();
                    services.RemoveAll<IPaymentService>();
                    services.AddSingleton(processReader.Object);
                    services.AddSingleton(paymentService.Object);
                }
            );
            await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, instanceGuid, status);
            Instance before = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, instanceGuid);

            using HttpResponseMessage response = await client.GetAsync(
                $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/payment"
            );

            PaymentInformation paymentInformation = await VerifyStatusAndDeserialize<PaymentInformation>(
                response,
                System.Net.HttpStatusCode.OK
            );
            paymentInformation.TaskId.Should().Be("Task_1");
            paymentInformation.Status.Should().Be(PaymentStatus.Paid);
            paymentService.Verify(
                service =>
                    service.CheckPaymentStatus(
                        It.IsAny<Instance>(),
                        It.IsAny<ValidAltinnPaymentConfiguration>(),
                        "Task_1",
                        It.IsAny<string?>()
                    ),
                Times.Once
            );
            paymentService.VerifyNoOtherCalls();
            Instance after = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, instanceGuid);
            after.Data.Should().BeEquivalentTo(before.Data);
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, instanceGuid);
        }
    }

    [Fact]
    public async Task HistoricalPaymentTask_WhenProcessing_RemainsReadOnlyAndAllowed()
    {
        const string historicalTaskId = "HistoricalPayment";
        using HttpClient setupClient = GetRootedUserClient(Org, App);
        Guid instanceGuid = await CreateIsolatedInstance(setupClient);
        try
        {
            var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
            processReader
                .Setup(reader => reader.GetAltinnTaskExtension(historicalTaskId))
                .Returns(CreatePaymentTaskExtension());
            var paymentService = new Mock<IPaymentService>(MockBehavior.Strict);
            paymentService
                .Setup(service =>
                    service.CheckPaymentStatus(
                        It.IsAny<Instance>(),
                        It.IsAny<ValidAltinnPaymentConfiguration>(),
                        historicalTaskId,
                        It.IsAny<string?>()
                    )
                )
                .ReturnsAsync(
                    new PaymentInformation
                    {
                        TaskId = historicalTaskId,
                        Status = PaymentStatus.Paid,
                        OrderDetails = new OrderDetails
                        {
                            PaymentProcessorId = "test",
                            Currency = "NOK",
                            OrderLines = [],
                            Receiver = new(),
                        },
                    }
                );
            using HttpClient client = GetRootedUserClient(
                Org,
                App,
                configureServices: services =>
                {
                    services.RemoveAll<IProcessReader>();
                    services.RemoveAll<IPaymentService>();
                    services.AddSingleton(processReader.Object);
                    services.AddSingleton(paymentService.Object);
                }
            );
            await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, instanceGuid, ProcessStatus.Processing);

            using HttpResponseMessage response = await client.GetAsync(
                $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{instanceGuid}/payment?taskId={historicalTaskId}"
            );

            response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
            paymentService.Verify(
                service =>
                    service.CheckPaymentStatus(
                        It.IsAny<Instance>(),
                        It.IsAny<ValidAltinnPaymentConfiguration>(),
                        historicalTaskId,
                        It.IsAny<string?>()
                    ),
                Times.Once
            );
            paymentService.VerifyNoOtherCalls();
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, instanceGuid);
        }
    }

    private async Task<Guid> CreateIsolatedInstance(HttpClient client)
    {
        using HttpResponseMessage createResponse = await client.PostAsync(
            $"{Org}/{App}/instances/?instanceOwnerPartyId={InstanceOwnerPartyId}",
            null
        );
        Instance instance = await VerifyStatusAndDeserialize<Instance>(
            createResponse,
            System.Net.HttpStatusCode.Created
        );
        return Guid.Parse(instance.Id.Split('/')[1]);
    }

    private static AltinnTaskExtension CreatePaymentTaskExtension() =>
        new()
        {
            PaymentConfiguration = new AltinnPaymentConfiguration
            {
                PaymentDataType = "payment-data",
                PaymentReceiptPdfDataType = "payment-receipt",
            },
        };
}
