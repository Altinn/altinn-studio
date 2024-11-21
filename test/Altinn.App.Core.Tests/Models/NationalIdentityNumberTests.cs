#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models;

public class NationalIdentityNumberTests
{
    internal static readonly string[] ValidNationalIdentityNumbers =
    [
        "13896396174",
        "29896695590",
        "21882448425",
        "03917396654",
        "61875300317",
        "60896400498",
        "65918300265",
        "22869798367",
        "02912447718",
        "22909397689",
        "26267892619",
        "12318496828",
        "20270310266",
        "10084808933",
        "09113920472",
        "28044017069",
        "18055606346",
        "24063324295",
        "16084521195",
    ];

    internal static readonly string[] InvalidNationalIdentityNumbers =
    [
        "13816396174",
        "29896795590",
        "21883418425",
        "03917506654",
        "61175310317",
        "60996410498",
        "65918310265",
        "22869898467",
        "02912447719",
        "22909397680",
        "26270892619",
        "12318696828",
        "20289310266",
        "11084808933",
        "08113921472",
        "28044417069",
        "180556f6346",
        "240633242951",
        "1234",
    ];

    [Fact]
    public void Parse_ValidNumber_ShouldReturnOrganisationNumber()
    {
        foreach (var validNumber in ValidNationalIdentityNumbers)
        {
            var number = NationalIdentityNumber.Parse(validNumber);
            number.Value.Should().Be(validNumber);
        }
    }

    [Fact]
    public void Parse_InvalidNumber_ShouldThrowFormatException()
    {
        foreach (var invalidNumber in InvalidNationalIdentityNumbers)
        {
            Action act = () => NationalIdentityNumber.Parse(invalidNumber);
            act.Should().Throw<FormatException>();
        }
    }

    // [Fact]
    // public void TryParse_ValidNumber_ShouldReturnTrue()
    // {
    //     foreach (var validOrgNumber in ValidNationalIdentityNumbers)
    //     {
    //         OrganisationNumber.TryParse(validOrgNumber, out var parsed).Should().BeTrue();
    //         parsed.Get(OrganisationNumberFormat.Local).Should().Be(validOrgNumber);
    //     }
    // }
    //
    // [Fact]
    // public void TryParse_InvalidNumber_ShouldReturnFalse()
    // {
    //     foreach (var invalidOrgNumber in InvalidNationalIdentityNumbers)
    //     {
    //         OrganisationNumber.TryParse(invalidOrgNumber, out _).Should().BeFalse();
    //     }
    // }
    //
    // [Fact]
    // public void Equals_SameNumber_ShouldReturnTrue()
    // {
    //     // Arrange
    //     var number1 = OrganisationNumber.Parse(ValidNationalIdentityNumbers[0]);
    //     var number2 = OrganisationNumber.Parse(ValidNationalIdentityNumbers[0]);
    //
    //     // Act
    //     bool result1 = number1.Equals(number2);
    //     bool result2 = number1 == number2;
    //     bool result3 = number1 != number2;
    //
    //     // Assert
    //     result1.Should().BeTrue();
    //     result2.Should().BeTrue();
    //     result3.Should().BeFalse();
    // }
    //
    // [Fact]
    // public void Equals_DifferentNumber_ShouldReturnFalse()
    // {
    //     // Arrange
    //     var number1 = OrganisationNumber.Parse(ValidNationalIdentityNumbers[0]);
    //     var number2 = OrganisationNumber.Parse(ValidNationalIdentityNumbers[1]);
    //
    //     // Act
    //     bool result1 = number1.Equals(number2);
    //     bool result2 = number1 == number2;
    //     bool result3 = number1 != number2;
    //
    //     // Assert
    //     result1.Should().BeFalse();
    //     result2.Should().BeFalse();
    //     result3.Should().BeTrue();
    // }
    //
    // [Fact]
    // public void ToString_ShouldReturnLocalFormat()
    // {
    //     // Arrange
    //     var rawLocal = ValidNationalIdentityNumbers[0];
    //     var number = OrganisationNumber.Parse(rawLocal);
    //
    //     // Act
    //     var stringified1 = number.ToString();
    //     var stringified2 = $"{number}";
    //
    //     // Assert
    //     stringified1.Should().Be(rawLocal);
    //     stringified2.Should().Be(rawLocal);
    // }
    //
    // [Fact]
    // public void GetMethod_ShouldReturnCorrectFormats()
    // {
    //     // Arrange
    //     var rawLocal = ValidNationalIdentityNumbers[0];
    //     var number = OrganisationNumber.Parse(rawLocal);
    //
    //     // Act
    //     var stringified1 = number.Get(OrganisationNumberFormat.Local);
    //     var stringified2 = number.Get(OrganisationNumberFormat.International);
    //
    //     // Assert
    //     stringified1.Should().Be(rawLocal);
    //     stringified2.Should().Be($"0192:{rawLocal}");
    // }
    //
    // [Fact]
    // public void ImplicitConversion_ShouldReturnFullTokenString()
    // {
    //     // Arrange
    //     var token = AccessToken.Parse(_validTokens[0]);
    //
    //     // Act
    //     string tokenString = token;
    //
    //     // Assert
    //     tokenString.Should().Be(_validTokens[0]);
    // }
}
