using BenchmarkDotNet.Running;

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);

// using System;
// using Altinn.App.Benchmarks.Analyzers;

// {
//     var benchmark = new HttpContextAccessorUseAnalyzerBenchmarks();
//     benchmark.Setup();
//     var (diagnostics, telemetry) = await benchmark.Analyze();
//     Console.WriteLine($"HttpContextAccessorUseAnalyzerBenchmarks diagnostics: {diagnostics.Length}");
//     Console.WriteLine(
//         $"HttpContextAccessorUseAnalyzerBenchmarks execution time: {telemetry.ExecutionTime.TotalMilliseconds} ms"
//     );
// }

// {
//     var benchmark = new AppImplementationFactoryAnalyzerBenchmarks();
//     benchmark.Setup();
//     var (diagnostics, telemetry) = await benchmark.Analyze();
//     Console.WriteLine($"AppImplementationFactoryAnalyzerBenchmarks diagnostics: {diagnostics.Length}");
//     Console.WriteLine(
//         $"AppImplementationFactoryAnalyzerBenchmarks execution time: {telemetry.ExecutionTime.TotalMilliseconds} ms"
//     );
// }
