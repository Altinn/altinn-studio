using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;

using AltinnCore.Authentication.Constants;

using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.AspNetCore.Http;

namespace Altinn.Platform.Register.Filters
{
    /// <summary>
    /// Filter to enrich request telemetry with identity information
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class IdentityTelemetryFilter : ITelemetryProcessor
    {
        private ITelemetryProcessor Next { get; set; }

        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="IdentityTelemetryFilter"/> class.
        /// </summary>
        public IdentityTelemetryFilter(ITelemetryProcessor next, IHttpContextAccessor httpContextAccessor)
        {
            Next = next;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public void Process(ITelemetry item)
        {
            if (item is RequestTelemetry request && request.Url.ToString().Contains("register/api/"))
            {
                HttpContext ctx = _httpContextAccessor.HttpContext;

                if (ctx?.User != null)
                {
                    int? orgNumber = GetOrgNumber(ctx.User);
                    int? userId = GetUserIdAsInt(ctx.User);
                    int? partyId = GetPartyIdAsInt(ctx.User);
                    int authLevel = GetAuthenticationLevel(ctx.User);

                    request.Properties.Add("partyId", partyId.ToString());
                    request.Properties.Add("authLevel", authLevel.ToString());

                    if (userId != null)
                    {
                        request.Properties.Add("userId", userId.ToString());
                    }

                    if (orgNumber != null)
                    {
                        request.Properties.Add("orgNumber", orgNumber.ToString());
                    }
                }
            }

            Next.Process(item);
        }

        private static int GetAuthenticationLevel(ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.AuthenticationLevel))
            {
                Claim userIdClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.AuthenticationLevel);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int authenticationLevel))
                {
                    return authenticationLevel;
                }
            }

            return 0;
        }

        private static int? GetPartyIdAsInt(ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.UserId))
            {
                Claim partyIdClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.PartyID);
                if (partyIdClaim != null && int.TryParse(partyIdClaim.Value, out int partyId))
                {
                    return partyId;
                }
            }

            return null;
        }

        private static int? GetOrgNumber(ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.OrgNumber))
            {
                Claim orgClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.OrgNumber);
                if (orgClaim != null && int.TryParse(orgClaim.Value, out int orgNumber))
                {
                    return orgNumber;
                }
            }

            return null;
        }

        private static int? GetUserIdAsInt(ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.UserId))
            {
                Claim userIdClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.UserId);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    return userId;
                }
            }

            return null;
        }
    }
}
