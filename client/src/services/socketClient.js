import api from "./api";

let socketPromise;

function getSocketBaseUrl() {
  const apiUrl = api.defaults.baseURL || "";

  if (apiUrl.startsWith("http")) {
    return apiUrl.replace(/\/api\/?$/, "");
  }

  return window.location.origin;
}

function loadSocketScript(baseUrl) {
  if (window.io) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${baseUrl}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getSocket() {
  if (!socketPromise) {
    socketPromise = (async () => {
      const baseUrl = getSocketBaseUrl();
      await loadSocketScript(baseUrl);

      return window.io(baseUrl, {
        auth: {
          token: localStorage.getItem("event_organizer_token"),
        },
        withCredentials: true,
      });
    })();
  }

  return socketPromise;
}
