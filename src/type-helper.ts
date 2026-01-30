export function isErrnoException(error: unknown): error is ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "errno" in error &&
    "syscall" in error
  );
}
