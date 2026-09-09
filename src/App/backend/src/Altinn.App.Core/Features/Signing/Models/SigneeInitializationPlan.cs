namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>The persisted signing task entry and its frozen, ordered recipient identities.</summary>
internal sealed record SigneeInitializationPlan(Guid SigneeStateElementId, IReadOnlyList<Guid> SigneeIds);
