#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class NationalIdentityNumberTests
{
    private static readonly string[] _validNationalIdentityNumbers = IdentificationNumberProvider
        .NationalIdentityNumbers
        .ValidNationalIdentityNumbers;

    private static readonly string[] _invalidNationalIdentityNumbers = IdentificationNumberProvider
        .NationalIdentityNumbers
        .InvalidNationalIdentityNumbers;

    [Fact]
    public void Parse_ValidNumber_ShouldReturnNationalIdentityNumber()
    {
        foreach (var validNumber in _validNationalIdentityNumbers)
        {
            var number = NationalIdentityNumber.Parse(validNumber);
            number.Value.Should().Be(validNumber);
        }
    }

    [Fact]
    public void Parse_InvalidNumber_ShouldThrowFormatException()
    {
        foreach (var invalidNumber in _invalidNationalIdentityNumbers)
        {
            Action act = () => NationalIdentityNumber.Parse(invalidNumber);
            act.Should().Throw<FormatException>();
        }
    }

    [Fact]
    public void Equals_SameNumber_ShouldReturnTrue()
    {
        // Arrange
        var stringValue = _validNationalIdentityNumbers[0];
        var number1 = NationalIdentityNumber.Parse(stringValue);
        var number2 = NationalIdentityNumber.Parse(stringValue);

        // Act
        bool result1 = number1.Equals(number2);
        bool result2 = number1 == number2;
        bool result3 = number1 != number2;
        bool result4 = number1.Equals(stringValue);
        bool result5 = number1 == stringValue;
        bool result6 = number1 != stringValue;
        bool result7 = stringValue == number1;
        bool result8 = stringValue != number1;

        // Assert
        result1.Should().BeTrue();
        result2.Should().BeTrue();
        result3.Should().BeFalse();
        result4.Should().BeTrue();
        result5.Should().BeTrue();
        result6.Should().BeFalse();
        result7.Should().BeTrue();
        result8.Should().BeFalse();
    }

    [Fact]
    public void Equals_DifferentNumber_ShouldReturnFalse()
    {
        // Arrange
        var stringValue1 = _validNationalIdentityNumbers[0];
        var stringValue2 = _validNationalIdentityNumbers[1];
        var number1 = NationalIdentityNumber.Parse(stringValue1);
        var number2 = NationalIdentityNumber.Parse(stringValue2);

        // Act
        bool result1 = number1.Equals(number2);
        bool result2 = number1 == number2;
        bool result3 = number1 != number2;
        bool result4 = number1.Equals(stringValue2);
        bool result5 = number1 == stringValue2;
        bool result6 = number1 != stringValue2;

        // Assert
        result1.Should().BeFalse();
        result2.Should().BeFalse();
        result3.Should().BeTrue();
        result4.Should().BeFalse();
        result5.Should().BeFalse();
        result6.Should().BeTrue();
    }

    [Fact]
    public void ToString_ShouldReturnCorrectValue()
    {
        // Arrange
        var stringValue = _validNationalIdentityNumbers[0];
        var number = NationalIdentityNumber.Parse(stringValue);

        // Act
        var stringified1 = number.ToString();
        var stringified2 = $"{number}";

        // Assert
        stringified1.Should().Be(stringValue);
        stringified2.Should().Be(stringValue);
    }
}
