import { cookies } from "next/headers";
import SignInCard from "./sign-in-card";

// Server component: reads the visitor cookie so the initial greeting is
// rendered correctly on first paint (no JS flash for new users).
// A new visitor has no cookie → "Welcome"; returning visitors get "Welcome back".
const SignInPage = async () => {
  const cookieStore = await cookies();
  const returningVisitor = Boolean(cookieStore.get("aither_visited"));

  return <SignInCard initialReturningVisitor={returningVisitor} />;
};

export default SignInPage;