using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Payment;

public class AltinnPaymentConfigurationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void Validation_ThrowsException_When_PaymentDataType_Is_Invalid(string? paymentDataType)
    {
        AltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = paymentDataType };

        var action = () => paymentConfiguration.Validate();

        action.Should().Throw<ApplicationConfigException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void Validation_ThrowsException_When_PaymentReceiptPdfDataType_Is_Invalid(string? paymentReceiptPdfDataType)
    {
        AltinnPaymentConfiguration paymentConfiguration = new()
        {
            PaymentDataType = "paymentDataType",
            PaymentReceiptPdfDataType = paymentReceiptPdfDataType,
        };

        var action = () => paymentConfiguration.Validate();

        action.Should().Throw<ApplicationConfigException>();
    }

    [Fact]
    public void Validation_Succeeds()
    {
        var paymentDataType = "paymentDataType";
        var paymentReceiptPdfDataType = "paymentReceiptPdfDataType";
        AltinnPaymentConfiguration paymentConfiguration = new()
        {
            PaymentDataType = paymentDataType,
            PaymentReceiptPdfDataType = paymentReceiptPdfDataType,
        };

        paymentConfiguration.PaymentDataType.Should().Be(paymentDataType);
        paymentConfiguration.PaymentReceiptPdfDataType.Should().Be(paymentReceiptPdfDataType);

        var validPaymentConfiguration = paymentConfiguration.Validate();
        validPaymentConfiguration.PaymentDataType.Should().Be(paymentDataType);
        validPaymentConfiguration.PaymentReceiptPdfDataType.Should().Be(paymentReceiptPdfDataType);
    }
}
