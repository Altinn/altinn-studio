using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

using Altinn.Platform.Register.Models;

using Xunit;

namespace Altinn.Platform.Models.Tests.Register
{
    public class PartyLookupValidationTests
    {
        [Fact]
        public void NoPropertiesSet_ReturnsIssue()
        {
            // Arrange
            PartyLookup target = new PartyLookup();

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("At least one")));
        }

        [Fact]
        public void TwoPropertiesSet_ReturnsIssue()
        {
            // Arrange
            PartyLookup target = new PartyLookup { Ssn = "09054300139", OrgNo = "910072218" };

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("With Ssn already")));
        }

        [Theory]
        [InlineData("1234567890")]
        [InlineData("123456789012")]
        [InlineData("F2345678901")]
        public void SsnInvalid(string ssn)
        {
            // Arrange
            PartyLookup target = new PartyLookup { Ssn = ssn };

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("Ssn") && i.ErrorMessage.Contains("exactly 11 digits")));
        }

        [Theory]
        [InlineData("12345678")]
        [InlineData("1234567890")]
        [InlineData("F23456789")]
        public void OrgNoInvalid(string orgNo)
        {
            // Arrange
            PartyLookup target = new PartyLookup { OrgNo = orgNo };

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("exactly 9 digits")));
        }

        [Theory]
        [InlineData("09054300139")]
        [InlineData("27036702163")]
        public void SsnIsValid(string ssn)
        {
            // Arrange
            PartyLookup target = new PartyLookup { Ssn = ssn };

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.Empty(issues);
        }

        [Theory]
        [InlineData("910072218")]
        [InlineData("810999012")]
        public void OrgNoIsValid(string orgNo)
        {
            // Arrange
            PartyLookup target = new PartyLookup { OrgNo = orgNo };

            // Act
            IList<ValidationResult> issues = ModelValidator.ValidateModel(target);

            // Assert
            Assert.Empty(issues);
        }
    }
}
