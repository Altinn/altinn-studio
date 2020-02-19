FROM loadimpact/k6
VOLUME C:/AltinnStudio/altinn-studio/src/test/K6/src:/src
COPY . .
RUN k6 run ./src/Tests/Platform/pdf.js