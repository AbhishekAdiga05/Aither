import React from "react";
import MessageViewWithForm from "@/app/modules/chat/components/message-view-form";

const Page = async ({ params }) => {
  const { chatId } = await params;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <MessageViewWithForm key={chatId} chatId={chatId} />
    </div>
  );
};

export default Page;
