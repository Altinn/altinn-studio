using System.Threading.Tasks;

using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.IntegrationTest.Mocks
{
    /// <summary>
    /// Represents a stub of <see cref="ISasTokenProvider"/> that can be used when performing local tests that
    /// integrate with a locally installed storage emulator.
    /// </summary>
    /// <remarks>
    /// To use this stub you need to add it as a dependency in your test code. services.AddSingleton{ISasTokenProvider, SasTokenProviderStub}();
    /// </remarks>
    public class SasTokenProviderStub : ISasTokenProvider
    {
        /// <inheritdoc />
        public async Task<string> GetSasToken(string org)
        {
            /*
             * Generate a new token value for your local storage emulator on your development machine:
             * 1. Open Storage Explorer
             * 2. Navigate down to the "servicedata" container (Local & Attached -> Storage Accounts -> Emulator-> Blob Containers)
             * 3. Right click and select "Get Shared Access Signature" and make a new signature.
             * 4. Copy the result and replace the string below.
             */
            return await Task.FromResult("?st=2020-04-01T08%3A40%3A20Z&se=2020-05-01T08%3A40%3A00Z&sp=racwdl&sv=2018-03-28&sr=c&sig=mCtn9LqnJO0hKcqIDxHHtXyatDPIEcobK5yw3JVQbhQ%3D");
        }

        /// <summary>
        /// Have a stored SAS token removed from the internal collection.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        public void InvalidateSasToken(string org)
        {
            // Do nothing
        }
    }
}
