export async function fetchWithAuthRedirect(
  router: { replace: (url: string) => void },
  input: RequestInfo,
  init?: RequestInit,
) {
  const response = await fetch(input, { ...init, credentials: 'include' });

  if (response.status === 401) {
    router.replace('/login');
  }

  return response;
}
