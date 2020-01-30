using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Altinn.Platform.Register.Models;

using Xunit;

namespace Altinn.Platform.Register.IntegrationTest.TestingModels
{
    public class PartyLookupValidationTests
    {
        [Fact]
        public void NoPropertiesSet_ReturnsIssue()
        {
            // Arrange
            PartyLookup target = new PartyLookup();

            // Act
            IList<ValidationResult> issues = ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("At least one")));
        }

        [Fact]
        public void TwoPropertiesSet_ReturnsIssue()
        {
            // Arrange
            PartyLookup target = new PartyLookup { Ssn = "09054300139", OrgNo = "910072218" };

            // Act
            IList<ValidationResult> issues = ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("With Ssn already")));
        }

        [Theory]
        [InlineData("23")]
        [InlineData("123456789012")]
        public void SsnWrongLength(string ssn)
        {
            // Arrange
            PartyLookup target = new PartyLookup { Ssn = ssn };

            // Act
            IList<ValidationResult> issues = ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("Ssn") && i.ErrorMessage.Contains("minimum length of")));
        }

        [Theory]
        [InlineData("23")]
        [InlineData("123456789012")]
        public void OrgNoWrongLength(string orgNo)
        {
            // Arrange
            PartyLookup target = new PartyLookup { OrgNo = orgNo};

            // Act
            IList<ValidationResult> issues = ValidateModel(target);

            // Assert
            Assert.True(issues.All(i => i.MemberNames.Contains("OrgNo") && i.ErrorMessage.Contains("maximum length of")));
        }


        private IList<ValidationResult> ValidateModel(object model)
        {
            List<ValidationResult> validationResults = new List<ValidationResult>();
            ValidationContext ctx = new ValidationContext(model, null, null);
            Validator.TryValidateObject(model, ctx, validationResults, true);
            return validationResults;
        }
    }
}
