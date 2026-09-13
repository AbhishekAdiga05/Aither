"use client";

import React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { GithubIcon, Loader2, TriangleAlert } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const PROVIDER_ORDER = ["github", "google"];

const PROVIDER_META = {
  github: {
    label: "Sign in with GitHub",
    Icon: GithubIcon,
  },
  google: {
    label: "Sign in with Google",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.1 0-9.5-3.2-11.2-7.7l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 40.1 44 34.7 44 24c0-1.3-.1-2.6-.4-3.9z"
        />
      </svg>
    ),
  },
};

const providerErrorHint = (provider) =>
  provider === "github"
    ? "Add http://<your-domain>/api/auth/callback/github to the GitHub OAuth app's callback URLs."
    : "Add http://<your-domain>/api/auth/callback/google to the Google Cloud Console's authorized redirect URIs.";

const OAUTH_ERROR_MESSAGES = {
  signup_disabled:
    "This account isn't invited yet — sign-ups are currently disabled.",
  access_denied: "The sign-in request was cancelled.",
  invalid_origin:
    "Sign-in failed: the request came from an untrusted origin. If you're testing on your phone, open the exact URL shown by the dev server.",
  oauth_provider_not_found: "The sign-in provider isn't configured.",
  invalid_callback_url:
    "The sign-in redirect is invalid. Re-try from the app's home address.",
  no_callback_url:
    "The sign-in redirect is invalid. Re-try from the app's home address.",
  internal_server_error:
    "Something went wrong on our side. Please try again in a moment.",
  failed_to_verify_code: "The sign-in couldn't be verified. Please try again.",
  unable_to_get_user_info:
    "We couldn't fetch your profile from the provider. Please try again.",
  account_already_linked_to_different_user:
    "This account is linked to a different user already.",
};

const describeOAuthError = (error) => {
  if (!error) return null;
  const key = Object.keys(OAUTH_ERROR_MESSAGES).find((code) =>
    error.toLowerCase().includes(code.replaceAll("_", " ")),
  );
  return key ? OAUTH_ERROR_MESSAGES[key] : null;
};

const SIGN_IN_RATE_LIMITED =
  "Too many sign-in attempts — wait a minute and try again.";

const handleSocialSignInError = ({ provider, error }) => {
  const serverMessage = error?.error?.message ?? error?.message;

  if (/rate limit|too many attempts/i.test(serverMessage ?? "")) {
    toast.error("Slow down", { description: SIGN_IN_RATE_LIMITED });
    return;
  }

  if (/provider not found/i.test(serverMessage ?? "")) {
    toast.error(`${provider} sign-in isn't set up yet`, {
      description: `This rarely happens locally and usually means the ${provider.toUpperCase()}_CLIENT_ID / ${provider.toUpperCase()}_CLIENT_SECRET environment variables are missing on the server. Add them in your hosting dashboard and redeploy.`,
    });
    return;
  }

  toast.error("Sign-in failed", {
    description: serverMessage || providerErrorHint(provider),
  });
};

const SignInContent = () => {
  const [isLoadingProvider, setIsLoadingProvider] = React.useState(null);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const oauthErrorText = describeOAuthError(oauthError);

  // Which providers are configured on the server (env vars present).
  const { data: providerStatus } = useQuery({
    queryKey: ["auth-providers"],
    queryFn: async () => {
      const res = await fetch("/api/auth/providers", {
        headers: { "cache-control": "no-store" },
      });
      if (!res.ok) throw new Error("Failed to read provider status");
      return res.json();
    },
    staleTime: 60_000,
  });
  const configuredProviders = providerStatus?.providers ?? [];
  const providersLoaded = Array.isArray(providerStatus?.providers);
  const unconfiguredProviders = providersLoaded
    ? PROVIDER_ORDER.filter((provider) => !configuredProviders.includes(provider))
    : [];

  React.useEffect(() => {
    if (oauthErrorText) {
      toast.error("Sign-in failed", {
        description: oauthErrorText,
      });
    }
  }, [oauthErrorText]);

  const handleSocialSignIn = async (provider) => {
    if (isLoadingProvider) return;

    setIsLoadingProvider(provider);
    let result;
    try {
      result = await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      handleSocialSignInError({ provider, error });
    } finally {
      setIsLoadingProvider(null);
    }
    return result;
  };

  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
          <div className="mb-8 rounded-2xl bg-muted/60 p-4">
            <Image
              src="/logo.png"
              alt="App logo"
              width={100}
              height={35}
              priority
              unoptimized
              className="h-auto w-20 object-contain rounded-2xl"
            />
          </div>

          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="font-medium text-muted-foreground">
              Sign in to access your AI-powered workspace
            </p>
          </div>

          {oauthErrorText && (
            <div
              role="alert"
              className="mb-6 flex w-full items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-left text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{oauthErrorText}</span>
            </div>
          )}

          {unconfiguredProviders.length > 0 && (
            <div
              role="alert"
              className="mb-6 flex w-full items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-left text-sm text-amber-600 dark:text-amber-400"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {unconfiguredProviders
                  .map((p) => `${p.toUpperCase()}_CLIENT_ID`)
                  .join(" and ")}{" "}
                {unconfiguredProviders.length === 1 ? "is" : "are"} missing on
                the server, so {unconfiguredProviders.join(" and ")} sign-in{" "}
                {unconfiguredProviders.length === 1 ? "is" : "are"} unavailable.
                Add the OAuth credentials (client ID + secret) in your hosting
                environment and redeploy.
              </span>
            </div>
          )}

          <div className="flex w-full flex-col gap-3">
            {PROVIDER_ORDER.map((provider) => {
              const meta = PROVIDER_META[provider];
              const Icon = meta.Icon;
              const isWorking = isLoadingProvider === provider;
              const isDisabled = isLoadingProvider !== null;
              const isConfigured = !configuredProviders.length
                ? true // data not loaded yet — stay optimistic, don't flash
                : configuredProviders.includes(provider);

              return (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  disabled={!isConfigured || isDisabled}
                  onClick={() => handleSocialSignIn(provider)}
                  className={cn(
                    "group relative flex h-12 w-full items-center justify-center rounded-md border-border bg-background text-sm font-medium shadow-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "active:scale-[0.99]",
                    (!isConfigured || isDisabled) && "cursor-not-allowed opacity-70",
                  )}
                >
                  {isWorking && (
                    <Loader2 className="absolute left-5 h-5 w-5 animate-spin text-primary" />
                  )}
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 shrink-0",
                      provider === "github" && "text-foreground",
                    )}
                  />
                  {meta.label}
                </Button>
              );
            })}
          </div>

          <p className="mt-8 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Secure Authentication by Better-Auth
          </p>
        </div>
      </div>
    </section>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
};

export default LoginPage;