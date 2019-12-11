using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;

namespace Altinn.Platform.Storage.IntegrationTest.Fixtures
{
    /// <summary>
    /// Cosmos DB fixture with automatic start of Cosmos emulator. 
    /// </summary>
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

            if (Process.GetProcessesByName("Microsoft.Azure.Cosmos.Emulator").Length == 0)
            {
                StartAndWaitForExit();
            }      
        }

        /// <summary>
        /// Clean up.
        /// </summary>
        public void Dispose()
        {
        }

        /// <summary>
        /// Starts the Cosmos DB Emulator.
        /// </summary>
        public void StartAndWaitForExit()
        {
            process.Start();
            process.WaitForExit(10000);
        }
    }
}
