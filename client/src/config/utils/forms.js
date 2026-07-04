export function compactPayload(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export function getApiMessage(error, fallback) {
  const validationMessage = error.response?.data?.errors?.[0]?.message;
  return validationMessage || error.response?.data?.message || fallback;
}
