
## Getting Started

These instructions will get help you setup eFormidlingClient package in your solution as well as how to test it.

### Prerequisites

The client package is written in C# and targets .Net Standard 2.1. The API solution which the package communicates with, i.e. the integration point, is written in Java. The integration point is possible to run locally with mock settings for testing purposes, requiring minimum Java 8 SDK. Ref test section.

#### eFormidlingClient package
1. [.NET Standard 2.1](https://docs.microsoft.com/en-us/dotnet/standard/net-standard)
2. Code editor of your choice
3. Newest [Git](https://git-scm.com/downloads)
4. Solution is cloned

#### Integration Point
1. [Java OpenJDK](https://openjdk.java.net/projects/jdk/15/)
2. [Integration Point](https://docs.digdir.no/eformidling_download_ip.html)

#### Mock Solution for testing
1. [eFormidling Mock](https://github.com/felleslosninger/efm-mocks)
2. [Docker](https://docs.docker.com/docker-for-windows/install/)
3. [Nodejs](https://nodejs.org/en/download/)



## Setup eFormidlingClient package in solution

Download the eFormidlingClient nuget package from Nuget Package Manager where source is nuget.org. Search for its name: Altinn.Common.EFormidlingClient, then download and install. 

In order to debug the solution it is possible to retrieve the source code from: https://github.com/Altinn/altinn-studio and then add the project as a reference instead of the nuget package in Altinn.EFormidlingClient.csproj.

In startup class, IEFormidlingClient and EFormidlingClientSettings are injected.


### Running eFormidling Integration Point locally
The intgration point is a REST based API which is documented here: 
https://docs.digdir.no/eformidling_nm_restdocs.html

After downloading the Integration Point (IP) from https://docs.digdir.no/eformidling_download_ip.html, start the jar executable by running the following command in CLI: 

```cmd
java -Dspring.profiles.active=mock -jar integrasjonspunkt-<VERSION>.jar
```

Make sure that Java is set in the PATH and its version is at least 8. The -Dspring.profiles.active=mock argument indicates that the IP is running with mock properties, allowing for debug and testing locally during development. 

The solution should be ran with at least 2GB memory available. If needed, increase Java runtime parameter with following memory setting "-Xms2048m" as it defaults to 256 MB. In order to verify it is running correctly, run the tests specified in the test section or the tests that comes with the eFormidling Mock Solution.

For more information, consult eFormidling Integration Point documentation at https://docs.digdir.no/eformidling_forutsetninger.html


### Running eFormidling mock solution locally

Retrieve the mock solution by running:
```cmd
git clone https://github.com/difi/move-mocks.git.
```
AON, March 2021, it is recommended to use the development branch as there were some problems with master (prod).

Next, make sure the Integration Point is running locally and then run 'docker-compose up' in the root folder of the project. This will bring up the following services that constitute the mock solution:

* localhost:8090: Wiremock - Simulates SR.
* localhost:8080: DPI mock.
* localhost:8001: DPO, DPV, DPF, og DPE mock.
* localhost:8002: Sak/arkivsystem mock.
* localhost:9094: Receiver Integration Point.

localhost:8001 provides a dashboard that will display successfully sent messages.
localhost:8002 provides a dashboard that functions as a sak/arkivsystem on the receiver side. Here it is possible to perform end-to-end testing using DPO (Digital Post Offentlig) and DPE (Digital Post eInnsyn) service providers.


### Running tests eFormidling Client
The eFormidling Client library comes with unit- and integration tests.
Use your IDE to run the tests or use 'dotnet test' command to run the tests. The integration tests require that the integration point is running, also in some build server in CI/CD pipeline. In the appsettings there is a baseUrl, this should be pointed to the correct environment where the IP is running, e.g. if testing locally:

```cmd
http://localhost:PORT/api/
```

There is an Int test called Verify_Sent_Attachments. This can be used as an 'end-to-end' test, by examining the content of the package sent via eFormidling is correct. An ASIC-E container is built on the IP side containing all files sent.
In order to get access to this container, send the message to self, i.e. same senderId as receiverId. The message will become available on the incomming message queue.
First perform a peek of the queue, verify that the SBD and InstanceIdentifier is the correct ID. Next, pop the message to retrieve the ASIC-E. Download the content and write to file, and then delete the message from the queue. Open the file 'sent_package.zip' and examine the content.

### Running tests move-mocks

In order to test the mock solution and the integration point, navigate to the 'tests/next-move' folder. Run with Node the following command: node NextMove.js dpi dpiprint dpe dpf dpv dpo. This will execute a complete test. Verify in the dashboard on localhost:8001 that the messages were sent successfully. Moreover, the NextMove class writen in Javascript, contains examples on how to create and send a message.


For more information, consult the README.md in the mock solution.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/altinn-studio/issues/new).

See also the list of [contributors](https://github.com/Altinn/altinn-studio/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.




