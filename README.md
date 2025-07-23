# Rhizome: A PC Remote Control

A powerful, fully customizable remote control built via a Python server and an Android client. 

Please check the [Wiki](https://github.com/Sid-352/Rhizome/wiki) for instructions and other information. For latest releases and compiled binaries, please check out the [Releases](https://github.com/Sid-352/Rhizome/releases) page.

---

## Features

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

## Setup & Installation Guide

See the [Setup Guide](https://github.com/Sid-352/Rhizome/wiki/Setup%E2%80%90Guide) wiki page for detailed information.

## How to Use & Customize

-   **Trackpad**: The large area at the top is your trackpad. Use one finger to move the cursor and two fingers to scroll vertically.
-   **Command Buttons**: Tap any of the pre-configured buttons to perform an action.
-   **Edit Mode**:
    -   Tap the **"EDIT"** toggle in the header to enter Edit Mode.
    -   In this mode, you can tap any existing button to open the **Command Editor**.
    -   Tap any empty grid slot (marked with a **+**) to create a new button.
    -   In the editor, you can change the button's label, color, size (width/height in grid units), and the action it performs.
- See the [Creating Macros](https://github.com/Sid-352/Rhizome/wiki/Creating%E2%80%90Macros) for more information about this feature.

## Future Improvements

-   [ ] **QR Code Connection**
-   [ ] **System Tray Icon**
-   [ ] **Customizable Themes**
---
