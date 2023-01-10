module.exports = (req, res) => {
  const { tagName, env } = req.body;

  res.status(201);
  res.json({
    tagName,
    envName: env.name,
    build: {
      id: '625641',
      status: 'notStarted',
      result: 'none',
      started: null,
      finished: null,
    },
    created: new Date().toISOString(),
    createdBy: 'mijohansen',
    app: 'autodeploy-v3',
    org: 'ttd',
  });
};
