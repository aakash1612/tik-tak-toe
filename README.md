# 🎮 Multiplayer Tic-Tac-Toe Game (MERN Stack)

A **full-stack, real-time multiplayer Tic-Tac-Toe game** built using the **MERN stack**.  
Play live with another user using a room-based lobby system, real-time updates, authentication, chat, and password reset functionality.

---

## 🌐 Live Project Link

🔗 **Frontend (Live Demo):**  
https://tik-tok-toe-frontend.netlify.app/login

> ⚠️ Note: The backend is deployed separately. The application works fully when both frontend and backend are running.

---

## 🔑 Demo Login Credentials (For Interviewers)

You can use the following **pre-created demo users** to explore the application without email verification:

| Username | Password |
|---------|----------|
| user1   | 123456   |
| user2   | 123456   |

✅ Both users are verified and ready to log in  
✅ Useful for quick testing and interviews  

---

## ✨ Features

- User Authentication (Register, Login, Logout)
- JWT-based secure authentication
- Password reset via email
- Real-time multiplayer gameplay using Socket.IO
- Lobby / Room system (unique room ID)
- Turn-based game logic (win, lose, draw)
- Rematch functionality
- In-game chat
- Responsive UI for desktop and mobile

---

## 🚀 Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- bcryptjs
- jsonwebtoken
- nodemailer

### Frontend
- React
- React Router
- Axios
- Socket.IO Client
- CSS3

---

## 📧 Email Service Note

This project currently uses **Mailtrap** for email testing:

- Registration verification emails
- Password reset emails

Mailtrap is used only for development to avoid sending real emails.

🔄 For production, Mailtrap can be replaced with:
- Gmail SMTP
- SendGrid
- Amazon SES

> Email functionality is already implemented — only credentials need to be changed.

---

## ⚙️ Installation & Setup (Local Development)

### Prerequisites
- Node.js (v14 or higher)
- npm
- MongoDB (local or MongoDB Atlas)

---

### Step 1: Clone the Repository
```bash
git clone <repository_url>
cd tic-tac-toe
```
### Step 2: Install Dependencies
```bash
Backend
cd server
npm install
Frontend
cd ../client
npm install
```
### Step 3: Run the Application
```bash
Start Backend (Terminal 1)
cd server
npm start
Backend runs on: http://localhost:5000

Start Frontend (Terminal 2)
cd client
npm start
Frontend runs on:http://localhost:3000


