using System.ComponentModel;

namespace Altinn.App.Core.Features.Maskinporten.Models;

[ImmutableObject(true)]
internal sealed record TokenCacheEntry(MaskinportenTokenResponse Token, TimeSpan Expiration, bool HasSetExpiration);
