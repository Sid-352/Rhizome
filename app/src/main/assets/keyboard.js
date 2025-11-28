/**
 * Virtual Keyboard Module
 * Adds a floating keyboard button and modal keyboard UI
 */

(function () {
    'use strict';

    let keyboardModal = null;
    let activeModifiers = new Set();

    /**
     * Creates and injects the keyboard button into the header
     */
    function createKeyboardButton() {
        // Wait for DOM to be ready
        const header = document.querySelector('#connection-status');
        if (!header) {
            console.error('Could not find header to add keyboard button');
            return;
        }

        const keyboardBtn = document.createElement('button');
        keyboardBtn.id = 'keyboard-btn';
        keyboardBtn.className = 'header-btn w-10 h-10 bg-green-600/80 hover:bg-green-600 rounded-full flex items-center justify-center text-white';
        keyboardBtn.innerHTML = '<i class="fa-solid fa-keyboard text-sm"></i>';
        keyboardBtn.onclick = openKeyboard;

        // Insert into header actions area (next to edit mode and disconnect)
        const headerActions = header.parentElement.querySelector('.flex.items-center.space-x-3');
        if (headerActions) {
            const disconnectBtn = document.getElementById('disconnect-btn');
            if (disconnectBtn) {
                headerActions.insertBefore(keyboardBtn, disconnectBtn);
            } else {
                headerActions.appendChild(keyboardBtn);
            }
        } else {
            header.parentElement.appendChild(keyboardBtn);
        }
    }

    /**
     * Creates the keyboard modal UI
     */
    function createKeyboardModal() {
        const modal = document.createElement('div');
        modal.id = 'keyboard-modal';
        modal.className = 'modal hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-content bg-gray-800 p-4 rounded-2xl shadow-2xl w-11/12 max-w-lg overflow-y-auto" style="max-height: 90vh;">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">Virtual Keyboard</h2>
                    <button id="keyboard-close" class="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <!-- Text Input -->
                <div class="mb-3">
                    <textarea id="keyboard-input" placeholder="Type here..." class="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="3"></textarea>
                    <button id="keyboard-send" class="w-full mt-2 p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold">
                        <i class="fa-solid fa-paper-plane mr-2"></i>Send Text
                    </button>
                </div>

                <!-- Modifiers -->
                <div class="mb-3">
                    <div class="text-xs font-bold text-gray-400 mb-2">MODIFIERS</div>
                    <div class="grid grid-cols-4 gap-2">
                        <button class="key-modifier p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold" data-key="ctrl">Ctrl</button>
                        <button class="key-modifier p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold" data-key="alt">Alt</button>
                        <button class="key-modifier p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold" data-key="shift">Shift</button>
                        <button class="key-modifier p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold" data-key="cmd">Win</button>
                    </div>
                </div>

                <!-- Special Keys -->
                <div class="mb-3">
                    <div class="text-xs font-bold text-gray-400 mb-2">SPECIAL KEYS</div>
                    <div class="grid grid-cols-4 gap-2">
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="enter">Enter</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="tab">Tab</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="esc">Esc</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="backspace">← Bksp</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="delete">Del</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="space">Space</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="home">Home</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-sm font-bold" data-key="end">End</button>
                    </div>
                </div>

                <!-- Arrow Keys -->
                <div class="mb-3">
                    <div class="text-xs font-bold text-gray-400 mb-2">ARROWS</div>
                    <div class="grid grid-cols-3 gap-2 w-40 mx-auto">
                        <div></div>
                        <button class="key-press p-3 bg-gray-700 hover:bg-indigo-600 rounded font-bold" data-key="up">↑</button>
                        <div></div>
                        <button class="key-press p-3 bg-gray-700 hover:bg-indigo-600 rounded font-bold" data-key="left">←</button>
                        <button class="key-press p-3 bg-gray-700 hover:bg-indigo-600 rounded font-bold" data-key="down">↓</button>
                        <button class="key-press p-3 bg-gray-700 hover:bg-indigo-600 rounded font-bold" data-key="right">→</button>
                    </div>
                </div>

                <!-- Function Keys -->
                <div>
                    <div class="text-xs font-bold text-gray-400 mb-2">FUNCTION KEYS</div>
                    <div class="grid grid-cols-6 gap-2">
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f1">F1</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f2">F2</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f3">F3</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f4">F4</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f5">F5</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f6">F6</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f7">F7</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f8">F8</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f9">F9</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f10">F10</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f11">F11</button>
                        <button class="key-press p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" data-key="f12">F12</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        keyboardModal = modal;

        // Attach event listeners
        document.getElementById('keyboard-close').addEventListener('click', closeKeyboard);
        document.getElementById('keyboard-send').addEventListener('click', sendText);

        // Modifier keys
        modal.querySelectorAll('.key-modifier').forEach(btn => {
            btn.addEventListener('click', () => toggleModifier(btn));
        });

        // Regular key presses
        modal.querySelectorAll('.key-press').forEach(btn => {
            btn.addEventListener('click', () => pressKey(btn.dataset.key));
        });
    }

    function openKeyboard() {
        if (!keyboardModal) createKeyboardModal();
        keyboardModal.style.display = 'flex';
    }

    function closeKeyboard() {
        if (keyboardModal) keyboardModal.style.display = 'none';
        activeModifiers.clear();
        updateModifierButtons();
    }

    function toggleModifier(btn) {
        const key = btn.dataset.key;
        if (activeModifiers.has(key)) {
            activeModifiers.delete(key);
            btn.classList.remove('bg-indigo-600');
            btn.classList.add('bg-gray-700');
        } else {
            activeModifiers.add(key);
            btn.classList.remove('bg-gray-700');
            btn.classList.add('bg-indigo-600');
        }
    }

    function updateModifierButtons() {
        if (!keyboardModal) return;
        keyboardModal.querySelectorAll('.key-modifier').forEach(btn => {
            btn.classList.remove('bg-indigo-600');
            btn.classList.add('bg-gray-700');
        });
    }

    function sendText() {
        const textarea = document.getElementById('keyboard-input');
        const text = textarea.value;
        if (!text) return;

        // Send text to server
        if (window.sendCommand) {
            window.sendCommand({ type: 'text', data: { text } });
            textarea.value = '';  // Clear after sending
        }
    }

    function pressKey(key) {
        // If modifiers are active, send as combo
        if (activeModifiers.size > 0) {
            const keys = Array.from(activeModifiers);
            keys.push(key);
            if (window.sendCommand) {
                window.sendCommand({ type: 'key_combo', data: { keys } });
            }
            activeModifiers.clear();
            updateModifierButtons();
        } else {
            // Single key press
            if (window.sendCommand) {
                window.sendCommand({ type: 'key_press', data: { key } });
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createKeyboardButton);
    } else {
        createKeyboardButton();
    }
})();
