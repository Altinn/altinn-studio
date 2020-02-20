FROM loadimpact/k6
WORKDIR /src
ENV env ${env}
ENV vus ${vus}
ENV duration ${duration}
COPY . .
RUN k6 run --vus ${vus} --duration ${duration} ./src/Tests/Platform/pdf.js -e env=${env}