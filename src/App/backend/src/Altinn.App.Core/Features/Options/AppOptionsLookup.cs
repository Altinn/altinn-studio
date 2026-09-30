namespace Altinn.App.Core.Features.Options;

/// <summary>
/// One option list to load in a call to <see cref="IAppOptionsService.GetOptionsAsync(IReadOnlyList{AppOptionsLookup}, string?, IInstanceDataAccessor?, CancellationToken)"/>.
/// </summary>
/// <param name="OptionId">The id of the option list, as written in the layout or the registration</param>
/// <param name="KeyValuePairs">Key/value pairs the provider may use for filtering and further lookup</param>
public sealed record AppOptionsLookup(string OptionId, Dictionary<string, string> KeyValuePairs);
