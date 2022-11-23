namespace Altinn.Common.AccessTokenClient.Configuration
{
    /// <summary>
    /// Confiugration for access token 
    /// </summary>
    public class AccessTokenSettings
    {
        /// <summary>
        /// The folder where the signing keys are stored. 
        /// </summary>
        public string AccessTokenSigningKeysFolder { get; set; } = "accesstoken/";

        /// <summary>
        /// The lifetime for a token
        /// </summary>
        public int TokenLifetimeInSeconds { get; set; } = 300;

        /// <summary>
        /// Specify the number of seconds to add (or subtract) to the current time when determining
        /// when the access token should be considered valid
        /// </summary>
        public int ValidFromAdjustmentSeconds { get; set; } = -5;

        /// <summary>
        /// The name of the cert for access token signing
        /// </summary>
        public string AccessTokenSigningCertificateFileName { get; set; } = "accesstokencredentials.pfx";
    }
}
