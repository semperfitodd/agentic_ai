import { Octokit } from '@octokit/rest';

export function createOctokit(token?: string): Octokit {
  return new Octokit(token ? { auth: token } : {});
}

export const DEFAULT_PER_PAGE = 100;
