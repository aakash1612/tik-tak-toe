# 🎮 Multiplayer Tic-Tac-Toe Game (MERN Stack)

A **full-stack, real-time multiplayer Tic-Tac-Toe game** built using the **MERN stack**.  
Play live with another user using a room-based lobby system, real-time updates, authentication, chat, and password reset functionality.

---

## 🌐 Live Project Link

🔗 **Frontend (Live Demo):**  
https://tik-tok-toe-frontend.netlify.app/login

> ⚠️ Note: The backend is deployed separately. The app works fully when both frontend and backend are running.

---

## 🔑 Demo Login Credentials (For Interviewers)

You can use the following **pre-created demo users** to explore the application without email verification:

| Username | Password |
|--------|----------|
| user1  | 123456   |
| user2  | 123456   |

✅ Both users are verified and ready to log in  
✅ Useful for quick testing and interviews  

---

## ✨ Features

- **User Authentication**
  - Register, Login, Logout
  - JWT-based secure authentication
- **Password Reset via Email**
  - Uses email verification workflow
- **Real-time Multiplayer Gameplay**
  - Powered by Socket.IO
- **Lobby / Room System**
  - Create a unique room ID
  - Only two players allowed per room
- **Turn-based Game Logic**
  - Win, lose, and draw detection
- **Rematch Support**
  - Replay without leaving the room
- **In-game Chat**
  - Live chat between players
- **Responsive UI**
  - Works across desktop and mobile devices

---

## 🚀 Technologies Used

### 🖥 Backend (Server)
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- nodemailer (email handling)

### 🌐 Frontend (Client)
- React
- React Router
- Axios
- Socket.IO Client
- CSS3

---

## 📧 Email Service Note (Important)

Currently, the project uses **Mailtrap** for email testing purposes:

- Registration verification emails
- Password reset emails

🔒 **Why Mailtrap?**
- Safe for development
- Prevents sending real emails during testing

💡 **Production Ready**
- Mailtrap can be easily replaced with real email services like:
  - Gmail SMTP
  - SendGrid
  - Amazon SES

> The email logic is already implemented — only credentials need to be updated for production use.

---

## ⚙️ Installation & Setup (Local Development)

### ✅ Prerequisites
- Node.js (v14+)
- npm
- MongoDB (Local or MongoDB Atlas)

---

### 1️⃣ Clone the Repository
```bash
git clone <repository_url>
cd tic-tac-toe


