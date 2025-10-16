# Smart Rehabilitation Knee Sleeve App

An intelligent mobile application designed to assist in knee rehabilitation monitoring and guidance using wearable sensor technology.

Developed by the Concordia Biomedical Engineering Club, this project combines real-time sensor data from a smart knee sleeve with a user-friendly mobile app to provide personalized rehabilitation exercises, progress tracking, and professional insights.

<!-- Optional: Add a build status badge here once you set up CI/CD -->
<!-- ![GitHub Actions CI](https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app/actions/workflows/ci.yml/badge.svg) -->

## 📖 Table of Contents

- [About The Project](#about-the-project)
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏛️ System Architecture](#️-system-architecture)
- [🚀 Getting Started](#-getting-started)
- [📂 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [⚖️ License](#️-license)
- [📞 Contact](#-contact)

---

## ℹ️ About The Project

The Smart Rehabilitation Knee Sleeve App is a **digital health solution** designed to enhance knee rehabilitation outcomes by providing real-time monitoring, personalized exercise guidance, and data-driven insights for patients and healthcare professionals.

Developed by the Concordia Biomedical Engineering Club, this project integrates wearable sensor technology with mobile application development to create a comprehensive rehabilitation platform that supports recovery from knee injuries and surgeries.

The application uses advanced sensor data processing and machine learning algorithms to track rehabilitation progress, provide real-time feedback, and generate personalized exercise recommendations.

---

## ✨ Key Features

- **Real-Time Sensor Monitoring:** Continuous tracking of knee movement, range of motion, and biomechanical data through integrated IMU sensors.
- **Personalized Exercise Plans:** AI-driven exercise recommendations based on patient recovery stage, sensor data, and clinical protocols.
- **Progress Analytics Dashboard:** Visual analytics showing rehabilitation milestones, improvement trends, and comparative performance metrics.
- **Healthcare Provider Integration:** Secure platform for healthcare professionals to monitor patient progress and adjust treatment plans remotely.
- **Offline Capability:** Core functionality works without internet connectivity for uninterrupted rehabilitation sessions.
- **Cross-Platform Mobile Support:** Native apps for iOS and Android with responsive web interface for healthcare providers.
- **Data Security & Privacy:** HIPAA-compliant data handling with end-to-end encryption and secure cloud storage.

---

## 🛠️ Tech Stack

This project is built with a modern set of tools and frameworks:

- **Mobile:** 📱 React Native (primary), Flutter (alternative)
- **Backend:** 🚀 FastAPI (Python), Node.js (alternative)
- **Machine Learning:** 🧠 TensorFlow Lite, Scikit-learn
- **Database:** 🗄️ PostgreSQL (primary), MongoDB (alternative)
- **IoT/Sensors:** 🔌 Bluetooth Low Energy, ESP32 firmware, IMU sensors
- **Cloud:** ☁️ AWS (Amplify, IoT Core, Lambda), Firebase (alternative)
- **DevOps:** 🐳 Docker, 🐙 GitHub Actions
- **Project Management:** 📋 GitHub Projects, Notion

---

## 🏛️ System Architecture

The application is designed as a modular, multi-component system:

1. **Mobile App:** The primary user interface for patients, handling sensor data collection, exercise guidance, and progress visualization.
2. **Wearable Device:** Smart knee sleeve with integrated IMU sensors (accelerometer, gyroscope) for motion tracking and biometric data collection.
3. **Backend API:** Cloud-based service for data processing, exercise plan generation, ML inference, and analytics.
4. **Database:** Secure storage for patient data, exercise history, sensor readings, and rehabilitation progress.
5. **Admin Dashboard:** Web interface for healthcare professionals to manage patients, view detailed analytics, and adjust treatment protocols.
6. **Firmware:** Embedded code for the ESP32 microcontroller managing sensor data acquisition and Bluetooth communication.

---

## 🚀 Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Python](https://www.python.org/downloads/) 3.9+ (for backend)
- [Node.js](https://nodejs.org/) 16+ (for mobile/web development)
- [Flutter](https://flutter.dev/) or [React Native CLI](https://reactnative.dev/docs/environment-setup) (for mobile development)
- [Docker](https://www.docker.com/products/docker-desktop/) (for containerization)
- [Arduino IDE](https://www.arduino.cc/en/software) or [ESP-IDF](https://docs.espressif.com/projects/esp-idf/en/latest/) (for firmware development)

### Local Development Setup

1. **Clone the repository:**
    ```sh
    git clone https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app.git
    cd smart-sleeve-app
    ```

2. **Set up the Backend:**
    * Create and activate a virtual environment:
        ```sh
        # For macOS/Linux
        python3 -m venv venv
        source venv/bin/activate

        # For Windows
        python -m venv venv
        .\venv\Scripts\activate
        ```
    * Install the required dependencies:
        ```sh
        pip install -r backend/requirements.txt
        ```

3. **Run the API Server:**
    * The server will run using Uvicorn. The `--reload` flag enables hot-reloading for development.
        ```sh
        uvicorn backend.main:app --reload
        ```
    * Your API is now running! You can view the interactive documentation at `http://127.0.0.1:8000/docs`.

4. **Set up the Mobile App:**
    * For React Native:
        ```sh
        cd mobile
        npm install
        npx react-native run-ios  # or run-android
        ```
    * For Flutter:
        ```sh
        cd mobile
        flutter pub get
        flutter run
        ```

5. **Set up the Firmware (Optional):**
    * Install ESP-IDF framework
    * Open the firmware directory in VS Code with ESP-IDF extension
    * Build and flash to ESP32 device

---

## 📂 Project Structure

```
/smart-sleeve-app
├── .github/                 # GitHub Actions workflows and templates
├── backend/                 # FastAPI backend code, ML models, and APIs
│   ├── app/                 # Main application code
│   ├── models/              # ML models and data processing
│   └── tests/               # Backend unit tests
├── mobile/                  # React Native mobile application
│   ├── src/                 # Source code
│   ├── android/             # Android-specific code
│   └── ios/                 # iOS-specific code
├── web/                     # Admin dashboard web application (React)
├── firmware/                # ESP32 firmware for smart sleeve
├── docs/                    # Project documentation and architectural decisions
├── docker/                  # Docker configurations
├── CONTRIBUTING.md          # Guidelines for contributors
├── LICENSE                  # GNU AGPLv3 license
└── README.md                # This file
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests to us.

---

## ⚠️ Disclaimer

This project is for educational and portfolio purposes only. The application and data provided by the Smart Rehabilitation Knee Sleeve App are **not a substitute for professional medical advice, diagnosis, or treatment.**

This tool is designed to be an informational aid and a **supplementary tool for qualified healthcare professionals.** It is **not a certified medical device** and should not be used for primary diagnosis or treatment decisions.

**Always consult a qualified healthcare professional for any health concerns.**

---

## ⚖️ License & Commercial Use

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**. See the `LICENSE` file for the full text.

In simple terms, this means you are free to use, modify, and distribute this software, provided that any derivative work you make available over a network is also licensed under the AGPLv3 and you share its source code.

**For inquiries about alternative commercial licensing** for use in proprietary, closed-source applications, please contact the project lead.

---

## 📞 Contact

**Youssef Jedidi** - Project Lead

- **Email:** `youssefjedidi2022 [at] gmail [dot] com`
- **LinkedIn:** [Youssef Jedidi's Profile](https://www.linkedin.com/in/youssef-jedidi/)

**Concordia Biomedical Engineering Club**

Project Link: [https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app](https://github.com/Concordia-Biomedical-Engineering-Club/smart-sleeve-app)