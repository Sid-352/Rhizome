# Rhizome: A PC Remote Control

A powerful, fully customizable remote control built via a Python server and an Android client. For latest releases and compiled binaries, please check out the [Releases](https://github.com/Sid-352/Rhizome/releases) page.

---

## Core Features

-   **Mouse Control**: A trackpad with cursor movement, two-finger scrolling, and dedicated left/right-click buttons.
-   **Customizable Command Grid**: An in-app editor that allows you to add, remove, resize, and re-color buttons.
-   **Powerful Macro Engine**: Automate complex tasks by programming buttons to execute a sequence of commands, such as typing text, pressing keys, and waiting for set intervals.
-   **Versatile Action Types**:
    -   **Media Controls**: Native support for Play/Pause, Volume Up/Down, Mute, and Next/Previous Track.
    -   **Key Presses**: Simulate any single key press (e.g., `Enter`, `F5`, `space`).
    -   **Key Combos**: Execute complex shortcuts like `Ctrl+Alt+Delete` or `Ctrl+Shift+Esc`.
    -   **Text Input**: Type any string of text on your PC.
    -   **Website Launcher**: Open any URL in your default browser.
    -   **Shell Commands**: Run any command-line script or open any program.

---

## Architecture

-   **The Server**: A Python script that runs on your computer.
    -   **Language**: Python 3
    -   **Core Libraries**:
        -   `websockets`: For handling the real-time, low-latency connection with the client.
        -   `pynput`: For programmatically controlling the host computer's mouse and keyboard.

-   **The Client**: A native Android app that serves as a container for the web-based user interface.
    -   **Platform**: Android (built with Android Studio)
    -   **Language**: Kotlin
    -   **Core Component**: Fullscreen `WebView` that renders the user interface.
    -   **UI**: Interface built with **HTML**, **CSS**, and **JavaScript**.

---

## Setup & Installation Guide

**If you are not utilizing the pre-compiled binaries**, follow these steps to get the remote up and running. Otherwise skip to `4.` for both Steps.

### Step 1: The PC Server

1.  **Install Python**: Install Python 3 from [python.org](https://python.org/).
2.  **Install Dependencies**: Open a terminal or command prompt and install the required libraries using pip:
    ```bash
    pip install websockets pynput ujson
    ```
3.  **Configure the Server**:
    -   Navigate to the `server` folder.
    -   Open the `config.ini` file in a text editor.
    -   Set a `secret_key` that you will use to connect from your phone.
    ```ini
    [server]
    port = 59874
    secret_key = key_here
    ```
4.  **Run the Server**:
    -   In your terminal, while in the `server` folder.
    -   Run the script:
    ```bash
    python server.py
    ```
    -   The server will start and display its local IP address (e.g., `192.168.1.5`) and your secret key. Keep this window open.

### Step 2: The Android App

1.  **Open in Android Studio**: Open the root folder of the project in Android Studio.
2.  **Build the APK**:
    -   From the menu bar, go to **Build > Generate Signed Bundle / APK...**.
    -   Select **APK** and follow the on-screen instructions to create a new keystore (a one-time process for signing your app).
    -   Choose the **release** build variant.
3.  **Install the App**:
    -   After the build is complete, find the generated `app-release.apk` file in the `app/release` folder.
    -   Transfer this file to your Android phone and install it. (You may need to enable installation from unknown sources).
4.  **Connect**:
    -   Ensure your phone is on the **same Wi-Fi network** as your PC.
    -   Open the PC Remote app on your phone.
    -   Enter the IP address and secret key that are displayed in the server's terminal window.
    -   Tap "Connect"

---

## How to Use & Customize

-   **Trackpad**: The large area at the top is your trackpad. Use one finger to move the cursor and two fingers to scroll vertically.
-   **Command Buttons**: Tap any of the pre-configured buttons to perform an action.
-   **Edit Mode**:
    -   Tap the **"EDIT"** toggle in the header to enter Edit Mode.
    -   In this mode, you can tap any existing button to open the **Command Editor**.
    -   Tap any empty grid slot (marked with a **+**) to create a new button.
    -   In the editor, you can change the button's label, color, size (width/height in grid units), and the action it performs.
    -   **Example Macro**: To make a button that opens Notepad and types "Hello World", you would set the action type to `macro` and use this script:
        ```
        PRESS cmd+r
        WAIT 0.5
        TYPE notepad
        PRESS enter
        WAIT 1
        TYPE Hello World!
        ```

---

## Future Improvements

-   [ ] **QR Code Connection**
-   [ ] **System Tray Icon**
-   [ ] **Customizable Themes**
