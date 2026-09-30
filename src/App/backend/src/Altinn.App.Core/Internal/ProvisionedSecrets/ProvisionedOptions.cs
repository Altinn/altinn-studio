using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// Binds <typeparamref name="TOptions"/> to the contents of one provisioned file, and reloads them when the
/// platform rotates what it provisioned.
/// </summary>
/// <typeparam name="TOptions">The options type the file's contents bind to.</typeparam>
/// <param name="secrets">The channel the file is read through.</param>
/// <param name="file">The file the options are bound to.</param>
internal sealed class ProvisionedOptions<TOptions>(ProvisionedSecrets secrets, ProvisionedSecretFile file)
    : IConfigureOptions<TOptions>,
        IOptionsChangeTokenSource<TOptions>
    where TOptions : class
{
    public string Name => Options.DefaultName;

    public void Configure(TOptions options) => secrets.Section(file).Bind(options);

    public IChangeToken GetChangeToken() => secrets.Section(file).GetReloadToken();
}
