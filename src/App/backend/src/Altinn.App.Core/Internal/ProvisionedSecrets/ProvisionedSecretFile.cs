namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// One of the files the platform provisions into the app's secrets directory. A provisioned file wraps its
/// contents in a single root object, so naming the file names that object too.
/// </summary>
/// <param name="FileName">
/// The name the platform provisions the file under, inside the secrets directory.
/// </param>
/// <param name="SectionName">
/// The root object the file wraps its contents in, and therefore the configuration section they bind from.
/// </param>
internal sealed record ProvisionedSecretFile(string FileName, string SectionName);
