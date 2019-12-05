using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
{
    public class CosmosDBFixture
    {
        private readonly Process process;

        /// <summary>
        /// Creates new instance of blob fixture.
        /// </summary>
        public CosmosDBFixture()
        {
            // setting up storage emmulator
            process = new Process
            {
                StartInfo =
                {
                    UseShellExecute = false,
                    FileName = @"C:\Program Files\Azure Cosmos DB Emulator\Microsoft.Azure.Cosmos.Emulator.exe"
                }
            };

            StartAndWaitForExit("start");
        }

        /// <summary>
        /// Clean up.
        /// </summary>
        public void Dispose()
        {
        }

        public void StartAndWaitForExit(string arguments)
        {
            process.StartInfo.Arguments = arguments;
            process.Start();
            process.WaitForExit(10000);
        }
    }
}
