using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
{
    /// <summary>
    /// Sets up fixture for blob storage
    /// </summary>
    public class BlobStorageFixture :IDisposable
    {
        private readonly Process process;

        /// <summary>
        /// Creates new instance of blob fixture.
        /// </summary>
        public BlobStorageFixture()
        {
            // setting up storage emmulator
            process = new Process
            {
                StartInfo =
                {
                    UseShellExecute = false,
                    FileName = @"C:\Program Files (x86)\Microsoft SDKs\Azure\Storage Emulator\AzureStorageEmulator.exe"
                }
            };

            StartAndWaitForExit("stop");
            StartAndWaitForExit("clear all");
            StartAndWaitForExit("start");
        }

        /// <summary>
        /// Clean up.
        /// </summary>
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
