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

        public string BlobStorageFolder { get; set; } = "blobs/";

        public string NotificationsStorageFolder { get; set; } = "notifications/";

        public string AuthorizationAuditFolder { get; set; } = "authorization/";

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

        public string DocumentDbFolder { get; set; } = "documentdb/";

        public string InstanceCollectionFolder { get; set; } = "instances/";

        public string ApplicationsDataFolder { get; set; } = "applications/";

        public string DataCollectionFolder { get; set; } = "data/";

        public string EventsCollectionFolder { get; set; } = "events/";

        public string InstanceEventsCollectionFolder { get; set; } = "instanceevents/";

        public string AuthorizationDataFolder { get; set; } = "authorization/";

        public string PartyListFolder { get; set; } = "partylist/";

        public string InstanceLockFolder { get; set; } = "instancelocks/";

        public string ResourceRegistryFolder { get; set; } = "authorization/resources/";

        public string RolesFolder { get; set; } = "roles/";

        public string ClaimsFolder { get; set; } = "claims/";

        public string TenorDataFolder { get; set; } = "tenorUsers";

        public string InstanceDelegationsDataFolder { get; set; } = "instanceDelegations";
    }
}
