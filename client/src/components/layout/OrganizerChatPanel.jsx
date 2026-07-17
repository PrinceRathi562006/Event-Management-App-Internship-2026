import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileUp, MessageCircle, Paperclip, Reply, Send, X } from "lucide-react";
import { useSelector } from "react-redux";
import api from "../../services/api";
import { getSocket } from "../../services/socketClient";

function formatTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function upsertMessage(messages, nextMessage) {
  if (!nextMessage?._id || messages.some((message) => message._id === nextMessage._id)) {
    return messages;
  }

  return [...messages, nextMessage];
}

function OrganizerChatPanel() {
  const user = useSelector((state) => state.auth.user);
  const [canAccess, setCanAccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    if (!user) {
      queueMicrotask(() => {
        if (mounted) {
          setCanAccess(false);
        }
      });

      return () => {
        mounted = false;
      };
    }

    api
      .get("/chat/organizer/access")
      .then((response) => {
        if (mounted) {
          setCanAccess(Boolean(response.data.canAccess));
        }
      })
      .catch(() => {
        if (mounted) {
          setCanAccess(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!canAccess) {
      return;
    }

    api
      .get("/chat/organizer/messages")
      .then((response) => setMessages(response.data.messages || []))
      .catch(() => setMessages([]));

    let activeSocket;

    getSocket()
      .then((socket) => {
        activeSocket = socket;
        activeSocket.emit("join-organizer-chat");
        activeSocket.on("organizer-chat-message", (nextMessage) => {
          setMessages((current) => upsertMessage(current, nextMessage));
        });
      })
      .catch(() => {});

    return () => {
      activeSocket?.off("organizer-chat-message");
    };
  }, [canAccess]);

  useEffect(() => {
    if (open) {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  const selectedFileNames = useMemo(() => files.map((file) => file.name).join(", "), [files]);

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!message.trim() && files.length === 0) {
      return;
    }

    setSending(true);

    try {
      const payload = new FormData();
      payload.append("message", message.trim());

      if (replyTo?._id) {
        payload.append("replyTo", replyTo._id);
      }

      files.forEach((file) => payload.append("attachments", file));

      const response = await api.post("/chat/organizer/messages", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((current) => upsertMessage(current, response.data.message));
      setMessage("");
      setFiles([]);
      setReplyTo(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Message failed");
    } finally {
      setSending(false);
    }
  };

  if (!canAccess) {
    return null;
  }

  return (
    <div className="organizer-chat-menu">
      <button
        aria-label="Organizer chat"
        className="icon-button organizer-chat-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MessageCircle size={18} />
      </button>
      {open && (
        <div className="organizer-chat-dropdown">
          <div className="organizer-chat-head">
            <div>
              <strong>Organizer Chat</strong>
              <span>Admins, organizers, and event coordinators</span>
            </div>
            <button aria-label="Close chat" onClick={() => setOpen(false)} type="button">
              <X size={18} />
            </button>
          </div>

          <div className="organizer-chat-thread" ref={threadRef}>
            {messages.length ? (
              messages.map((item) => {
                const mine = item.sender?._id === user?._id;

                return (
                  <article className={`organizer-chat-message${mine ? " mine" : ""}`} key={item._id}>
                    {item.replyTo && (
                      <div className="organizer-chat-reply">
                        <span>{item.replyTo.sender?.name || "Message"}</span>
                        <p>{item.replyTo.message || item.replyTo.attachments?.[0]?.originalName}</p>
                      </div>
                    )}
                    <div className="organizer-chat-meta">
                      <strong>{item.sender?.name || "User"}</strong>
                      <span>{item.sender?.role} / {formatTime(item.createdAt)}</span>
                    </div>
                    {item.message && <p>{item.message}</p>}
                    {item.attachments?.length > 0 && (
                      <div className="organizer-chat-files">
                        {item.attachments.map((attachment) => (
                          <a href={attachment.url} key={attachment.url} rel="noreferrer" target="_blank">
                            <FileUp size={15} /> {attachment.originalName}
                          </a>
                        ))}
                      </div>
                    )}
                    <button className="organizer-chat-reply-button" onClick={() => setReplyTo(item)} type="button">
                      <Reply size={14} /> Reply
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="organizer-chat-empty">No messages yet.</div>
            )}
          </div>

          {replyTo && (
            <div className="organizer-chat-compose-reply">
              <span>Replying to {replyTo.sender?.name || "message"}</span>
              <button onClick={() => setReplyTo(null)} type="button">Clear</button>
            </div>
          )}

          {selectedFileNames && <div className="organizer-chat-compose-reply">{selectedFileNames}</div>}

          <form className="organizer-chat-compose" onSubmit={sendMessage}>
            <label className="icon-button" title="Attach files">
              <Paperclip size={17} />
              <input
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
                type="file"
              />
            </label>
            <input
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message organizers, admins, coordinators"
              value={message}
            />
            <button aria-label="Send message" className="primary-button" disabled={sending} type="submit">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default OrganizerChatPanel;
