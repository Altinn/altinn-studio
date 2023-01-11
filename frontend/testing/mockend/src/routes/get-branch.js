module.exports = (req, res) => {
  const { org, app } = req.params;
  res.json({
    commit: {
      author: { email: '@jugglingnutcase', name: 'Nick Fury', username: 'nickf' },
      committer: { email: '@jugglingnutcase', name: 'Nick Fury', username: 'nickf' },
      id: '940f119905cada186000ab31a8e3be88d73375ce',
      message: 'This would be a commit message',
      timestamp: '2023-01-11T08:44:59Z',
      url: `https://localhost:2004/repos/${org}/${app}/commit/fff8d87281088bcdddfd8affa5e78e5b0d0b2503`,
      verification: {
        payload: '',
        reason: 'gpg.error.not_signed_commit',
        signature: '',
        verified: false,
      },
    },
    name: req.query.branch,
  });
};
