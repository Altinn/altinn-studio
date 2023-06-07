using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services
{
    public class UserRequestsSynchronizationServiceTests
    {
        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
        public void Semaphores_ShouldBeCleanedUpAfterExpiry(string org, string repo, string developer)
        {
            var settings = new UserRequestSynchronizationSettings
            {
                MaxDegreeOfParallelism = 1, SemaphoreExpiryInSeconds = 1, CleanUpFrequencyInSeconds = 1
            };
            var service = new UserRequestsSynchronizationService(settings);

            var semaphore = service.GetRequestsSemaphore(org, repo, developer);
            var semaphore2 = service.GetRequestsSemaphore(org, repo, developer);
            Assert.Equal(semaphore2, semaphore);

            // Check if semaphore will expire
            System.Threading.Thread.Sleep(2000);

            var semaphore3 = service.GetRequestsSemaphore(org, repo, developer);
            Assert.NotEqual(semaphore3, semaphore);

        }
    }
}
