import React from 'react';

import { Loader } from 'src/core/loading/Loader';
import { clientLoader } from 'src/routes/task/task-index.loader';

export { clientLoader };

export default function TaskIndex() {
  return <Loader reason='task-redirect' />;
}
