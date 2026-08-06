import React from 'react';

import { Loader } from 'src/core/loading/Loader';
import { clientLoader } from 'src/routes/instance/instance-index.loader';

export { clientLoader };

export default function InstanceIndex() {
  return <Loader reason='instance-redirect' />;
}
