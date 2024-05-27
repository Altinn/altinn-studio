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

    [Fact]
    public void Validation_Succeeds()
    {
        var paymentDataType = "paymentDataType";
        AltinnPaymentConfiguration paymentConfiguration = new() { PaymentDataType = paymentDataType };
        paymentConfiguration.PaymentDataType.Should().Be(paymentDataType);

        var validPaymentConfiguration = paymentConfiguration.Validate();
        validPaymentConfiguration.PaymentDataType.Should().Be(paymentDataType);
    }
}
