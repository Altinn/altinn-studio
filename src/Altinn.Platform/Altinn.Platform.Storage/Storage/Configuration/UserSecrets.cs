namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Configuration object used to hold settings specific for development and obtained from user-secrets.
    /// </summary>
    public class UserSecrets
    {
        /// <summary>
        /// Gets or sets a shared access signature that can be used to access the local storage emulator, blob containers.
        /// </summary>
        public string SharedAccessSignature { get; set; }
    }
}
