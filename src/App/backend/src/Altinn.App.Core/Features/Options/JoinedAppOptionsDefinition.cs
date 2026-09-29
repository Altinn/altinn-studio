namespace Altinn.App.Core.Features.Options;

/// <summary>
/// A joined option list registered with <see cref="AppOptionsServiceExtensions.AddJoinedAppOptions"/>. The
/// <see cref="AppOptionsService"/> expands it into its sub lists when the id is looked up.
/// </summary>
/// <param name="Id">The id the joined list is looked up by</param>
/// <param name="SubOptionIds">The ids of the lists to join, in the order their options are concatenated</param>
internal sealed record JoinedAppOptionsDefinition(string Id, string[] SubOptionIds);
