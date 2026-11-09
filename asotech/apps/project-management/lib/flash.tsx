import { Alert } from "@asotech/ui";

/** Renders ?error= / ?notice= query messages. Pass the awaited searchParams. */
export function Flash({ sp }: { sp: { error?: string; notice?: string } }) {
  return (
    <>
      {sp.error && <Alert tone="bad">{sp.error}</Alert>}
      {sp.notice && <Alert tone="ok">{sp.notice}</Alert>}
    </>
  );
}
