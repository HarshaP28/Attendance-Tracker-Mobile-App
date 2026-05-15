# Attendance-Tracker-Mobile-App

- Attendance Tracker Mobile App – Setup Guide
Project Repository

Attendance Tracker Mobile App

Installation & Setup Guide
Prerequisites

Before starting, make sure the following software is installed on your system:

Node.js
MySQL Server
Expo Go App (Android/iOS)
A code editor such as:
Visual Studio Code
Sublime Text
WebStorm

- Step 1: Database Setup
Open the MySQL application on your system.
Create a new database named:
attendance_system
Go to the DB_Setup folder in the project repository.
Download the provided SQL file.
Open the SQL file in MySQL.
Execute all the SQL queries one by one.

After successful execution, the database setup will be completed.

- Step 2: Configure the Project
Download or clone the project repository.
Open the project in your preferred code editor.
Navigate to the following folder:
constants/config.ts
Find the IP address field inside config.ts.
Open Command Prompt and type:
ipconfig
Copy your system’s IPv4 Address.

Example:

192.168.1.5
Replace the old IP address in config.ts with your system IP address.
Save the file.

- Step 3: Run the Backend Server

Open the first terminal and run the following commands:

cd Attendance_Tracker_App
cd attendance-node-backend
node index.js

If everything is configured correctly, you will see a message similar to:

Connected to MySQL!

This means the backend server is running successfully.

- Step 4: Run the Mobile Application

Open a second terminal and run the following commands:

cd Attendance_Tracker_App
cd AttendanceAppUpdated
npx expo start -c

This command will start the Expo Metro Bundler.

- Step 5: Run the App on Mobile
After running the Expo command, a QR code will appear in the terminal or browser.
Install the Expo Go app on your mobile device.
Open Expo Go.
Scan the QR code displayed on your system.
The Attendance Tracker Mobile App will automatically load on your mobile device.


- Project Structure
Attendance_Tracker_App
│
├── attendance-node-backend     → Backend server
├── AttendanceAppUpdated        → Mobile application
├── DB_Setup                    → Database SQL files
└── constants/config.ts         → IP configuration


- Important Notes
Ensure both your computer and mobile device are connected to the same Wi-Fi network.
MySQL server must be running before starting the backend.
Do not close the terminals while using the application.
If the app does not load, restart Expo using:
npx expo start -c



- Technologies Used
Node.js
MySQL
Expo
React Native


