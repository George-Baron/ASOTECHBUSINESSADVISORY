"use client";
import { useActionState } from "react";
import { Alert, Button } from "@asotech/ui";
import { generateAppSheetKey, type KeyState } from "./actions";

export function KeyForm({ id, hasKey }: { id: string; hasKey: boolean }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(generateAppSheetKey, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="bad">{state.error}</Alert>}
      {state.key && state.connectionId === id && (
        <Alert tone="warn" title="Copy this key now. It is shown only once.">
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs text-navy">{state.key}</code>
          <span className="mt-1 block text-xs">Store it in AppSheet's request headers as <strong>x-api-key</strong>. If you lose it, generate a new one; the old key stops working.</span>
        </Alert>
      )}
      <Button size="sm" variant="secondary" disabled={pending}>{hasKey ? "Generate a new key" : "Generate API key"}</Button>
    </form>
  );
}
