module.exports = (req, res) => {
  const { tagName, name, body, targetCommitish } = req.body;

  res.status(201);
  res.json({ tagName, name, body, targetCommitish });
};
