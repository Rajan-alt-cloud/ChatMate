import React, { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("chat_user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(false);

    // 1. Login Function
    const login = async (username, password) => {
        setLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);

            const res = await api.post("/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const { access_token, user_id, username: userName, email, avatar_url } = res.data;
            const userData = {
                id: user_id,
                username: userName,
                email,
                avatar_url: avatar_url || null
            };

            localStorage.setItem("token", access_token);
            localStorage.setItem("chat_user", JSON.stringify(userData));

            setToken(access_token);
            setUser(userData);
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                message: error.response?.data?.detail || "Login failed",
            };
        } finally {
            setLoading(false);
        }
    };

    // 2. Register Function (FastAPI endpoint: POST /users)
    const register = async (username, email, password) => {
        setLoading(true);
        try {
            await api.post("/users", { username, email, password });
            return await login(username, password);
        } catch (error) {
            console.error("Registration error:", error);
            return {
                success: false,
                message: error.response?.data?.detail || "Registration failed",
            };
        } finally {
            setLoading(false);
        }
    };

    // 3. Logout Function
    const logout = async () => {
        try {
            await api.post("/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("chat_user");
            setToken(null);
            setUser(null);
        }
    };

    // 4. Update User Helper (Profile Picture / Details state & storage sync)
    const updateUser = (updatedFields) => {
        setUser((prev) => {
            const updatedUser = { ...prev, ...updatedFields };
            localStorage.setItem("chat_user", JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    return (
        <AuthContext.Provider
            value={{ user, token, loading, login, register, logout, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};