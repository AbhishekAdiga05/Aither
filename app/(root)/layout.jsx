import { currentUser } from "@/app/modules/authentication/actions";
import { getAllChats } from "@/app/modules/chat/actions";
import { AppShell } from "@/app/modules/chat/components/app-shell";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

const Layout = async ({ children }) => {
  const user = await currentUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: chats } = await getAllChats();

  return (
    <AppShell user={user} chats={chats || []}>
      {children}
    </AppShell>
  );
};

export default Layout;