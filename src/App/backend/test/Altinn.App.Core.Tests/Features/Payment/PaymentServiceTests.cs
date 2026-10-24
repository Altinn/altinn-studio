using System.Net;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Payment.Services;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Payment;

public sealed class PaymentServiceTests
{
    private readonly MockedServiceCollection _fixture = new();
    private readonly FakeTimeProvider _time = new();

    private const string Language = LanguageConst.Nb;

    private readonly Instance _instance = new Instance()
    {
        Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
        Process = new ProcessState
        {
            CurrentTask = new ProcessElementInfo { AltinnTaskType = AltinnTaskTypes.Payment, ElementId = "Task_1" },
        },
        Data = [],
    };

    private const string PaymentDataTypeId = "paymentInformation";

    public PaymentServiceTests(ITestOutputHelper outputHelper)
    {
        _fixture.OutputHelper = outputHelper;
        _fixture.AppMetadata.DataTypes.Add(
            new DataType() { Id = PaymentDataTypeId, AllowedContentTypes = ["application/json"] }
        );
        _fixture.Storage.AddInstance(_instance);
        // Add required services
        _fixture.Services.AddTransient<IPaymentService, PaymentService>();
        _fixture.Services.AddSingleton<TimeProvider>(_time);
        _fixture.Mock<IProcessEngine>();
    }

    private void SetupPaymentProcessor(OrderDetails orderDetails)
    {
        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p =>
                p.CalculateOrderDetails(
                    It.Is<Instance>(instance => instance.Id == _instance.Id),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(orderDetails);

        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
    }

    [Fact]
    public async Task StartPayment_ReturnsRedirectUrl_WhenPaymentStartedSuccessfully()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        // Act
        await using var provider = _fixture.BuildServiceProvider();
        var paymentService = provider.GetRequiredService<IPaymentService>();
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        paymentInformationResult.PaymentDetails.Should().NotBeNull();
        paymentInformationResult
            .PaymentDetails!.RedirectUrl.Should()
            .Be(paymentInformation.PaymentDetails!.RedirectUrl);
        paymentInformationResult.OrderDetails.Should().BeEquivalentTo(orderDetails);
        paymentInformationResult
            .OrderDetails.PaymentProcessorId.Should()
            .Be(paymentInformation.OrderDetails.PaymentProcessorId);
        alreadyPaid.Should().BeFalse();

        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ReturnsAlreadyPaidTrue_WhenPaymentIsAlreadyPaid()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        // Add OrderDetailsCalculator mock with no setup (it is never used, but required for the service to initialize)
        _fixture.Mock<IOrderDetailsCalculator>();

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var dataService = sp.GetRequiredService<IDataService>();
        // setup dat
        await dataService.InsertJsonObject(
            new InstanceIdentifier(_instance),
            PaymentDataTypeId,
            new PaymentInformation
            {
                TaskId = "Task_1",
                Status = PaymentStatus.Paid,
                OrderDetails = orderDetails,
                PaymentDetails = new PaymentDetails { PaymentId = "id", RedirectUrl = "url" },
            }
        );
        (PaymentInformation paymentInformationResult, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        paymentInformationResult.PaymentDetails.Should().NotBeNull();
        alreadyPaid.Should().BeTrue();
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenOrderDetailsCannotBeRetrieved()
    {
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(odc => odc.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Could not calculate order details"));

        _fixture.Mock<IPaymentProcessor>().Setup(x => x.PaymentProcessorId).Returns("paymentProcessorId");

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("Could not calculate order details", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentCannotBeStarted()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(pp => pp.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails)
            .Verifiable(Times.Once);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(x => x.PaymentProcessorId)
            .Returns(orderDetails.PaymentProcessorId)
            .Verifiable(Times.AtLeastOnce);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.StartPayment(_instance, orderDetails, Language, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("ddasdfg"))
            .Verifiable(Times.Once);

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("ddasdfg", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ThrowsException_WhenPaymentInformationCannotBeStored()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(p => p.CalculateOrderDetails(_instance, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(orderDetails);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("Could not insert json object"));
        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<Exception>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );
        Assert.Equal("Could not insert json object", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsNull_WhenNoPaymentInformationFound()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        SetupPaymentProcessor(orderDetails);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckAndStorePaymentStatus(
            await ReadInstance(sp),
            paymentConfiguration,
            Language
        );

        // Assert
        result.Should().NotBeNull();
        _instance.Process.CurrentTask.ElementId.Should().Be(result!.TaskId);
        orderDetails.Should().BeEquivalentTo(result.OrderDetails);
        result.PaymentDetails.Should().BeNull();
        Assert.Contains(
            sp.Logs,
            log => log.Body != null && log.Body.Contains("No payment information stored yet for instance")
        );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ThrowsException_WhenUnableToCheckPaymentStatus()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(x =>
                x.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new PaymentException("Some exception"));

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);
        var paymentService = sp.GetRequiredService<IPaymentService>();
        InstanceWithStorageMetadata fetchedInstance = await ReadInstance(sp);
        var exception = await Assert.ThrowsAsync<PaymentException>(() =>
            paymentService.CheckAndStorePaymentStatus(fetchedInstance, paymentConfiguration, Language)
        );
        Assert.Equal("Some exception", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentInformation_ReturnsPaymentInformation_WhenPaymentStatusCheckedSuccessfully()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        // Act
        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckAndStorePaymentStatus(
            await ReadInstance(sp),
            paymentConfiguration,
            Language
        );

        // Assert
        result.Should().NotBeNull();
        result!.PaymentDetails.Should().NotBeNull();
        result.Status.Should().Be(PaymentStatus.Paid);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentStatus_WritesNothing_WhenTheStatusIsUnchanged()
    {
        SetupPaymentProcessor(CreateOrderDetails());
        SetupProcessorStatus(() =>
            (PaymentStatus.Authorized, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "Redirect URL" })
        );

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Authorized);
        InstanceWithStorageMetadata fetchedInstance = await ReadInstance(sp);

        PaymentInformation result = await sp.GetRequiredService<IPaymentService>()
            .CheckAndStorePaymentStatus(fetchedInstance, CreatePaymentConfiguration(), Language);

        Assert.Equal(PaymentStatus.Authorized, result.Status);
        Assert.Equal(fetchedInstance.Metadata, (await ReadInstance(sp)).Metadata);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentStatus_ReturnsTheStoredStatus_WhenTheWebhookStoredOneAfterTheInstanceWasRead()
    {
        // The poll asks the processor before the charge, and the webhook stores the charged payment before the poll saves.
        WrappedServiceProvider? provider = null;
        DataElement? paymentDataElement = null;
        SetupPaymentProcessor(CreateOrderDetails());
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "paymentId",
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(async () =>
            {
                if (provider is not null && paymentDataElement is not null)
                {
                    await provider
                        .GetRequiredService<IDataService>()
                        .UpdateJsonObject(
                            new InstanceIdentifier(_instance),
                            PaymentDataTypeId,
                            Guid.Parse(paymentDataElement.Id),
                            CreatePaymentInformation(PaymentStatus.Paid)
                        );
                }
                return (PaymentStatus.Authorized, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" });
            })
            .Verifiable(Times.Once);

        await using var sp = _fixture.BuildServiceProvider();
        provider = sp;
        paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);
        InstanceWithStorageMetadata fetchedInstance = await ReadInstance(sp);

        PaymentInformation result = await sp.GetRequiredService<IPaymentService>()
            .CheckAndStorePaymentStatus(fetchedInstance, CreatePaymentConfiguration(), Language);

        Assert.Equal(PaymentStatus.Paid, result.Status);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
        _fixture.VerifyMocks();
    }

    [Theory]
    [InlineData(PaymentStatus.Created, true)]
    [InlineData(PaymentStatus.Authorized, true)]
    [InlineData(PaymentStatus.Cancelled, false)]
    [InlineData(PaymentStatus.Failed, false)]
    [InlineData(PaymentStatus.Skipped, false)]
    public async Task StartPayment_ReplacesPaymentThatCannotComplete_TerminatingOnlyWhenItCouldStillComplete(
        PaymentStatus existingStatus,
        bool terminates
    )
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        OrderDetails orderDetails = CreateOrderDetails();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        paymentInformation.Status = existingStatus;

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language))
            .ReturnsAsync(paymentDetails)
            .Verifiable(Times.Once);

        DataElement existingDataElement = SeedPaymentInformation(paymentInformation);

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.DeleteById(
                    It.IsAny<InstanceIdentifier>(),
                    Guid.Parse(existingDataElement.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true)
            .Verifiable(Times.Once);

        _fixture
            .Mock<IDataService>()
            .Setup(x =>
                x.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    paymentConfiguration.PaymentDataType!,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement())
            .Verifiable(Times.Once);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(true);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var (paymentInfo, alreadyPaid) = await paymentService.StartPayment(_instance, paymentConfiguration, Language);
        Assert.False(alreadyPaid);
        Assert.Equal(PaymentStatus.Created, paymentInfo.Status);
        Assert.Equal(orderDetails, paymentInfo.OrderDetails);
        Assert.Equal(Language, paymentInfo.Language);
        _fixture
            .Mock<IPaymentProcessor>()
            .Verify(
                pp =>
                    pp.TerminatePayment(
                        It.IsAny<Instance>(),
                        It.IsAny<PaymentInformation>(),
                        It.IsAny<CancellationToken>()
                    ),
                terminates ? Times.Once : Times.Never
            );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_Throws_WhenProcessorRefusesToTerminateAPaymentThatHasNotGoneThrough()
    {
        // Arrange
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement());
        SeedPaymentInformation(paymentInformation);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(false)
            .Verifiable(Times.Once);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    _instance,
                    paymentDetails.PaymentId,
                    paymentInformation.OrderDetails.TotalPriceIncVat,
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Created, paymentDetails))
            .Verifiable(Times.Once);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );

        // Act & Assert
        Assert.Equal(
            $"Unable to cancel existing {orderDetails.PaymentProcessorId} payment with ID: {paymentDetails.PaymentId}.",
            exception.Message
        );
        _fixture
            .Mock<IDataService>()
            .Verify(
                ds =>
                    ds.DeleteById(
                        It.IsAny<InstanceIdentifier>(),
                        It.IsAny<Guid>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        _fixture.VerifyMocks();
    }

    [Theory]
    [InlineData(PaymentStatus.Paid)]
    [InlineData(PaymentStatus.Authorized)]
    public async Task StartPayment_StoresStatusAndReturnsAlreadyPaid_WhenProcessorRefusesToTerminateAPaymentThatHasGoneThrough(
        PaymentStatus processorStatus
    )
    {
        // Arrange
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentDetails chargedPaymentDetails = new() { PaymentId = "paymentId", RedirectUrl = "Charged redirect URL" };

        _fixture.Mock<IOrderDetailsCalculator>();
        SetupRefusedTermination(() => Task.FromResult((processorStatus, chargedPaymentDetails)));

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);
        var paymentService = sp.GetRequiredService<IPaymentService>();
        (PaymentInformation result, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        Assert.True(alreadyPaid);
        Assert.Equal(processorStatus, result.Status);
        Assert.Same(chargedPaymentDetails, result.PaymentDetails);
        Assert.Equal(processorStatus, await ReadStoredStatus(sp));
        _fixture
            .Mock<IPaymentProcessor>()
            .Verify(
                pp =>
                    pp.StartPayment(
                        It.IsAny<Instance>(),
                        It.IsAny<OrderDetails>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_KeepsTheNewerRecord_WhenTheWebhookStoredOneWhileTheProcessorWasAsked()
    {
        // The processor answers before the charge, and the webhook stores the charged payment before this saves.
        WrappedServiceProvider? provider = null;
        DataElement? paymentDataElement = null;
        _fixture.Mock<IOrderDetailsCalculator>();
        SetupRefusedTermination(async () =>
        {
            if (provider is not null && paymentDataElement is not null)
            {
                await provider
                    .GetRequiredService<IDataService>()
                    .UpdateJsonObject(
                        new InstanceIdentifier(_instance),
                        PaymentDataTypeId,
                        Guid.Parse(paymentDataElement.Id),
                        CreatePaymentInformation(PaymentStatus.Paid)
                    );
            }
            return (PaymentStatus.Authorized, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" });
        });

        await using var sp = _fixture.BuildServiceProvider();
        provider = sp;
        paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);
        // A copy, as the request read it: the fake Storage updates its own instance object on every write.
        Instance requestInstance = (await ReadInstance(sp)).Instance;
        (_, bool alreadyPaid) = await sp.GetRequiredService<IPaymentService>()
            .StartPayment(requestInstance, CreatePaymentConfiguration(), Language);

        Assert.True(alreadyPaid);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
        _fixture.VerifyMocks();
    }

    private void SetupRefusedTermination(Func<Task<(PaymentStatus, PaymentDetails)>> status)
    {
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(
                    It.Is<Instance>(instance => instance.Id == _instance.Id),
                    It.IsAny<PaymentInformation>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false)
            .Verifiable(Times.Once);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.Is<Instance>(instance => instance.Id == _instance.Id),
                    "paymentId",
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(status)
            .Verifiable(Times.Once);
    }

    [Fact]
    public async Task StartPayment_StartsNewPayment_WhenProcessorRefusesToTerminateAnAlreadyTerminatedPayment()
    {
        // Arrange
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        PaymentDetails paymentDetails =
            paymentInformation.PaymentDetails ?? throw new NullReferenceException("PaymentDetails should not be null");
        Guid dataElementId = Guid.Parse(SeedPaymentInformation(paymentInformation).Id);

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.TerminatePayment(_instance, It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false)
            .Verifiable(Times.Once);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    _instance,
                    paymentDetails.PaymentId,
                    paymentInformation.OrderDetails.TotalPriceIncVat,
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((PaymentStatus.Cancelled, paymentDetails))
            .Verifiable(Times.Once);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.DeleteById(
                    It.IsAny<InstanceIdentifier>(),
                    dataElementId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true)
            .Verifiable(Times.Once);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentDetails { PaymentId = "newPaymentId", RedirectUrl = "New redirect URL" })
            .Verifiable(Times.Once);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    PaymentDataTypeId,
                    It.IsAny<object>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new DataElement())
            .Verifiable(Times.Once);

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        (PaymentInformation result, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language
        );

        // Assert
        Assert.False(alreadyPaid);
        Assert.Equal(PaymentStatus.Created, result.Status);
        Assert.Equal("newPaymentId", result.PaymentDetails?.PaymentId);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = "paymentDataType" };

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.StartPayment(_instance, paymentConfiguration, Language)
        );

        Assert.Equal(
            "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation.",
            exception.Message
        );
    }

    [Fact]
    public async Task CheckPaymentStatus_DoesNotPersistUpdatedStatus()
    {
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();

        SetupPaymentProcessor(orderDetails);

        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (PaymentStatus.Paid, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "redirect url" })
            );

        await using var sp = _fixture.BuildServiceProvider();

        var dataService = sp.GetRequiredService<IDataService>();
        await dataService.InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);

        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentInformation? result = await paymentService.CheckPaymentStatus(
            _instance,
            paymentConfiguration,
            taskId: "Task_other",
            Language
        );

        result.Should().NotBeNull();
        result!.Status.Should().Be(PaymentStatus.Paid);

        // Status on disk should be unchanged.
        (_, PaymentInformation? stored) = await dataService.GetByType<PaymentInformation>(_instance, PaymentDataTypeId);
        stored.Should().NotBeNull();
        stored!.Status.Should().NotBe(PaymentStatus.Paid);

        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task CheckAndStorePaymentStatus_ShouldThrowPaymentException_WhenOrderDetailsCalculatorIsNull()
    {
        var paymentConfiguration = new AltinnPaymentConfiguration
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = "paymentReceiptPdfDataType",
        };

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        InstanceWithStorageMetadata fetchedInstance = await ReadInstance(sp);
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.CheckAndStorePaymentStatus(
                fetchedInstance,
                paymentConfiguration.Validate(),
                LanguageConst.En
            )
        );

        // Assert
        Assert.Equal(
            "You must add an implementation of the IOrderDetailsCalculator interface to the DI container. See payment related documentation.",
            exception.Message
        );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task IsPaymentCompleted_ShouldThrowPaymentException_WhenPaymentInformationNotFound()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();

        // Act & Assert
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        var exception = await Assert.ThrowsAsync<PaymentException>(async () =>
            await paymentService.GetPaymentStatus(_instance, paymentConfiguration)
        );
        Assert.Equal("Payment information not found.", exception.Message);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task GetPaymentStatus_ShouldReturn_CorrectStatus()
    {
        // Arrange
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = PaymentStatus.Paid;

        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.GetByType<PaymentInformation>(
                    _instance,
                    PaymentDataTypeId,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Guid.NewGuid(), paymentInformation));

        // Act
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        PaymentStatus result = await paymentService.GetPaymentStatus(_instance, paymentConfiguration);

        // Assert
        result.Should().Be(PaymentStatus.Paid);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_StoresPaymentInformation_WhenRequestIsCancelledAfterPaymentWasCreated()
    {
        // A payment that exists at the processor must always get its reference stored, or nothing could ever
        // terminate or verify it. The data service honours the token it is given, as the real client does.
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentDetails paymentDetails =
            CreatePaymentInformation().PaymentDetails
            ?? throw new NullReferenceException("PaymentDetails should not be null");
        using var cts = new CancellationTokenSource();

        SetupPaymentProcessor(orderDetails);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(p => p.StartPayment(_instance, orderDetails, Language, cts.Token))
            .ReturnsAsync(() =>
            {
                cts.Cancel();
                return paymentDetails;
            })
            .Verifiable(Times.Once);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.InsertJsonObject(
                    It.IsAny<InstanceIdentifier>(),
                    PaymentDataTypeId,
                    It.IsAny<PaymentInformation>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (
                    InstanceIdentifier _,
                    string _,
                    object _,
                    StorageAuthenticationMethod? _,
                    CancellationToken cancellationToken
                ) =>
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    return Task.FromResult(new DataElement());
                }
            )
            .Verifiable(Times.Once);

        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        (PaymentInformation paymentInformation, bool alreadyPaid) = await paymentService.StartPayment(
            _instance,
            paymentConfiguration,
            Language,
            cts.Token
        );

        paymentInformation.Status.Should().Be(PaymentStatus.Created);
        paymentInformation.PaymentDetails.Should().BeSameAs(paymentDetails);
        alreadyPaid.Should().BeFalse();
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task StartPayment_DeletesStalePaymentInformation_WhenRequestIsCancelledAfterPaymentWasTerminated()
    {
        // Once the processor has terminated the earlier payment, its record must be deleted even if the request
        // ends right then; left behind, the next attempt would try to terminate the same payment again. The
        // cancellable work that follows the deletion still observes the cancellation.
        OrderDetails orderDetails = CreateOrderDetails();
        ValidAltinnPaymentConfiguration paymentConfiguration = CreatePaymentConfiguration();
        PaymentInformation stalePaymentInformation = CreatePaymentInformation();
        using var cts = new CancellationTokenSource();

        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns(orderDetails.PaymentProcessorId);
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp => pp.TerminatePayment(_instance, It.IsAny<PaymentInformation>(), cts.Token))
            .ReturnsAsync(() =>
            {
                cts.Cancel();
                return true;
            })
            .Verifiable(Times.Once);
        SeedPaymentInformation(stalePaymentInformation);
        _fixture
            .Mock<IDataService>()
            .Setup(ds =>
                ds.DeleteById(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (InstanceIdentifier _, Guid _, StorageAuthenticationMethod? _, CancellationToken cancellationToken) =>
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    return Task.FromResult(true);
                }
            )
            .Verifiable(Times.Once);
        _fixture
            .Mock<IOrderDetailsCalculator>()
            .Setup(c => c.CalculateOrderDetails(_instance, Language, cts.Token))
            .Returns(
                (Instance _, string? _, CancellationToken cancellationToken) =>
                    Task.FromCanceled<OrderDetails>(cancellationToken)
            )
            .Verifiable(Times.Once);

        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            paymentService.StartPayment(_instance, paymentConfiguration, Language, cts.Token)
        );
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_StoresPaidAndMovesTheProcessOnAsTheServiceOwner()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() });

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        string result = await HandleWebhook(sp);

        Assert.Contains("The process moves on", result);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.Is<Instance>(instance => instance.Id == _instance.Id),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.Is<Actor>(actor =>
                            actor.OrgId == MockedServiceCollection.Org
                            && actor.UserId == null
                            && actor.Language == LanguageConst.Nb
                        ),
                        // Nexi gives the webhook 10 seconds, and the rest needs time after the last wait too.
                        _time.GetUtcNow().AddSeconds(8),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_MovesTheProcessOnInTheLanguageOfTheUserWhoPaid()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() });

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created, language: "en");

        await HandleWebhook(sp);

        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.Is<Actor>(actor => actor.Language == "en"),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotMoveTheProcessOn_WhenThePaymentIsNotPaid()
    {
        SetupWebhookProcessor(PaymentStatus.Authorized);
        _fixture.Mock<IProcessEngine>();

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        string result = await HandleWebhook(sp);

        Assert.Equal($"Payment status is Authorized for instance {_instance.Id}.", result);
        Assert.Equal(PaymentStatus.Authorized, await ReadStoredStatus(sp));
        _fixture.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotMoveTheProcessOn_WhenTheProcessHasMovedOn()
    {
        _instance.Process.CurrentTask = new ProcessElementInfo { AltinnTaskType = "data", ElementId = "Task_2" };
        SetupWebhookProcessor(PaymentStatus.Paid);
        _fixture.Mock<IProcessEngine>();

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        string result = await HandleWebhook(sp);

        Assert.Contains("has moved on from payment task Task_1", result);
        Assert.Equal(PaymentStatus.Created, await ReadStoredStatus(sp));
        _fixture.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotAskTheProcessor_WhenThePaymentWasSkipped()
    {
        _fixture.Mock<IPaymentProcessor>();
        _fixture.Mock<IProcessEngine>();

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Skipped);

        string result = await HandleWebhook(sp);

        Assert.Contains("Payment status is 'Skipped'", result);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        _fixture.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_WritesNothing_WhenTheStatusIsUnchanged()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() });

        await using var sp = _fixture.BuildServiceProvider();
        // The processor puts the language in the redirect URL, so asking without the payer's language would change it.
        await StorePaymentInformation(sp, PaymentStatus.Paid, language: LanguageConst.Nb);
        InstanceWithStorageMetadata before = await ReadInstance(sp);

        await HandleWebhook(sp);

        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        before.Metadata,
                        "confirm",
                        It.IsAny<Actor>(),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        Assert.Equal(before.Metadata, (await ReadInstance(sp)).Metadata);
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_StartsOverOnce_WhenTheRecordChangedBeforeTheSave()
    {
        // The other webhook stores its answer between this one's read and its save.
        int calls = 0;
        DataElement? paymentDataElement = null;
        WrappedServiceProvider? provider = null;
        SetupWebhookProcessor(
            PaymentStatus.Paid,
            async () =>
            {
                if (calls++ == 0 && provider is not null && paymentDataElement is not null)
                {
                    await provider
                        .GetRequiredService<IDataService>()
                        .UpdateJsonObject(
                            new InstanceIdentifier(_instance),
                            PaymentDataTypeId,
                            Guid.Parse(paymentDataElement.Id),
                            CreatePaymentInformation(PaymentStatus.Authorized)
                        );
                }
            }
        );
        SetupMoveOn(new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() });

        await using var sp = _fixture.BuildServiceProvider();
        provider = sp;
        paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);

        await HandleWebhook(sp);

        Assert.Equal(2, calls);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.IsAny<Actor>(),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Throws_WhenTheRecordKeepsChanging()
    {
        DataElement? paymentDataElement = null;
        WrappedServiceProvider? provider = null;
        SetupWebhookProcessor(
            PaymentStatus.Paid,
            async () =>
            {
                if (provider is not null && paymentDataElement is not null)
                {
                    await provider
                        .GetRequiredService<IDataService>()
                        .UpdateJsonObject(
                            new InstanceIdentifier(_instance),
                            PaymentDataTypeId,
                            Guid.Parse(paymentDataElement.Id),
                            CreatePaymentInformation(PaymentStatus.Authorized)
                        );
                }
            }
        );
        _fixture.Mock<IProcessEngine>();

        await using var sp = _fixture.BuildServiceProvider();
        provider = sp;
        paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);

        await Assert.ThrowsAsync<InstanceDataStaleException>(() => HandleWebhook(sp));
        Assert.Equal(PaymentStatus.Authorized, await ReadStoredStatus(sp));
        _fixture.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotStartOver_WhenTheRecordChangedAfterTheTimeWasUp()
    {
        int calls = 0;
        DataElement? paymentDataElement = null;
        WrappedServiceProvider? provider = null;
        SetupWebhookProcessor(
            PaymentStatus.Paid,
            async () =>
            {
                calls++;
                // Nets answered slowly, and the other webhook stored its answer meanwhile.
                _time.Advance(TimeSpan.FromSeconds(8));
                if (provider is not null && paymentDataElement is not null)
                {
                    await provider
                        .GetRequiredService<IDataService>()
                        .UpdateJsonObject(
                            new InstanceIdentifier(_instance),
                            PaymentDataTypeId,
                            Guid.Parse(paymentDataElement.Id),
                            CreatePaymentInformation(PaymentStatus.Authorized)
                        );
                }
            }
        );
        _fixture.Mock<IProcessEngine>();

        await using var sp = _fixture.BuildServiceProvider();
        provider = sp;
        paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);

        await Assert.ThrowsAsync<InstanceDataStaleException>(() => HandleWebhook(sp));
        Assert.Equal(1, calls);
        _fixture.Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_AnswersOk_WhenATransitionAlreadyHoldsTheInstance()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(
            new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ErrorMessage = "Processing",
                BlockingProcessStatus = Altinn.Platform.Storage.Interface.Enums.ProcessStatus.Processing,
            }
        );

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        string result = await HandleWebhook(sp);

        Assert.Contains("A transition is already moving the process", result);
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Throws_WhenTheProcessCannotMoveOn()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(
            new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorMessage = "Could not prepare the next process transition.",
            }
        );

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        await Assert.ThrowsAsync<PaymentException>(() => HandleWebhook(sp));
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_StartsTheTransitionOnceMore_WhenAChangeStoppedItFromStarting()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        List<StorageVersionMetadata> startedOn = [];
        List<DateTimeOffset> deadlines = [];
        int calls = 0;
        await using var sp = _fixture.BuildServiceProvider();
        DataElement paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);
        DateTimeOffset start = _time.GetUtcNow();
        SetupMoveOn()
            .Callback<Instance, StorageVersionMetadata, string, Actor, DateTimeOffset, CancellationToken>(
                (_, versions, _, _, deadline, _) =>
                {
                    startedOn.Add(versions);
                    deadlines.Add(deadline);
                    _time.Advance(TimeSpan.FromSeconds(3));
                }
            )
            .Returns(async () =>
            {
                if (calls++ > 0)
                {
                    return new ProcessChangeResult { Success = true, ProcessStateChange = new ProcessStateChange() };
                }

                // Something writes between the webhook's read and the transition's start, which supersedes it.
                await sp.GetRequiredService<IDataService>()
                    .UpdateJsonObject(
                        new InstanceIdentifier(_instance),
                        PaymentDataTypeId,
                        Guid.Parse(paymentDataElement.Id),
                        CreatePaymentInformation(PaymentStatus.Paid)
                    );
                return await CreateInstanceChangedResult(sp);
            });

        string result = await HandleWebhook(sp);

        Assert.Contains("The process moves on", result);
        Assert.Equal(2, startedOn.Count);
        // The second start is fenced on the instance as the change left it.
        Assert.NotEqual(startedOn[0], startedOn[1]);
        Assert.Equal((await ReadInstance(sp)).Metadata, startedOn[1]);
        // The second wait ends when the first would have, rather than getting time of its own.
        Assert.Equal([start.AddSeconds(8), start.AddSeconds(8)], deadlines);
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotStartTheTransitionOver_WhenNoTimeIsLeft()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);
        SetupMoveOn()
            .Returns(async () =>
            {
                // The wait for the transition used up the time Nexi gives the webhook.
                _time.Advance(TimeSpan.FromSeconds(8));
                return await CreateInstanceChangedResult(sp);
            });

        // Not answering lets Nets call again later, from a fresh read.
        await Assert.ThrowsAsync<PaymentException>(() => HandleWebhook(sp));
        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.IsAny<Actor>(),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Throws_WhenAnotherCallStartedADifferentTransition()
    {
        // The user's confirm on the same version of the instance got the transition, which may still not start.
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(
            new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Conflict,
                ProcessNextState = ProcessNextState.ConcurrentTransition,
            }
        );

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        // Nets calls again, and then finds the task over or moves it on.
        await Assert.ThrowsAsync<PaymentException>(() => HandleWebhook(sp));
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Throws_WhenChangesStopTheTransitionFromStartingTwice()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);
        SetupMoveOn().Returns(async () => await CreateInstanceChangedResult(sp));

        // Not answering lets Nets call again later, from a fresh read.
        await Assert.ThrowsAsync<PaymentException>(() => HandleWebhook(sp));
        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.IsAny<Actor>(),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Exactly(2)
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_DoesNotStartOver_WhenThePaymentIsNoLongerPaid()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        await using var sp = _fixture.BuildServiceProvider();
        DataElement paymentDataElement = await StorePaymentInformation(sp, PaymentStatus.Created);
        SetupMoveOn()
            .Returns(async () =>
            {
                await sp.GetRequiredService<IDataService>()
                    .UpdateJsonObject(
                        new InstanceIdentifier(_instance),
                        PaymentDataTypeId,
                        Guid.Parse(paymentDataElement.Id),
                        CreatePaymentInformation(PaymentStatus.Authorized)
                    );
                return await CreateInstanceChangedResult(sp);
            });

        string result = await HandleWebhook(sp);

        Assert.Equal($"Payment status is Authorized for instance {_instance.Id}.", result);
        _fixture
            .Mock<IProcessEngine>()
            .Verify(
                engine =>
                    engine.EnqueueNextForApp(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        "confirm",
                        It.IsAny<Actor>(),
                        It.IsAny<DateTimeOffset>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task HandlePaymentCompletedWebhook_Throws_WhenTheTransitionDoesNotStartInTime()
    {
        SetupWebhookProcessor(PaymentStatus.Paid);
        SetupMoveOn(
            new ProcessChangeResult
            {
                Success = false,
                ErrorType = ProcessErrorType.Internal,
                ErrorTitle = "The transition did not start in time.",
                WorkflowFailure = new WorkflowFailure { Kind = WorkflowFailureKind.Timeout },
            }
        );

        await using var sp = _fixture.BuildServiceProvider();
        await StorePaymentInformation(sp, PaymentStatus.Created);

        PaymentException exception = await Assert.ThrowsAsync<PaymentException>(() => HandleWebhook(sp));
        Assert.Contains("The transition did not start in time.", exception.Message);
        Assert.Equal(PaymentStatus.Paid, await ReadStoredStatus(sp));
    }

    private async Task<ProcessChangeResult> CreateInstanceChangedResult(WrappedServiceProvider sp)
    {
        InstanceWithStorageMetadata current = await ReadInstance(sp);
        return new ProcessChangeResult(current.Instance, current.Metadata)
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ProcessNextState = ProcessNextState.InstanceChanged,
        };
    }

    private void SetupWebhookProcessor(PaymentStatus status, Func<Task>? whileAsking = null)
    {
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "paymentId",
                    It.IsAny<decimal>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                async (Instance _, string _, decimal _, string? language, CancellationToken _) =>
                {
                    if (whileAsking is not null)
                    {
                        await whileAsking();
                    }
                    return (
                        status,
                        new PaymentDetails { PaymentId = "paymentId", RedirectUrl = RedirectUrl(language) }
                    );
                }
            );
    }

    /// <summary>
    /// The redirect URL the processor reports, which like Nets' carries the language it is asked in.
    /// </summary>
    private static string RedirectUrl(string? language) =>
        language is null ? "Redirect URL" : $"Redirect URL?language={language}";

    private void SetupMoveOn(ProcessChangeResult result) => SetupMoveOn().ReturnsAsync(result);

    private Moq.Language.Flow.ISetup<IProcessEngine, Task<ProcessChangeResult>> SetupMoveOn() =>
        _fixture
            .Mock<IProcessEngine>()
            .Setup(engine =>
                engine.EnqueueNextForApp(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    "confirm",
                    It.IsAny<Actor>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<CancellationToken>()
                )
            );

    /// <summary>
    /// Stores a payment record directly in the fake Storage, for tests that replace the data service with a mock.
    /// </summary>
    private DataElement SeedPaymentInformation(PaymentInformation paymentInformation) =>
        _fixture.Storage.AddData(
            _instance,
            PaymentDataTypeId,
            "application/json",
            System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                paymentInformation,
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
            )
        );

    private async Task<DataElement> StorePaymentInformation(
        WrappedServiceProvider sp,
        PaymentStatus status,
        string? language = null
    )
    {
        PaymentInformation paymentInformation = CreatePaymentInformation(status);
        paymentInformation.Language = language;
        paymentInformation.PaymentDetails = new PaymentDetails
        {
            PaymentId = "paymentId",
            RedirectUrl = RedirectUrl(language),
        };
        return await sp.GetRequiredService<IDataService>()
            .InsertJsonObject(new InstanceIdentifier(_instance), PaymentDataTypeId, paymentInformation);
    }

    private async Task<InstanceWithStorageMetadata> ReadInstance(WrappedServiceProvider sp) =>
        await sp.GetRequiredService<IInstanceClientWithStorageMetadata>()
            .GetInstanceWithStorageMetadata(
                _instance,
                StorageAuthenticationMethod.ServiceOwner(),
                CancellationToken.None
            );

    private async Task<PaymentStatus?> ReadStoredStatus(WrappedServiceProvider sp)
    {
        InstanceWithStorageMetadata current = await ReadInstance(sp);
        (_, PaymentInformation? paymentInformation) = await sp.GetRequiredService<IDataService>()
            .GetByType<PaymentInformation>(current.Instance, PaymentDataTypeId);
        return paymentInformation?.Status;
    }

    private async Task<string> HandleWebhook(WrappedServiceProvider sp) =>
        await sp.GetRequiredService<IPaymentService>()
            .HandlePaymentCompletedWebhook(await ReadInstance(sp), CreatePaymentConfiguration());

    private static PaymentInformation CreatePaymentInformation(PaymentStatus status)
    {
        PaymentInformation paymentInformation = CreatePaymentInformation();
        paymentInformation.Status = status;
        return paymentInformation;
    }

    [Theory]
    [InlineData(null)]
    [InlineData(PaymentStatus.Skipped)]
    [InlineData(PaymentStatus.Cancelled)]
    [InlineData(PaymentStatus.Failed)]
    public async Task PrepareAbandon_PaymentThatCannotComplete_CanAbandonWithoutContactingProcessor(
        PaymentStatus? storedStatus
    )
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(storedStatus);
        _fixture.Mock<IPaymentProcessor>();

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.CanAbandon, outcome);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        VerifyNoPaymentUpdate(dataMutator);
    }

    [Fact]
    public async Task PrepareAbandon_StoredPaid_IsAlreadyPaidWithoutContactingProcessor()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Paid);
        _fixture.Mock<IPaymentProcessor>();

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.AlreadyPaid, outcome);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
        VerifyNoPaymentUpdate(dataMutator);
    }

    [Theory]
    [InlineData(PaymentStatus.Created)]
    [InlineData(PaymentStatus.Authorized)]
    public async Task PrepareAbandon_ProcessorTerminatesPayment_StoresCancelledAndCanAbandon(PaymentStatus storedStatus)
    {
        var (dataMutator, paymentDataElement) = CreateDataMutatorWithPayment(storedStatus);
        SetupTerminate(terminated: true);

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.CanAbandon, outcome);
        Assert.Equal(PaymentStatus.Cancelled, GetUpdatedStatus(dataMutator, paymentDataElement));
        _fixture.VerifyMocks();
    }

    [Theory]
    [InlineData(PaymentStatus.Paid, true)]
    [InlineData(PaymentStatus.Authorized, true)]
    [InlineData(PaymentStatus.Cancelled, false)]
    [InlineData(PaymentStatus.Failed, false)]
    public async Task PrepareAbandon_ProcessorRefusesToTerminate_StoresTheStatusItReports(
        PaymentStatus processorStatus,
        bool alreadyPaid
    )
    {
        PaymentAbandonOutcome expectedOutcome = alreadyPaid
            ? PaymentAbandonOutcome.AlreadyPaid
            : PaymentAbandonOutcome.CanAbandon;
        var (dataMutator, paymentDataElement) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() => (processorStatus, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" }));

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(expectedOutcome, outcome);
        Assert.Equal(processorStatus, GetUpdatedStatus(dataMutator, paymentDataElement));
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorRefusesToTerminateAPaymentThatHasNotGoneThrough_IsNotTerminated()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() =>
            (PaymentStatus.Created, new PaymentDetails { PaymentId = "paymentId", RedirectUrl = "" })
        );

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.NotTerminated, outcome);
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorUnreachableOnTerminate_IsPaymentProcessorFailed()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(It.IsAny<Instance>(), It.IsAny<PaymentInformation>(), It.IsAny<CancellationToken>())
            )
            .ThrowsAsync(new HttpRequestException("Connection refused"))
            .Verifiable(Times.Once);

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.PaymentProcessorFailed, outcome);
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_ProcessorUnreachableOnStatus_IsPaymentProcessorFailed()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        SetupTerminate(terminated: false);
        SetupProcessorStatus(() => throw new PaymentException("Failed to retrieve payment"));

        PaymentAbandonOutcome outcome = await PrepareAbandon(dataMutator.Object);

        Assert.Equal(PaymentAbandonOutcome.PaymentProcessorFailed, outcome);
        VerifyNoPaymentUpdate(dataMutator);
        _fixture.VerifyMocks();
    }

    [Fact]
    public async Task PrepareAbandon_UnknownPaymentProcessor_ThrowsInsteadOfAskingForARetry()
    {
        var (dataMutator, _) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("anotherProcessor");

        PaymentException exception = await Assert.ThrowsAsync<PaymentException>(() =>
            PrepareAbandon(dataMutator.Object)
        );

        Assert.Equal("Payment processor with ID 'paymentProcessorId' not found.", exception.Message);
        VerifyNoPaymentUpdate(dataMutator);
    }

    [Fact]
    public async Task PrepareAbandon_MissingPaymentDetails_ThrowsInsteadOfAskingForARetry()
    {
        var (dataMutator, paymentDataElement) = CreateDataMutatorWithPayment(PaymentStatus.Created);
        PaymentInformation withoutDetails = CreatePaymentInformation();
        withoutDetails.PaymentDetails = null;
        dataMutator
            .Setup(x => x.GetBinaryData(paymentDataElement))
            .ReturnsAsync(
                System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                    withoutDetails,
                    new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
                )
            );
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");

        PaymentException exception = await Assert.ThrowsAsync<PaymentException>(() =>
            PrepareAbandon(dataMutator.Object)
        );

        Assert.Equal("Payment details unexpectedly missing from payment information.", exception.Message);
        _fixture.Mock<IPaymentProcessor>().Verify(pp => pp.PaymentProcessorId);
        _fixture.Mock<IPaymentProcessor>().VerifyNoOtherCalls();
    }

    private async Task<PaymentAbandonOutcome> PrepareAbandon(IInstanceDataMutator dataMutator)
    {
        await using var sp = _fixture.BuildServiceProvider();
        var paymentService = sp.GetRequiredService<IPaymentService>();
        return await paymentService.PrepareAbandon(dataMutator, CreatePaymentConfiguration());
    }

    private (Mock<IInstanceDataMutator> DataMutator, DataElement PaymentDataElement) CreateDataMutatorWithPayment(
        PaymentStatus? status
    )
    {
        var paymentDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = PaymentDataTypeId,
            ContentType = "application/json",
        };
        var instance = new Instance
        {
            Id = _instance.Id,
            AppId = _instance.AppId,
            Process = _instance.Process,
            Data = status is null ? [] : [paymentDataElement],
        };
        var dataMutator = new Mock<IInstanceDataMutator>();
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.Language).Returns(Language);
        if (status is { } storedStatus)
        {
            PaymentInformation paymentInformation = CreatePaymentInformation();
            paymentInformation.Status = storedStatus;
            dataMutator
                .Setup(x => x.GetBinaryData(paymentDataElement))
                .ReturnsAsync(
                    System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                        paymentInformation,
                        new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
                    )
                );
        }

        return (dataMutator, paymentDataElement);
    }

    private void SetupTerminate(bool terminated)
    {
        _fixture.Mock<IPaymentProcessor>().Setup(pp => pp.PaymentProcessorId).Returns("paymentProcessorId");
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.TerminatePayment(
                    It.IsAny<Instance>(),
                    It.Is<PaymentInformation>(p =>
                        p.PaymentDetails != null && p.PaymentDetails.PaymentId == "paymentId"
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(terminated)
            .Verifiable(Times.Once);
    }

    private void SetupProcessorStatus(Func<(PaymentStatus, PaymentDetails)> status) =>
        _fixture
            .Mock<IPaymentProcessor>()
            .Setup(pp =>
                pp.GetPaymentStatus(
                    It.IsAny<Instance>(),
                    "paymentId",
                    It.IsAny<decimal>(),
                    Language,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(status)
            .Verifiable(Times.Once);

    private static PaymentStatus GetUpdatedStatus(
        Mock<IInstanceDataMutator> dataMutator,
        DataElement paymentDataElement
    )
    {
        IInvocation update = Assert.Single(
            dataMutator.Invocations,
            invocation => invocation.Method.Name == nameof(IInstanceDataMutator.UpdateBinaryDataElement)
        );
        Assert.Equal(paymentDataElement.Id, ((DataElementIdentifier)update.Arguments[0]).Id);
        Assert.Equal("application/json", update.Arguments[1]);
        PaymentInformation storedPaymentInformation =
            System.Text.Json.JsonSerializer.Deserialize<PaymentInformation>(
                ((ReadOnlyMemory<byte>)update.Arguments[2]).Span,
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
            ) ?? throw new InvalidOperationException("Stored payment information is null");
        return storedPaymentInformation.Status;
    }

    private static void VerifyNoPaymentUpdate(Mock<IInstanceDataMutator> dataMutator) =>
        dataMutator.Verify(
            x =>
                x.UpdateBinaryDataElement(
                    It.IsAny<DataElementIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<ReadOnlyMemory<byte>>()
                ),
            Times.Never
        );

    private static PaymentInformation CreatePaymentInformation()
    {
        return new PaymentInformation
        {
            TaskId = "Task_1",
            Status = PaymentStatus.Created,
            OrderDetails = new OrderDetails
            {
                PaymentProcessorId = "paymentProcessorId",
                Currency = "NOK",
                OrderLines = [],
                Receiver = new PaymentReceiver(),
            },
            PaymentDetails = new PaymentDetails { RedirectUrl = "Redirect URL", PaymentId = "paymentId" },
        };
    }

    private static OrderDetails CreateOrderDetails()
    {
        return new OrderDetails()
        {
            PaymentProcessorId = "paymentProcessorId",
            Currency = "NOK",
            OrderLines =
            [
                new PaymentOrderLine
                {
                    Id = "001",
                    Name = "Fee",
                    PriceExVat = 1000,
                    VatPercent = 25,
                },
            ],
            Receiver = new PaymentReceiver(),
        };
    }

    private static ValidAltinnPaymentConfiguration CreatePaymentConfiguration()
    {
        return new AltinnPaymentConfiguration
        {
            PaymentDataType = PaymentDataTypeId,
            PaymentReceiptPdfDataType = "paymentReceiptPdf",
        }.Validate();
    }
}
