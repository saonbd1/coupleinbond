import { getToken } from '@vercel/connect';

export function getGitHubToken(): Promise<string> {
  return getToken('github/acme-github', { subject: { type: 'app' } });
}