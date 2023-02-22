import fs from 'fs';

const environments = fs.readFileSync('environments.json', 'utf-8');

export const environmentsRoute = async (req, res) => {
  res.json(JSON.parse(environments));
};
