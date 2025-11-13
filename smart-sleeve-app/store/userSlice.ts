import { createSlice } from '@reduxjs/toolkit';

interface UserState {
  isLoggedIn: boolean;
  email: string | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  isLoggedIn: false,
  email: null,
  isAuthenticated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (state, action) => {
      state.isLoggedIn = true;
      state.email = action.payload.email;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    signup: (state, action) => {
      state.isLoggedIn = true;
      state.email = action.payload.email;
      state.isAuthenticated = action.payload.isAuthenticated;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.email = null;
      state.isAuthenticated = false;
    },
  },
});

export const { login, signup, logout } = userSlice.actions;
export default userSlice.reducer;
