import type { Octokit } from '@octokit/rest' with { 'resolution-mode': 'import' };

// @octokit/rest is ESM-only and this package compiles to CommonJS, so it must be loaded with a native import().
export async function createOctokit(token?: string): Promise<Octokit> {
  const { Octokit: OctokitClient } = await import('@octokit/rest');
  return new OctokitClient(token ? { auth: token } : {});
}

export const DEFAULT_PER_PAGE = 100;
