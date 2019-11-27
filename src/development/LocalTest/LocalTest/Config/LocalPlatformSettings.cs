using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
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
        public string AppRepsitoryBasePath { get; set; }

        /// <summary>
        /// Folder where static test data like profile, authorization, and register data is available for local testing.
        /// </summary>
        public string LocalTestingStaticTestDataPath { get; set; }
    }
}
