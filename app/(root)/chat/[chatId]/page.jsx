import React from "react";
import MessageViewWithForm from "@/app/modules/chat/components/message-view-form";

const Page = async ({ params }) => {
  const { chatId } = await params;

  return (
    <div className="flex h-full flex-col">
      <MessageViewWithForm key={chatId} chatId={chatId} />
    </div>
  );
};

export default Page;
