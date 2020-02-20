FROM loadimpact/k6
WORKDIR /src
VOLUME C:/AltinnStudio/altinn-studio/src/test/K6/src:/src
COPY . .
RUN k6 run --vus ${vus} --duration ${duration} ./src/Tests/Platform/pdf.js -e env=${env}