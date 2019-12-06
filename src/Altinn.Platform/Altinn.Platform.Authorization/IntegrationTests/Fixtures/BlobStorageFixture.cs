using Microsoft.WindowsAzure.Storage;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests.Fixtures
{
    public class BlobStorageFixture : IDisposable
    {
        readonly Process process;

        public BlobStorageFixture()
        {
            process = new Process
            {
                StartInfo = {
                UseShellExecute = false,
                FileName = @"C:\Program Files (x86)\Microsoft SDKs\Azure\Storage Emulator\AzureStorageEmulator.exe",
            }
            };

            StartAndWaitForExit("stop");
            StartAndWaitForExit("clear all");
            StartAndWaitForExit("start");
        }

        public void Dispose()
        {
            StartAndWaitForExit("stop");
        }

        public void StartAndWaitForExit(string arguments)
        {
            process.StartInfo.Arguments = arguments;
            process.Start();
            process.WaitForExit(10000);
        }
    }
}

