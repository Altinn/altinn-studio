using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Xunit;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Model;

namespace Designer.Tests.Helpers
{
    public class ResourceAdminHelperTest
    {
        [Fact]
        public async Task ValidateServiceResource_IsValid()
        {
            //Arrange
            string expectedResult = "Validation of resource completed. Resource is valid";

            List <Keyword> keywords = new List<Keyword>();
            Keyword keyword = new Keyword { Language = "No", Word = "test" };
            keywords.Add(keyword);

            ServiceResource resource = new ServiceResource
            {
                Identifier = "testresource",
                Title = new Dictionary<string, string> { { "en", "test" }, { "nb", "test" }, { "nn", "test" } },
                Description = new Dictionary<string, string> { { "en", "test" }, { "nb", "test" }, { "nn", "test" } },
                RightDescription = new Dictionary<string, string> { { "en", "test" }, { "nb", "test" }, { "nn", "test" } },
                Homepage = "test.no",
                Status = string.Empty,
                ValidFrom = new DateTime(),
                ValidTo = new DateTime(),
                IsPartOf = string.Empty,
                IsPublicService = true,
                ThematicArea = string.Empty,
                ResourceReferences = new List<ResourceReference> { new ResourceReference { Reference = string.Empty, ReferenceSource = ReferenceSource.Default, ReferenceType = ReferenceType.Default } },
                IsComplete = true,
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                Keywords = keywords,
                Sector = new List<string>(),
                ResourceType = ResourceType.Default,
                MainLanguage = "en-US",
            };

            //Act
            string result = ResourceAdminHelper.ValidateServiceResource(resource, false);

            //Assert
            Assert.Equal(result, expectedResult);
        }

        [Fact]
        public async Task ValidateServiceResource_IsInvalid()
        {
            //Arrange
            string expectedResult = "Validation of resource failed because of missing attribute(s)";

            List<Keyword> keywords = new List<Keyword>();
            Keyword keyword = new Keyword { Language = "No", Word = "test" };
            keywords.Add(keyword);

            ServiceResource resource = new ServiceResource
            {
                Identifier = "testresource",
                Title = new Dictionary<string, string> { { "en", "test" }, { "nb", "test" }, { "nn", "test" } },
                Description = new Dictionary<string, string>(),
                RightDescription = new Dictionary<string, string>(),
                Homepage = "test.no",
                Status = string.Empty,
                ValidFrom = new DateTime(),
                ValidTo = new DateTime(),
                IsPartOf = string.Empty,
                IsPublicService = true,
                ThematicArea = string.Empty,
                ResourceReferences = new List<ResourceReference> { new ResourceReference { Reference = string.Empty, ReferenceSource = ReferenceSource.Default, ReferenceType = ReferenceType.Default } },
                IsComplete = true,
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                Keywords = keywords,
                Sector = new List<string>(),
                ResourceType = ResourceType.Default,
                MainLanguage = "en-US",
            };

            //Act
            string result = ResourceAdminHelper.ValidateServiceResource(resource, false);

            //Assert
            Assert.Equal(result, expectedResult);
        }
    }
}
