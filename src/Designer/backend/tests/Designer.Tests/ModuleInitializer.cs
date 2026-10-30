#nullable enable
using System;
using System.IO;
using System.Runtime.CompilerServices;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using DiffEngine;
using VerifyTests;
using VerifyXunit;

namespace Designer.Tests;

internal static class ModuleInitializer
{
    [ModuleInitializer]
    public static void Init()
    {
        // As in production, before any test uses libgit2.
        LibGit2Configuration.DisableSymbolicLinks();
        Verifier.DerivePathInfo(
            (file, _, type, method) => new(Path.Join(Path.GetDirectoryName(file), "_snapshots"), type.Name, method.Name)
        );
        var isCi = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("CI"));
        if (BuildServerDetector.Detected && BuildServerDetector.IsWsl && !isCi)
        {
            BuildServerDetector.Detected = false; // WSL is not a build server
        }
        VerifierSettings.AutoVerify(includeBuildServer: false);
    }
}
