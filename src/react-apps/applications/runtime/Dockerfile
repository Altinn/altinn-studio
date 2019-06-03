# base image
FROM node:10.13.0  AS generate-runtime-app

# Copy and install Lerna
COPY ./src/react-apps/lerna.json .
COPY ./src/react-apps/package.json .
COPY ./src/react-apps/package-lock.json .
RUN npm install

# Copy shared and runtime
COPY ./src/react-apps/applications/shared/ /applications/shared/
COPY ./src/react-apps/applications/runtime/ /applications/runtime/

# Install
RUN npm run install-deps

# Build runtime
RUN npm run build --prefix /applications/runtime; exit 0

CMD ["echo", "done"]

