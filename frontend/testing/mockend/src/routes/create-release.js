module.exports = (req, res) => {
  const { tagName, name, body, targetCommitish } = req.body;

  res.status(201);
  res.json(content);
};

// {"tagName":"8999","name":"8999","body":"Dette er en thing","targetCommitish":"fff8d87281088bcdddfd8affa5e78e5b0d0b2503"}
