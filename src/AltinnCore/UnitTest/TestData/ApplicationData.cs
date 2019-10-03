using Altinn.Platform.Storage.Models;

namespace AltinnCore.UnitTest.TestData
{
    /// <summary>
    /// Represents operations to obtain <see cref="Application"/> data for a unit test.
    /// </summary>
    public static class ApplicationData
    {
        /// <summary>
        /// Get application metadata for a specific application.
        /// </summary>
        /// <param name="appId">The id of the application to return</param>
        /// <returns>The application metadata.</returns>
        public static Application Get(string appId)
        {
            appId = appId.Replace('/', '_');
            string path = $"TestData/{appId}/application.json";
            return FileDeserialiser.DeserialiseFile<Application>(path);
        }

        /// <summary>
        /// Get application metadata for a specific application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <returns>The application metadata.</returns>
        public static Application Get(string org, string app)
        {
            string path = $"TestData/{org}_{app}/application.json";
            return FileDeserialiser.DeserialiseFile<Application>(path);
        }
    }
}
