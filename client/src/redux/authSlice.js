import { createSlice } from "@reduxjs/toolkit";

const storedUser = localStorage.getItem("event_organizer_user");

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: localStorage.getItem("event_organizer_token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("event_organizer_user", JSON.stringify(action.payload.user));
      localStorage.setItem("event_organizer_token", action.payload.token);
    },
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("event_organizer_user");
      localStorage.removeItem("event_organizer_token");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
