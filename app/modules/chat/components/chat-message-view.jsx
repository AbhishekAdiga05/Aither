"use client";

import React, { useState } from 'react'
import ChatWelcomeTabs from './chat-welcome-tabs';
import ChatMessageForm from './chat-message-form';

const ChatMessageView = ({user}) => {
  const [selectedMessage, setSelectedMessage] = useState("");

  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
  };

  const handleMessageChange = () => {
    setSelectedMessage("");
  };

  return (
    <div className="flex h-full flex-col items-center justify-start overflow-y-auto scrollbar-hide py-8 gap-y-8 sm:py-12 sm:gap-y-16">
        <div className="w-full flex flex-col items-center">
          <ChatWelcomeTabs
            userName={user?.name}
            onMessageSelect={handleMessageSelect}
          />
        </div>
        <div className="w-full max-w-4xl px-4 mt-auto">
          <ChatMessageForm
            initialMessage={selectedMessage}
            onMessageChange={handleMessageChange}
          />
        </div>
    </div>
  )
}

export default ChatMessageView
