using System.IO;

namespace LocalTest.Configuration
{
    /// <summary>
    /// Settings for accessing bridge functionality
    /// </summary>
    public class LocalPlatformSettings
    {
        string _localTestDataPath = null;

        /// <summary>
        /// The path to the local storage folder
        /// </summary>
        public string LocalTestingStorageBasePath { get; set; }

        /// <summary>
        /// The folder where the app that is tested is located. Used to retrieve app configuration
        /// </summary>
        public string AppRepositoryBasePath { get; set; }

        public string BlobStorageFolder { get; set; } = "blobs/";

        public string NotificationsStorageFolder { get; set; } = "notifications/";

        /// <summary>
        /// Folder where static test data like profile, authorization, and register data is available for local testing.
        /// </summary>
        public string LocalTestingStaticTestDataPath
        {
            get => _localTestDataPath;
            set
            {
                if (!value.EndsWith(Path.DirectorySeparatorChar) &&
                    !value.EndsWith(Path.AltDirectorySeparatorChar))
                {
                    value += Path.DirectorySeparatorChar;
                }

                _localTestDataPath = value;
            }
        }

        /// <summary>
        /// Url for the local app when LocalAppMode == http
        /// <summary>
        public string LocalAppUrl { get; set; }

        /// <summary>
        /// which access mode to use ("file", "http")
        /// <summary>
        public string LocalAppMode { get; set; }

        public string DocumentDbFolder { get; set; } = "documentdb/";

        public string InstanceCollectionFolder { get; set; } = "instances/";

        public string ApplicationsDataFolder { get; set; } = "applications/";

        public string DataCollectionFolder { get; set; } = "data/";

        public string EventsCollectionFolder { get; set; } = "events/";

        public string InstanceEventsCollectionFolder { get; set; } = "instanceevents/";

        public string AuthorizationDataFolder { get; set; } = "authorization/";

        public string PartyListFolder { get; set; } = "partylist/";

        public string ResourceRegistryFolder { get; set; } = "authorization/resources/";

        public string RolesFolder { get; set; } = "roles/";

        public string ClaimsFolder { get; set; } = "claims/";

        public string TenorDataFolder { get; set; } = "tenorUsers";
    }
}
