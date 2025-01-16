"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

// a function is passd as a prop to the Chat component
const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const threadInitialized = useRef(false); 
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    if(threadInitialized.current) return;

    const createThread = async () => {
      threadInitialized.current = true;
      console.log("inside the thread");
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
      console.log("inside useeffect in chat thread\n", data.threadID); // as of now state variable is not updated
      
    };
    createThread();
  }, []);

  // const sendMessage = async (text) => {

  //   // console.log("inside send message \n", threadId);
  //   // try {
  //   //   const response = await fetch(
      
  //   //     `/api/assistants/threads/${threadId}/messages`,
  //   //     {
  //   //       method: "POST",
  //   //       body: JSON.stringify({
  //   //         content: text,
  //   //       }),
  //   //     }
  //   //   );
  //   //   console.log("raw response \n", response);
  //   //   const stream = AssistantStream.fromReadableStream(response.body); // utility class for managing and processing a stream of data from the OpenAI API.
  //   //   console.log("Response body before stream creation:", await response.text());
  //   //   console.log("inside send message stream \n", stream);
  //   //   handleReadableStream(stream);

  //   // } catch (error) {
  //   //   console.error("Error sending message: ", error);
      
  //   // }

    
  //     console.log("Sending message, threadId:", threadId);
  //     try {
  //       const response = await fetch(
  //         `/api/assistants/threads/${threadId}/messages`,
  //         {
  //           method: "POST",
  //           headers: {
  //             "Content-Type": "application/json"
  //           },
  //           body: JSON.stringify({
  //             content: text,
  //           }),
  //         }
  //       );
    
  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }
    
  //       if (!response.body) {
  //         throw new Error("Response body is null");
  //       }
    
  //       const stream = AssistantStream.fromReadableStream(response.body);
  //       handleReadableStream(stream);

  //     } catch (error) {
  //       console.error("Error sending message:", error);
  //       setInputDisabled(false);
  //     }
    
    
  // };

  const sendMessage = async (text: string) => {
    console.log("Sending message, threadId:", threadId);
    try {
      const response = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: text,
          }),
        }
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      if (!response.body) {
        throw new Error("Response body is null");
      }
  
      // Create reader and process chunks
      const reader = response.body.getReader();
      let chunks = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text
        const chunkText = new TextDecoder().decode(value);
        //console.log("Received chunk:", chunkText);  crazy amount of data
        
        // Split the chunk by newlines to get individual events
        const events = chunkText.split('\n').filter(line => line.trim());
        
        for (const eventText of events) {
          try {
            if (!eventText.trim()) continue;
            
            const event = JSON.parse(eventText);
            console.log("Parsed event:", event);
            
            // Handle different event types
            switch (event.event) {
              case "thread.message.created":
                console.log("Creating new message");
                setMessages(prevMessages => [...prevMessages, { role: "assistant", text: "" }]);
                break;
                
              case "thread.message.delta":
                if (event.data?.delta?.content?.[0]?.text?.value) {
                  const textValue = event.data.delta.content[0].text.value;
                  console.log("Adding text:", textValue);
                  setMessages(prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                      return [
                        ...prevMessages.slice(0, -1),
                        { ...lastMessage, text: lastMessage.text + textValue }
                      ];
                    }
                    return prevMessages;
                  });
                }
                break;
                
              case "thread.run.completed":
                console.log("Run completed");
                setInputDisabled(false);
                break;
            }
          } catch (error) {
            console.error("Error processing event:", error, eventText);
          }
        }
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      setInputDisabled(false);
    }
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    console.log("submitted msg \n", userInput);
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    console.log("inside handle text created\n");
    //appendMessage("assistant", "");
    setMessages(prevMessages => [...prevMessages, { role: "assistant", text: "" }]);
    console.log("inside handle text created\n");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
      console.log("null data\n", delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }


    console.log("Received text delta:", delta);
  if (delta.content && delta.content[0] && delta.content[0].text) {
    const textValue = delta.content[0].text.value;
    setMessages(prevMessages => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        const updatedMessage = {
          ...lastMessage,
          text: lastMessage.text + textValue
        };
        return [...prevMessages.slice(0, -1), updatedMessage];
      }
      return prevMessages;
    });
  }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
     console.log("inside handle readable stream \n", stream);
    // stream.on("textCreated", handleTextCreated);
    // stream.on("textDelta", handleTextDelta);

    if (!stream) {
      console.error("Stream is undefined or null");
      return;
    }
 
    // Set up message event handlers
    (stream as any).on("thread.message.created", handleTextCreated);
    (stream as any).on("thread.message.delta", handleTextDelta);
    (stream as any).on("thread.message.completed", () => {
      console.log("Message completed");
      setInputDisabled(false);
    });
    console.log("inside handle readable stream \n", stream);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      setInputDisabled(false);
    });

  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
    
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
