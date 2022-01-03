namespace LocalTest.Configuration
{
    /// <summary>
    /// Settings for accessing bridge functionality
    /// </summary>
    public class LocalPlatformSettings
    {
        /// <summary>
        /// The endpoint for the bridge
        /// </summary>
        public string LocalTestingStorageBasePath { get; set; }

        /// <summary>
        /// The folder where the app that is tested is located. Used to retrieve app configuration
        /// </summary>
        public string AppRepositoryBasePath { get; set; }

        public string BlobStorageFolder { get; set; } = "blobs/";

        /// <summary>
        /// Folder where static test data like profile, authorization, and register data is available for local testing.
        /// </summary>
        public string LocalTestingStaticTestDataPath { get; set; }

        /// <summary>
        /// Url for the local app when LocalAppMode == http
        /// <summary>
        public string LocalAppUrl { get; set; }

        /// <summary>
        /// which access mode to use ("file", "http")
        /// <summary>
        public string LocalAppMode { get; set; }

        public string DocumentDbFolder { get; set;  } = "documentdb/";

        public string InstanceCollectionFolder { get; set; } = "instances/";

        public string DataCollectionFolder { get; set; } = "data/";

        public string EventsCollectionFolder { get; set; } = "events/";

        public string InstanceEventsCollectionFolder { get; set; } = "instanceevents/";

        public string AuthorizationDataFolder { get; set; } = "authorization/";

        public string PartyListFolder { get; set; } = "partylist/";

        public string RolesFolder { get; set; } = "roles/";
    }
}
