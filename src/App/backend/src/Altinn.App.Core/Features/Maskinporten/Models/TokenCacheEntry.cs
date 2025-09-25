using System.ComponentModel;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Maskinporten.Models;

// `ImmutableObject` prevents serialization with HybridCache
[ImmutableObject(true)]
internal sealed record TokenCacheEntry(JwtToken Token, TimeSpan ExpiresIn, bool HasSetExpiration);
