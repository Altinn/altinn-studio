#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class OrganizationNumberTests
{
    private static readonly string[] _validOrganizationNumbers = IdentificationNumberProvider
        .OrganizationNumbers
        .ValidOrganizationNumbers;

    private static readonly string[] _invalidOrganizationNumbers = IdentificationNumberProvider
        .OrganizationNumbers
        .InvalidOrganizationNumbers;

    [Fact]
    public void Parse_ValidNumber_ShouldReturnOrganizationNumber()
    {
        foreach (var validOrgNumber in _validOrganizationNumbers)
        {
            var orgNumber = OrganizationNumber.Parse(validOrgNumber);
            var orgNumberLocal = orgNumber.Get(OrganizationNumberFormat.Local);
            var orgNumberInternational = orgNumber.Get(OrganizationNumberFormat.International);

            orgNumberLocal.Should().Be(validOrgNumber);
            orgNumberInternational.Should().Be($"0192:{validOrgNumber}");
        }
    }

    [Fact]
    public void Parse_InvalidNumber_ShouldThrowFormatException()
    {
        foreach (var invalidOrgNumber in _invalidOrganizationNumbers)
        {
            Action act = () => OrganizationNumber.Parse(invalidOrgNumber);
            act.Should().Throw<FormatException>();
        }
    }

    [Fact]
    public void Equals_SameNumber_ShouldReturnTrue()
    {
        // Arrange
        var stringValueLocal = _validOrganizationNumbers[0];
        var stringValueInternational = $"0192:{stringValueLocal}";
        var number1 = OrganizationNumber.Parse(stringValueLocal);
        var number2 = OrganizationNumber.Parse(stringValueLocal);

        // Act
        bool result1 = number1.Equals(number2);
        bool result2 = number1 == number2;
        bool result3 = number1 != number2;
        bool result4 = number1.Equals(stringValueLocal);
        bool result5 = number1 == stringValueLocal;
        bool result6 = number1 != stringValueLocal;
        bool result7 = number1.Equals(stringValueInternational);
        bool result8 = number1 == stringValueInternational;
        bool result9 = number1 != stringValueInternational;
        bool result10 = stringValueLocal == number1;
        bool result11 = stringValueLocal != number1;
        bool result12 = stringValueInternational == number1;
        bool result13 = stringValueInternational != number1;

        // Assert
        result1.Should().BeTrue();
        result2.Should().BeTrue();
        result3.Should().BeFalse();
        result4.Should().BeTrue();
        result5.Should().BeTrue();
        result6.Should().BeFalse();
        result7.Should().BeTrue();
        result8.Should().BeTrue();
        result9.Should().BeFalse();
        result10.Should().BeTrue();
        result11.Should().BeFalse();
        result12.Should().BeTrue();
        result13.Should().BeFalse();
    }

    [Fact]
    public void Equals_DifferentNumber_ShouldReturnFalse()
    {
        // Arrange
        var stringValue1 = _validOrganizationNumbers[0];
        var stringValue2 = _validOrganizationNumbers[1];
        var number1 = OrganizationNumber.Parse(stringValue1);
        var number2 = OrganizationNumber.Parse(stringValue2);

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
    public void ToString_ShouldReturnLocalFormat()
    {
        // Arrange
        var rawLocal = _validOrganizationNumbers[0];
        var number = OrganizationNumber.Parse(rawLocal);

        // Act
        var stringified1 = number.ToString();
        var stringified2 = $"{number}";

        // Assert
        stringified1.Should().Be(rawLocal);
        stringified2.Should().Be(rawLocal);
    }
}
