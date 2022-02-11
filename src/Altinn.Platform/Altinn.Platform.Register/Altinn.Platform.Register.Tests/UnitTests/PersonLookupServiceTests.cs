using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Register.Core;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Register.Services.Interfaces;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Altinn.Platform.Register.Tests.UnitTests
{
    public class PersonLookupServiceTests
    {
        private readonly Mock<IParties> parties;
        private readonly Mock<IOptions<PersonLookupSettings>> settingsMock;
        private readonly Mock<ILogger<PersonLookupService>> logger;

        private readonly MemoryCache memoryCache;
        private readonly PersonLookupSettings lookupSettings;

        public PersonLookupServiceTests()
        {
            parties = new Mock<IParties>();
            lookupSettings = new PersonLookupSettings();

            settingsMock = new Mock<IOptions<PersonLookupSettings>>();
            settingsMock.Setup(s => s.Value).Returns(lookupSettings);

            memoryCache = new MemoryCache(new MemoryCacheOptions());
            logger = new Mock<ILogger<PersonLookupService>>();
        }

        [Fact]
        public async Task GetPerson_NoFailedAttempts_CorrectInput_ReturnsParty()
        {
            // Arrange
            Party party = new Party
            {
                Person = new Person
                {
                    LastName = "lastname"
                }
            };
            parties.Setup(s => s.LookupPartyBySSNOrOrgNo(It.IsAny<string>())).ReturnsAsync(party);

            var target = new PersonLookupService(parties.Object, settingsMock.Object, memoryCache, logger.Object);

            // Act
            var actual = await target.GetPerson("personnumber", "lastname", 777);

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(0, memoryCache.Get<int>("Person-Lookup-Failed-Attempts777"));
        }

        [Fact]
        public async Task GetPerson_OneFailedAttempt_MoreToGo_CorrectInput_ReturnsParty()
        {
            // Arrange
            Party party = new Party
            {
                Person = new Person
                {
                    LastName = "lastname"
                }
            };
            parties.Setup(s => s.LookupPartyBySSNOrOrgNo(It.IsAny<string>())).ReturnsAsync(party);
            memoryCache.Set("Person-Lookup-Failed-Attempts777", 1);
            lookupSettings.MaximumFailedAttempts = 2;

            var target = new PersonLookupService(parties.Object, settingsMock.Object, memoryCache, logger.Object);

            // Act
            var actual = await target.GetPerson("personnumber", "lastname", 777);

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(1, memoryCache.Get<int>("Person-Lookup-Failed-Attempts777"));
        }

        [Fact]
        public async Task GetPerson_OneFailedAttempt_MoreToGo_WrongInput_ReturnsNull()
        {
            // Arrange
            parties.Setup(s => s.LookupPartyBySSNOrOrgNo(It.IsAny<string>())).ReturnsAsync((Party)null);
            memoryCache.Set("Person-Lookup-Failed-Attempts777", 1);
            lookupSettings.MaximumFailedAttempts = 2;

            var target = new PersonLookupService(parties.Object, settingsMock.Object, memoryCache, logger.Object);

            // Act
            var actual = await target.GetPerson("personnumber", "lastname", 777);

            // Assert
            Assert.Null(actual);
            Assert.Equal(2, memoryCache.Get<int>("Person-Lookup-Failed-Attempts777"));
        }

        [Fact]
        public async Task GetPerson_TooManyFailedAttempts_CorrectInput_ThrowsTooManyFailedLookupsException()
        {
            // Arrange
            Party party = new Party
            {
                Person = new Person
                {
                    LastName = "lastname"
                }
            };
            parties.Setup(s => s.LookupPartyBySSNOrOrgNo(It.IsAny<string>())).ReturnsAsync(party);
            memoryCache.Set("Person-Lookup-Failed-Attempts777", 1);
            lookupSettings.MaximumFailedAttempts = 1;

            var target = new PersonLookupService(parties.Object, settingsMock.Object, memoryCache, logger.Object);

            TooManyFailedLookupsException actual = null;

            // Act
            try
            {
                _ = await target.GetPerson("personnumber", "lastname", 777);
            }
            catch (TooManyFailedLookupsException tomfle)
            {
                actual = tomfle;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(1, memoryCache.Get<int>("Person-Lookup-Failed-Attempts777"));
        }

        [Fact]
        public async Task GetPerson_WrongInput_FailedAttemptsBeingResetAtCacheTimeout()
        {
            // Arrange
            Party party = new Party
            {
                Person = new Person
                {
                    LastName = "lastname"
                }
            };
            parties.Setup(s => s.LookupPartyBySSNOrOrgNo(It.IsAny<string>())).ReturnsAsync(party);
            memoryCache.Set("Person-Lookup-Failed-Attempts777", 1);
            lookupSettings.MaximumFailedAttempts = 2;
            lookupSettings.FailedAttemptsCacheLifetimeSeconds = 1;

            var target = new PersonLookupService(parties.Object, settingsMock.Object, memoryCache, logger.Object);

            // Act
            _ = await target.GetPerson("personnumber", "wrongname", 777);

            try
            {
                _ = await target.GetPerson("personnumber", "wrongname", 777);
            }
            catch
            {
            }

            // Assert
            Thread.Sleep(1200);
            Assert.Equal(0, memoryCache.Get<int>("Person-Lookup-Failed-Attempts777"));
        }
    }
}
