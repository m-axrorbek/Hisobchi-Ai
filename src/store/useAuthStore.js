import { v4 as uuid } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,

      async register({ name, email, password }) {
        const cleanName = String(name || "").trim();
        const cleanEmail = normalizeEmail(email);
        const cleanPassword = String(password || "");

        if (cleanName.length < 2) {
          throw new Error("AUTH_NAME_INVALID");
        }
        if (!isValidEmail(cleanEmail)) {
          throw new Error("AUTH_EMAIL_INVALID");
        }
        if (cleanPassword.length < 6) {
          throw new Error("AUTH_PASSWORD_SHORT");
        }
        if (get().users.some((user) => user.email === cleanEmail)) {
          throw new Error("AUTH_EMAIL_TAKEN");
        }

        const passwordHash = await hashPassword(cleanPassword, cleanEmail);
        const nextUser = {
          id: uuid(),
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          users: [...state.users, nextUser],
          currentUser: toSessionUser(nextUser)
        }));

        return toSessionUser(nextUser);
      },

      async login({ email, password }) {
        const cleanEmail = normalizeEmail(email);
        const cleanPassword = String(password || "");
        const matchedUser = get().users.find((user) => user.email === cleanEmail);

        if (!matchedUser) {
          throw new Error("AUTH_LOGIN_FAILED");
        }

        const passwordHash = await hashPassword(cleanPassword, cleanEmail);
        if (matchedUser.passwordHash !== passwordHash) {
          throw new Error("AUTH_LOGIN_FAILED");
        }

        const sessionUser = toSessionUser(matchedUser);
        set({ currentUser: sessionUser });
        return sessionUser;
      },

      async updatePassword({ password }) {
        const activeUserId = get().currentUser?.id;
        const cleanPassword = String(password || "");

        if (!activeUserId) {
          throw new Error("AUTH_SESSION_MISSING");
        }
        if (cleanPassword.length < 6) {
          throw new Error("AUTH_PASSWORD_SHORT");
        }

        const targetUser = get().users.find((user) => user.id === activeUserId);
        if (!targetUser) {
          throw new Error("AUTH_SESSION_MISSING");
        }

        const passwordHash = await hashPassword(cleanPassword, targetUser.email);
        set((state) => ({
          users: state.users.map((user) =>
            user.id === activeUserId
              ? {
                  ...user,
                  passwordHash,
                  updatedAt: new Date().toISOString()
                }
              : user
          )
        }));
      },

      async updateProfile({ name }) {
        const activeUserId = get().currentUser?.id;
        const cleanName = String(name || "").trim();

        if (!activeUserId) {
          throw new Error("AUTH_SESSION_MISSING");
        }
        if (cleanName.length < 2) {
          throw new Error("AUTH_NAME_INVALID");
        }

        set((state) => ({
          users: state.users.map((user) =>
            user.id === activeUserId
              ? {
                  ...user,
                  name: cleanName,
                  updatedAt: new Date().toISOString()
                }
              : user
          ),
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                name: cleanName
              }
            : state.currentUser
        }));
      },

      logout() {
        set({ currentUser: null });
      }
    }),
    {
      name: "hisobchi-auth",
      version: 1,
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser
      })
    }
  )
);

const toSessionUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email
});

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));

const hashPassword = async (password, salt) => {
  const text = `${salt}:${password}`;
  if (window.crypto?.subtle && typeof window.TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  return text;
};
