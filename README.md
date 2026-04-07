# 🎭 AI Emotion Recognition

A full-stack application that detects facial emotions in real-time using AI and provides a comprehensive health monitoring dashboard with user authentication.

## ✨ Features

- **🎥 Real-time Emotion Detection**: Analyze emotions from webcam feed or uploaded images
- **📊 Health Monitoring Dashboard**: Track emotion patterns and trends over time
- **🔐 User Authentication**: Secure login and user management with JWT tokens
- **📈 Emotion History**: View detailed emotion logs and statistics
- **💡 Health Tips**: AI-generated wellness recommendations based on emotional state
- **🌐 Responsive Design**: Works seamlessly on desktop and mobile devices
- **⚡ Fast Processing**: Built with FastAPI for optimal performance

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI
- **ML/AI**: DeepFace (facial emotion recognition)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Server**: Uvicorn

### Frontend
- **HTML5**, **CSS3**, **JavaScript (Vanilla)**
- **Webcam API** for real-time video capture
- **Fetch API** for backend communication

## 📋 Prerequisites

- Python 3.10+
- Node.js (for package management)
- Webcam or image files for emotion detection

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-emotion-recognition.git
cd ai-emotion-recognition
```

### 2. Setup Backend Environment

```bash
npm run setup-python
```

This command will:
- Create a Python virtual environment (`backend-venv`)
- Install all required Python dependencies

### 3. Start the Backend

```bash
npm run backend
```

Or run directly:

```bash
cd backend-venv\Scripts
activate.bat
cd ..
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:8001
```

## 📁 Project Structure

```
ai-emotion-recognition/
├── backend/                    # FastAPI backend application
│   ├── main.py                # Main application & endpoints
│   ├── emotion.py             # DeepFace emotion detection logic
│   ├── database.py            # SQLAlchemy ORM & database models
│   ├── tips.py                # AI-generated health tips
│   ├── requirements.txt        # Python dependencies
│   └── ...
├── frontend/                   # Static web application
│   ├── index.html             # Main HTML file
│   ├── css/
│   │   └── style.css          # Styling
│   └── js/
│       ├── app.js             # Main application logic
│       ├── api.js             # API communication layer
│       ├── auth.js            # Authentication handling
│       ├── dashboard.js       # Dashboard functionality
│       ├── webcam.js          # Webcam integration
│       ├── upload.js          # Image upload handling
│       ├── history.js         # History view logic
│       └── settings.js        # User settings
├── backend-venv/              # Python virtual environment
├── package.json               # Node.js project metadata
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Emotion Detection
- `POST /detect` - Detect emotion from uploaded image
- `POST /detect-webcam` - Detect emotion from webcam frame

### Dashboard & History
- `GET /dashboard` - Get emotion stats and trends
- `GET /history` - Get emotion history with pagination
- `GET /tips` - Get AI-generated health tips

### User Management
- `PUT /user/settings` - Update user preferences
- `GET /user/profile` - Get user profile information

## 🎯 Usage

### 1. Register/Login
- Create a new account or login with existing credentials
- Your dashboard and emotion history will be personalized

### 2. Detect Emotions
- **Via Webcam**: Click "Start Webcam" to capture emotions in real-time
- **Via Upload**: Upload an image to detect emotions

### 3. View Dashboard
- Monitor emotion trends and patterns
- Check health statistics and recommendations
- View emotion history with detailed timestamps

### 4. Tips & Wellness
- Get personalized health tips based on your emotional state
- Track wellness improvements over time

## 🔧 Configuration

### Backend Settings

Edit `backend/main.py` to configure:
- CORS origins
- JWT secret key
- Database location
- API host and port

### Frontend Settings

Edit `frontend/js/api.js` to configure:
- Backend API URL
- Request timeout
- Error handling

## 🧪 Testing

Run emotion detection on sample images:

```bash
cd backend
python -c "from emotion import detect_emotion; detect_emotion('path/to/image.jpg')"
```

## 📊 Database

The application uses SQLite with the following main tables:
- **users**: User accounts and authentication info
- **emotions**: Detected emotion records with timestamps
- **health_logs**: Health metrics and wellness data

Database file: `backend/database.db`

## 🔐 Security

- JWT-based authentication for all user endpoints
- CORS restrictions for API access
- Password hashing with Argon2
- Secure token verification on each request
- Input validation and sanitization

## 📦 Dependencies

### Python (Backend)
- fastapi
- uvicorn
- sqlalchemy
- deepface
- pydantic
- python-dotenv
- cryptography
- pytz

### JavaScript (Frontend)
- Vanilla JS (no external dependencies for core functionality)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Shlokraj Sinha**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [DeepFace](https://github.com/serengalp/deepface) for facial emotion recognition
- [FastAPI](https://fastapi.tiangolo.com/) for the web framework
- [SQLAlchemy](https://www.sqlalchemy.org/) for database ORM

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8001
kill -9 <PID>
```

### Webcam Permission Issues
- Check browser permissions for camera access
- Ensure HTTPS is used in production
- Clear browser cache if issues persist

### Emotion Detection Not Working
- Verify DeepFace is installed: `pip list | grep deepface`
- Check image quality and lighting
- Ensure face is clearly visible in the image/frame

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Read the documentation in the docs/ folder

---

**Made with ❤️ for understanding and monitoring emotional well-being**
