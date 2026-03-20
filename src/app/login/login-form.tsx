"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        let message = "Unable to sign in.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex justify-center">
        <Image
          src="/ttsh-logo.jpg"
          alt="Tan Tock Seng Hospital logo"
          width={496}
          height={308}
          className="h-24 w-auto object-contain sm:h-28"
          unoptimized
          loading="eager"
        />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">SIMTAC Access</h1>
      <p className="mt-2 text-sm text-slate-600">Enter the site password to continue.</p>
      <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-600">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          required
        />
      </label>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Checking..." : "Unlock Site"}
      </button>
    </form>
  );
}
