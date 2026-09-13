"use client";

import React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { GithubIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
    ? "Configure the callback URL http://<your-domain>/api/auth/callback/github in GitHub settings."
    : "Configure the callback URL http://<your-domain>/api/auth/callback/google in Google Cloud Console.";

const LoginPage = () => {
  const [isLoadingProvider, setIsLoadingProvider] = React.useState(null);

  const handleSocialSignIn = async (provider) => {
    if (isLoadingProvider) return;

    setIsLoadingProvider(provider);
    try {
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      toast.error("Sign-in failed. Please try again.", {
        description: providerErrorHint(provider),
      });
    } finally {
      setIsLoadingProvider(null);
    }
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
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

          <div className="mb-10 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="font-medium text-muted-foreground">
              Sign in to access your AI-powered workspace
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            {PROVIDER_ORDER.map((provider) => {
              const meta = PROVIDER_META[provider];
              const Icon = meta.Icon;
              const isWorking = isLoadingProvider === provider;
              const isDisabled = isLoadingProvider !== null;

              return (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  disabled={isDisabled}
                  onClick={() => handleSocialSignIn(provider)}
                  className={cn(
                    "group relative flex h-12 w-full items-center justify-center rounded-md border-border bg-background text-sm font-medium shadow-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isDisabled && "cursor-not-allowed opacity-70",
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

export default LoginPage;