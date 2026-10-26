jest.mock('@octokit/rest', () => {
  const Octokit = jest.fn().mockImplementation(() => ({
    paginate: jest.fn().mockResolvedValue([]),
    pulls: {
      get: jest.fn().mockResolvedValue({ data: {} }),
      list: jest.fn().mockResolvedValue({ data: [] }),
      listFiles: jest.fn().mockResolvedValue({ data: [] }),
      listReviewComments: jest.fn().mockResolvedValue({ data: [] }),
      listReviews: jest.fn().mockResolvedValue({ data: [] }),
    },
    repos: {
      getReadme: jest.fn().mockRejectedValue(new Error('README not found')),
    },
    issues: {
      listComments: jest.fn().mockResolvedValue({ data: [] }),
    },
    rest: {
      pulls: {
        listReviewComments: jest.fn().mockResolvedValue({ data: [] }),
      },
    },
  }));

  return { Octokit };
});
