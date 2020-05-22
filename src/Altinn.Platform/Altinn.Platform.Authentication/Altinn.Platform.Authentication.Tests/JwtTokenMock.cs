using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;

using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Tests
{
    /// <summary>
    /// Represents a mechanism for creating JSON Web tokens for use in integration tests.
    /// </summary>
    public static class JwtTokenMock
    {
        /// <summary>
        /// Generates a token with a self signed certificate included in the integration test project.
        /// </summary>
        /// <param name="principal">The claims principal to include in the token.</param>
        /// <param name="tokenExpiry">How long the token should be valid for.</param>
        /// <returns>A new token.</returns>
        public static string GenerateToken(ClaimsPrincipal principal, TimeSpan tokenExpiry)
        {
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
                SigningCredentials = GetSigningCredentials(),
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string serializedToken = tokenHandler.WriteToken(token);

            return serializedToken;
        }

        /// <summary>
        /// Creates a encrypted token
        /// </summary>
        /// <param name="principal">The claims principal to include in the token.</param>
        /// <param name="tokenExpiry">How long the token should be valid for.</param>
        /// <returns>A new token.</returns>
        public static string GenerateEncryptedToken(ClaimsPrincipal principal, TimeSpan tokenExpiry)
        {
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
                EncryptingCredentials = GetEncryptionCredentials(),
            };

            string token = tokenHandler.CreateEncodedJwt(tokenDescriptor);
            return token;
        }

        /// <summary>
        /// Creates a encrypted and signed token
        /// </summary>
        /// <param name="principal">The claims principal to include in the token.</param>
        /// <param name="tokenExpiry">How long the token should be valid for.</param>
        /// <returns>A new token.</returns>
        public static string GenerateEncryptedAndSignedToken(ClaimsPrincipal principal, TimeSpan tokenExpiry)
        {
            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
                EncryptingCredentials = GetEncryptionCredentials(),
                SigningCredentials = GetSigningCredentials(),
            };

            string token = tokenHandler.CreateEncodedJwt(tokenDescriptor);
            return token;
        }

        /// <summary>
        /// Validates a token and return the ClaimsPrincipal if successful. The validation key used is from the self signed certificate
        /// and is included in the integration test project as a separate file.
        /// </summary>
        /// <param name="token">The token to be validated.</param>
        /// <returns>ClaimsPrincipal</returns>
        public static ClaimsPrincipal ValidateToken(string token)
        {
            X509Certificate2 cert = new X509Certificate2("selfSignedTestCertificatePublic.cer");
            SecurityKey key = new X509SecurityKey(cert);

            TokenValidationParameters validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();
            return validator.ValidateToken(token, validationParameters, out _);
        }

        /// <summary>
        /// Validates a token and return the ClaimsPrincipal if successful. The validation key used is from the self signed certificate
        /// and is included in the integration test project as a separate file.
        /// </summary>
        /// <param name="token">The token to be validated.</param>
        /// <returns>ClaimsPrincipal</returns>
        public static ClaimsPrincipal ValidateEncryptedAndSignedToken(string token)
        {
            X509Certificate2 cert = new X509Certificate2("selfSignedTestCertificatePublic.cer");
            SecurityKey key = new X509SecurityKey(cert);

            TokenValidationParameters validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                TokenDecryptionKey = new X509SecurityKey(new X509Certificate2("selfSignedEncryptionTestCertificate.pfx", "qwer1234")),
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();
            return validator.ValidateToken(token, validationParameters, out _);
        }

        private static SigningCredentials GetSigningCredentials()
        {
            X509Certificate2 cert = new X509Certificate2("selfSignedTestCertificate.pfx", "qwer1234");
            return new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
        }

        private static EncryptingCredentials GetEncryptionCredentials()
        {
            return new X509EncryptingCredentials(new X509Certificate2("selfSignedEncryptionTestCertificatePublic.cer"));
        }
    }
}
