namespace Altinn.App.Core.Internal.ProvisionedSecrets;

/// <summary>
/// <para>One of the files the platform provisions into the app's secrets directory.</para>
/// <para>What the file is called is the writer's to decide — the operator for a deployed app, studioctl for a
/// local run — and it says so in the configuration key <paramref name="FileNameKey"/>. What is inside the file
/// is the libraries': a provisioned file wraps its contents in a single root object, and
/// <paramref name="SectionName"/> is that object.</para>
/// </summary>
/// <param name="FileNameKey">
/// The configuration key naming the file inside the secrets directory. Required in every environment; see
/// <see cref="ProvisionedSecrets.FromConfiguration"/>.
/// </param>
/// <param name="SectionName">
/// The root object the file wraps its contents in, and therefore the configuration section they bind from.
/// </param>
internal sealed record ProvisionedSecretFile(string FileNameKey, string SectionName);
