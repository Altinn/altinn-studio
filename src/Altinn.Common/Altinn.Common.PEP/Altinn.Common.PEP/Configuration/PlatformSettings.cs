using System;

namespace Altinn.Common.PEP.Configuration
{
    /// <summary>
    /// Configuratin for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API storage endpoint
        /// </summary>
        public string ApiStorageEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API storage endpoint by looking into environment variables
        /// </summary>
        public string GetApiStorageEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiStorageEndpoint") ?? ApiStorageEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the url for the API register endpoint
        /// </summary>
        public string ApiRegisterEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API register endpoint by looking into environment variables
        /// </summary>
        public string GetApiRegisterEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiRegisterEndpoint") ?? ApiRegisterEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the url for the API profile endpoint
        /// </summary>
        public string ApiProfileEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API profile endpoint by looking into environment variables
        /// </summary>
        public string GetApiProfileEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiProfileEndpoint") ?? ApiProfileEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API Authentication endpoint by looking into environment variables
        /// </summary>
        public string GetApiAuthenticationEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthenticationEndpoint") ?? ApiAuthenticationEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint { get; set; }

        /// <summary>
        /// Gets the url for the API Authorization endpoint by looking into environment variables
        /// </summary>
        public string GetApiAuthorizationEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthorizationEndpoint") ?? ApiAuthorizationEndpoint;
            }
        }
    }
}
