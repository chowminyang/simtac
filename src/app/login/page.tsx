import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) || {};
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#f8f6f1_45%,#f3f3f0_100%)] px-4">
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
