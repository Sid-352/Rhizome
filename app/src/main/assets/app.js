document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // --- GLOBAL STATE AND VARIABLES ---
    // =================================================================
    let ws = null;
    let isEditMode = false;
    let commands = [];
    let editingCommandId = null;
    let lastX = 0, lastY = 0;
    let lastScrollY = 0;
    let isDragging = false;
    let isScrolling = false;
    let tapTimeout = null;

    // =================================================================
    // --- DOM ELEMENT SELECTION ---
    // =================================================================
    const $ = (selector) => document.getElementById(selector);
    const mainUI = $('main-ui'), connectModal = $('connection-modal');
    const connectBtn = $('connect-btn'), disconnectBtn = $('disconnect-btn');
    const ipInput = $('ip-input'), keyInput = $('key-input');
    const statusDot = $('status-dot'), statusText = $('status-text'), modalStatus = $('modal-status');
    const mainGrid = $('main-grid'), editModeToggle = $('edit-mode-toggle');
    const trackpad = $('trackpad'), leftClickBtn = $('left-click-btn'), rightClickBtn = $('right-click-btn');
    const sensitivitySlider = $('sensitivity-slider');
    const editorModal = $('editor-modal'), editorTitle = $('editor-title'), editorLabel = $('editor-label');
    const editorColor = $('editor-color'), editorType = $('editor-type'), editorParams = $('editor-params');
    const editorSave = $('editor-save'), editorCancel = $('editor-cancel'), editorDelete = $('editor-delete');

    // =================================================================
    // --- CONFIGURATION DATA ---
    // =================================================================
    const defaultCommands = [
        { id: 'cmd-1', label: 'Play/Pause', type: 'media_control', params: { action: 'media_play_pause' }, color: '#2563eb', row: 1, col: 1, w: 2, h: 1 },
        { id: 'cmd-2', label: '⏮', type: 'media_control', params: { action: 'media_previous' }, color: '#3b82f6', row: 2, col: 1, w: 1, h: 1 },
        { id: 'cmd-3', label: '⏭', type: 'media_control', params: { action: 'media_next' }, color: '#3b82f6', row: 2, col: 2, w: 1, h: 1 },
        { id: 'cmd-4', label: 'Vol Up', type: 'media_control', params: { action: 'volume_up' }, color: '#16a34a', row: 1, col: 3, w: 1, h: 1 },
        { id: 'cmd-5', label: 'Vol Down', type: 'media_control', params: { action: 'volume_down' }, color: '#16a34a', row: 1, col: 4, w: 1, h: 1 },
        { id: 'cmd-6', label: 'Mute', type: 'media_control', params: { action: 'volume_mute' }, color: '#dc2626', row: 2, col: 3, w: 2, h: 1 },
    ];
    const commandTypes = {
        'key_press': 'Key Press', 'key_combo': 'Key Combo', 'text': 'Type Text',
        'media_control': 'Media Control', 'website': 'Open Website', 'shell': 'Run Shell Command', 'macro': 'Run Macro'
    };

    // =================================================================
    // --- WEBSOCKET & CORE LOGIC ---
    // =================================================================
    /** Provides haptic feedback by calling the native Android function. */
    function vibrate() {
        if (window.Android && typeof window.Android.performHapticFeedback === 'function') {
            window.Android.performHapticFeedback();
        }
    }

    function connect() {
        const ip = ipInput.value.trim();
        const key = keyInput.value.trim();
        if (!ip || !key) {
            modalStatus.textContent = "IP and Secret Key are required.";
            return;
        }
        localStorage.setItem('remote-pc-ip', ip);
        updateStatus('connecting', 'Connecting...');
        ws = new WebSocket(`ws://${ip}:${59874}`);

        ws.onopen = () => {
            ws.send(JSON.stringify({ key: key }));
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'handshake_success') {
                updateStatus('connected', `Connected`);
                connectModal.style.display = 'none';
                mainUI.style.display = 'flex';
            } else if (msg.type === 'auth_failed') {
                ws.close(1000, "Authentication Failed");
            }
        };

        ws.onerror = () => updateStatus('disconnected', 'Connection Failed');

        ws.onclose = (event) => {
            const reason = event.reason || 'Disconnected';
            updateStatus('disconnected', reason);
            if(mainUI) mainUI.style.display = 'none';
            if(connectModal) connectModal.style.display = 'flex';
            if(modalStatus) modalStatus.textContent = reason;
        };
    }

    function disconnect() { if (ws) ws.close(1000, "User disconnected"); }

    function sendCommand(command) {
        vibrate();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(command));
        } else {
            console.warn("WebSocket is not connected.");
            disconnect();
        }
    }

    function updateStatus(state, text) {
        if(statusDot) statusDot.className = `status-dot status-${state}`;
        if(statusText) statusText.textContent = text;
    }

    // =================================================================
    // --- UI RENDERING & STATE MANAGEMENT ---
    // =================================================================
    function loadCommands() {
        const savedCommands = localStorage.getItem('modular-remote-commands');
        commands = savedCommands ? JSON.parse(savedCommands) : defaultCommands;
        renderGrid();
    }

    function saveCommands() {
        localStorage.setItem('modular-remote-commands', JSON.stringify(commands));
        renderGrid();
    }
    
    function renderGrid() {
        mainGrid.innerHTML = '';
        mainGrid.classList.toggle('edit-mode', isEditMode);
        const occupiedSlots = new Set();
        commands.forEach(cmd => {
            for(let r=0; r < (cmd.h || 1); r++) for(let c=0; c < (cmd.w || 1); c++) occupiedSlots.add(`${cmd.row + r}-${cmd.col + c}`);
            const btn = document.createElement('div');
            btn.className = 'btn-command btn';
            btn.innerHTML = `<span>${cmd.label}</span>`;
            btn.dataset.id = cmd.id;
            btn.style.backgroundColor = cmd.color;
            btn.style.gridArea = `${cmd.row} / ${cmd.col} / span ${cmd.h || 1} / span ${cmd.w || 1}`;
            btn.onclick = isEditMode ? () => openEditor(cmd.id) : () => sendCommand({ type: cmd.type, data: cmd.params });
            mainGrid.appendChild(btn);
        });
        if (isEditMode) {
            const maxRows = 8, maxCols = 4;
            for (let r = 1; r <= maxRows; r++) {
                for (let c = 1; c <= maxCols; c++) {
                    if (!occupiedSlots.has(`${r}-${c}`)) {
                        const addBtn = document.createElement('button');
                        addBtn.className = 'btn-add';
                        addBtn.innerHTML = '<i class="fa-solid fa-plus text-2xl"></i>';
                        addBtn.style.gridArea = `${r} / ${c}`;
                        addBtn.onclick = () => openEditor(null, r, c);
                        mainGrid.appendChild(addBtn);
                    }
                }
            }
        }
    }

    // =================================================================
    // --- COMMAND EDITOR MODAL LOGIC ---
    // =================================================================
    function openEditor(id, row, col) {
        editorModal.style.display = 'flex';
        editingCommandId = id;
        editorType.innerHTML = Object.entries(commandTypes).map(([val, text]) => `<option value="${val}">${text}</option>`).join('');
        if (id) {
            const cmd = commands.find(c => c.id === id);
            editorTitle.textContent = 'Edit Command';
            editorLabel.value = cmd.label;
            editorColor.value = cmd.color;
            editorType.value = cmd.type;
            editorDelete.style.display = 'block';
            updateEditorParams(cmd.type, {...cmd.params, w: cmd.w, h: cmd.h});
        } else {
            editorTitle.textContent = 'Add Command';
            editorLabel.value = '';
            editorColor.value = '#4A5568';
            editorType.value = 'key_press';
            editorDelete.style.display = 'none';
            editorParams.dataset.row = row;
            editorParams.dataset.col = col;
            updateEditorParams('key_press', { w: 1, h: 1 });
        }
    }

    function closeEditor() {
        editorModal.style.display = 'none';
        editingCommandId = null;
    }

    function updateEditorParams(type, params = {}) {
        let html = '';
        switch (type) {
            case 'key_press': html = `<label class="editor-label">Key</label><input type="text" id="param-key" class="editor-input" placeholder="e.g., enter, a, f5" value="${params.key || ''}">`; break;
            case 'key_combo': html = `<label class="editor-label">Keys (comma separated)</label><input type="text" id="param-keys" class="editor-input" placeholder="e.g., ctrl,alt,delete" value="${(params.keys || []).join(',')}">`; break;
            case 'text': html = `<label class="editor-label">Text to Type</label><input type="text" id="param-text" class="editor-input" placeholder="Hello, World!" value="${params.text || ''}">`; break;
            case 'media_control':
                const opts = ['media_play_pause', 'media_next', 'media_previous', 'volume_up', 'volume_down', 'volume_mute'];
                html = `<label class="editor-label">Action</label><select id="param-action" class="editor-input">${opts.map(o => `<option value="${o}" ${params.action === o ? 'selected' : ''}>${o.replace(/_/g, ' ')}</option>`).join('')}</select>`; break;
            case 'website': html = `<label class="editor-label">URL</label><input type="url" id="param-url" class="editor-input" placeholder="https://example.com" value="${params.url || ''}">`; break;
            case 'shell': html = `<label class="editor-label">Shell Command</label><input type="text" id="param-command" class="editor-input" placeholder="e.g., notepad.exe" value="${params.command || ''}"><p class="text-xs text-yellow-400 mt-1">Warning: This can be dangerous.</p>`; break;
            case 'macro':
                html = `<label class="editor-label">Macro Script</label>
                        <textarea id="param-script" class="editor-input font-mono" rows="6" placeholder='TYPE "Hello"\nWAIT 1\nPRESS enter'>${params.script || ''}</textarea>
                        <p class="text-xs text-gray-400 mt-1">Commands: TYPE, PRESS, COMBO, WAIT.</p>`;
                break;
        }
        html += `<div class="flex space-x-4 mt-4">
                        <div><label class="editor-label">Width (cols)</label><input type="number" id="param-w" class="editor-input" min="1" max="4" value="${params.w || 1}"></div>
                        <div><label class="editor-label">Height (rows)</label><input type="number" id="param-h" class="editor-input" min="1" max="4" value="${params.h || 1}"></div>
                    </div>`;
        editorParams.innerHTML = html;
    }
    
    function handleSave() {
        const label = editorLabel.value.trim();
        if (!label) {
            alert('Label cannot be empty.');
            return;
        }
        const type = editorType.value;
        const params = {};
        const w = parseInt(document.getElementById('param-w')?.value || 1, 10);
        const h = parseInt(document.getElementById('param-h')?.value || 1, 10);

        switch (type) {
            case 'key_press': params.key = $('param-key').value; break;
            case 'key_combo': params.keys = $('param-keys').value.split(',').map(k => k.trim()); break;
            case 'text': params.text = $('param-text').value; break;
            case 'media_control': params.action = $('param-action').value; break;
            case 'website': params.url = $('param-url').value; break;
            case 'shell': params.command = $('param-command').value; break;
            case 'macro': params.script = $('param-script').value; break;
        }
        
        if (editingCommandId) {
            const index = commands.findIndex(c => c.id === editingCommandId);
            if (index > -1) commands[index] = { ...commands[index], label, type, color: editorColor.value, params, w, h };
        } else {
            const newCmd = { id: `cmd-${Date.now()}`, label, type, color: editorColor.value, params, w, h, row: parseInt(editorParams.dataset.row), col: parseInt(editorParams.dataset.col) };
            commands.push(newCmd);
        }
        saveCommands();
        closeEditor();
    }

    function handleDelete() {
        if (confirm('Are you sure you want to delete this command?')) {
            commands = commands.filter(c => c.id !== editingCommandId);
            saveCommands();
            closeEditor();
        }
    }

    // =================================================================
    // --- EVENT LISTENERS ---
    // =================================================================
    ipInput.value = localStorage.getItem('remote-pc-ip') || '';
    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);
    editModeToggle.addEventListener('change', (e) => { isEditMode = e.target.checked; renderGrid(); });
    editorType.addEventListener('change', (e) => updateEditorParams(e.target.value));
    editorSave.addEventListener('click', handleSave);
    editorCancel.addEventListener('click', closeEditor);
    editorDelete.addEventListener('click', handleDelete);
    // --- OPTIMIZED Trackpad Listeners ---
    let accumulatedDx = 0;
    let accumulatedDy = 0;
    let animationFrameId = null;

    function sendMoveUpdate() {
        if (accumulatedDx !== 0 || accumulatedDy !== 0) {
            sendCommand({ type: 'mouse_move', data: { dx: accumulatedDx, dy: accumulatedDy } });
            accumulatedDx = 0;
            accumulatedDy = 0;
        }
        animationFrameId = null;
    }

    trackpad.addEventListener('touchstart', (e) => {
        if (isEditMode) return;
        e.preventDefault();
        const touches = e.touches;
        if (touches.length === 1) {
            isDragging = false;
            const touch = touches[0];
            lastX = touch.clientX;
            lastY = touch.clientY;
            tapTimeout = setTimeout(() => { isDragging = true; }, 150);
        } else if (touches.length === 2) {
            clearTimeout(tapTimeout);
            isScrolling = true;
            lastScrollY = (touches[0].clientY + touches[1].clientY) / 2;
        }
    });

    trackpad.addEventListener('touchmove', (e) => {
        if (isEditMode) return;
        e.preventDefault();
        const touches = e.touches;
        if (touches.length === 1 && isDragging) {
            const touch = touches[0];
            accumulatedDx += touch.clientX - lastX;
            accumulatedDy += touch.clientY - lastY;
            lastX = touch.clientX;
            lastY = touch.clientY;

            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(sendMoveUpdate);
            }
        } else if (touches.length === 2 && isScrolling) {
            // (Your existing two-finger scroll logic can go here, it's already efficient enough)
            const currentScrollY = (touches[0].clientY + touches[1].clientY) / 2;
            const dy = currentScrollY - lastScrollY;
            lastScrollY = currentScrollY;
            if (Math.abs(dy) > 1) {
                const sensitivity = parseInt(sensitivitySlider.value, 10) * 0.1;
                const scrollAmount = -dy * sensitivity;
                sendCommand({ type: 'mouse_scroll', data: { dy: scrollAmount } });
            }
        }
    });

    trackpad.addEventListener('touchend', (e) => {
        if (isEditMode) return;
        e.preventDefault();
        clearTimeout(tapTimeout);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            sendMoveUpdate(); // Send any remaining movement
        }
        if (!isDragging && !isScrolling && e.changedTouches.length === 1) {
            sendCommand({ type: 'mouse_click', data: { button: 'left' } });
        }
        if (e.touches.length === 0) {
            isDragging = false;
            isScrolling = false;
        }
    });
    leftClickBtn.addEventListener('click', () => { if (!isEditMode) sendCommand({ type: 'mouse_click', data: { button: 'left' } }); });
    rightClickBtn.addEventListener('click', () => { if (!isEditMode) sendCommand({ type: 'mouse_click', data: { button: 'right' } }); });

    // =================================================================
    // --- INITIALIZATION ---
    // =================================================================
    loadCommands();
});