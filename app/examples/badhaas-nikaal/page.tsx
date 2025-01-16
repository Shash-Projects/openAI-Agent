"use client";
import React,  {useState} from "react";
import styles from "../shared/page.module.css";
import styles2 from "../../components/chat.module.css";
import Markdown from "react-markdown";
import {openai} from '../../openai'

// import Chat from "../../components/chat";
// import FileViewer from "../../components/file-viewer";

type MessageProps = {
    role: "user" | "system" | "code";
    text: string;
  };

const Message = ({ role, text }: MessageProps) => {
    switch (role) {
      case "user":
        return <div className={styles2.userMessage}>{text}</div>;
      case "system":
        return (
            <div className={styles2.assistantMessage}>
              <Markdown>{text}</Markdown>
            </div>
          );
      case "code":
        return (
            <div className={styles2.codeMessage}>
              {text.split("\n").map((line, index) => (
                <div key={index}>
                  <span>{`${index + 1}. `}</span>
                  {line}
                </div>
              ))}
            </div>
          );
      default:
        return null;
    }
};  



const FileSearchPage = async() => {

    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [inputDisabled, setInputDisabled] = useState(false);


    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            {
                role: "user",
                content: "Write a haiku about recursion in programming.",
            },
        ],
    });

    const handleSubmit = (e)=>{
        e.preventDefault();
        if (!userInput) return;
        setMessages((prevMessages)=>[...prevMessages, {role: "user", text: userInput}]);
        setUserInput("");
        setInputDisabled(true);
        console.log(completion);
        console.log(completion.choices[0].message.content);
        setMessages((prevMessages)=>[...prevMessages, {role: "system", text: completion.choices[0].message.content}]);
        
    }

    


  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
          {/* <FileViewer /> */}
            </div>
                <div className={styles.chatContainer}>
                <div className={styles.chat}>
                <div className={styles.chatContainer}>
            <div className={styles.messages}>
                {messages.map((msg, index) => (
                <Message key={index} role={msg.role} text={msg.text} />
                ))}
                {/* <div ref={messagesEndRef} /> */}
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
            </div>
            </div>
      </div>
    </main>
  );
};

export default FileSearchPage;
