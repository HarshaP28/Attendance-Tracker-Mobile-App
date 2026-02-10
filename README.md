# 📚 Attendance Tracker Mobile App

A simple and intuitive mobile-first web application designed to help students record and monitor their attendance for different subjects. The app automatically calculates attendance percentages and saves data locally for easy access anytime.

![Initial State](https://github.com/user-attachments/assets/92531586-424d-454a-bc0e-dedf4a351d17)

## ✨ Features

- **Add Subjects**: Enter subject name, total classes, and classes attended
- **Automatic Calculation**: Attendance percentage is calculated automatically
- **Color-Coded Display**: Visual feedback with color-coded progress bars:
  - 🟢 Green/Blue (≥75%): Good attendance
  - 🟠 Orange (60-74%): Medium attendance
  - 🔴 Red (<60%): Low attendance
- **Update Attendance**: Easily update attendance records for existing subjects
- **Local Storage**: Data is saved automatically in your browser
- **Delete Subjects**: Remove subjects you no longer need
- **Mobile-First Design**: Responsive interface optimized for mobile devices
- **Clean UI**: Modern, intuitive design with smooth animations

![Multiple Subjects](https://github.com/user-attachments/assets/525d7186-b0af-432c-9e47-9a2a8ffcf5fb)

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.19.0 or v22.12.0 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HarshaP28/Attendance-Tracker-Mobile-App.git
cd Attendance-Tracker-Mobile-App
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

To create a production build:
```bash
npm run build
```

The built files will be in the `dist` directory.

To preview the production build:
```bash
npm run preview
```

## 📱 How to Use

### Adding a New Subject

1. Enter the subject name (e.g., "Mathematics")
2. Enter the total number of classes
3. Enter the number of classes you attended
4. Click "Add Subject"

The app will automatically calculate and display your attendance percentage with a color-coded progress bar.

### Updating Attendance

1. Click "Update Attendance" on any subject card
2. Modify the total classes and/or attended classes
3. Click "Save" to update, or "Cancel" to discard changes

![Update Mode](https://github.com/user-attachments/assets/6e988277-6e88-4427-b559-755dd7a811b1)

### Deleting a Subject

Click the "Delete" button on any subject card and confirm the deletion.

## 💾 Data Persistence

All attendance data is stored locally in your browser's localStorage. This means:
- Data persists between browser sessions
- No internet connection required
- Data is private to your device
- Clearing browser data will remove saved attendance records

## 🛠️ Technology Stack

- **React** - UI library
- **Vite** - Build tool and development server
- **CSS3** - Styling with modern gradients and animations
- **LocalStorage API** - Client-side data persistence

## 📂 Project Structure

```
Attendance-Tracker-Mobile-App/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Project dependencies
└── README.md           # Documentation
```

## 🎨 Color Scheme

The app uses a beautiful gradient color scheme:
- Primary: Purple to Blue gradient (#667eea to #764ba2)
- High Attendance: Blue/Purple gradient
- Medium Attendance: Orange gradient
- Low Attendance: Red gradient
- Background: Purple gradient

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

HarshaP28

## 🙏 Acknowledgments

- Built with React and Vite
- Inspired by the need for simple attendance tracking for students