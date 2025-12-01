/**
 * Terminal.js - Client-side functionality for Proving Grounds BBS
 */

(function() {
    'use strict';

    // Baud rate simulation settings
    // Characters per second = baud / 10 (8 data bits + start + stop)
    // Delay in ms = 1000 / (baud / 10) = 10000 / baud
    const BAUD_RATES = {
        '300': { name: '300 baud', delay: 33, cps: 30 },
        '1200': { name: '1200 baud', delay: 8, cps: 120 },
        '2400': { name: '2400 baud', delay: 4, cps: 240 },
        '9600': { name: '9600 baud', delay: 1, cps: 960 },
        '14400': { name: '14.4k baud', delay: 0.7, cps: 1440 },
        '28800': { name: '28.8k baud', delay: 0.35, cps: 2880 },
        'unlimited': { name: 'Unlimited', delay: 0, cps: Infinity }
    };

    let currentBaudRate = localStorage.getItem('baudRate') || 'unlimited';
    let isRendering = false;

    // Screen color themes (early 1980s phosphor monitors)
    const SCREEN_THEMES = {
        'native': {
            name: 'Native',
            bg: '#000000',
            text: '#00ff00',
            dim: '#008800',
            bright: '#88ff88',
            border: '#00aa00',
            link: '#00ffff',
            highlight: '#003300'
        },
        'green': {
            name: 'Green Phosphor',
            bg: '#000000',
            text: '#00ff00',
            dim: '#008800',
            bright: '#88ff88',
            border: '#00aa00',
            link: '#88ff88',
            highlight: '#003300',
            warning: '#88ff88',
            error: '#00ff00'
        },
        'amber': {
            name: 'Amber Phosphor',
            bg: '#000000',
            text: '#ffb000',
            dim: '#996600',
            bright: '#ffcc44',
            border: '#cc8800',
            link: '#ffcc44',
            highlight: '#331a00',
            warning: '#ffcc44',
            error: '#ffb000'
        },
        'white': {
            name: 'White Phosphor',
            bg: '#000000',
            text: '#cccccc',
            dim: '#666666',
            bright: '#ffffff',
            border: '#999999',
            link: '#ffffff',
            highlight: '#1a1a1a',
            warning: '#ffffff',
            error: '#cccccc'
        }
    };

    let currentTheme = localStorage.getItem('screenTheme') || 'native';

    /**
     * Get current screen theme
     */
    function getScreenTheme() {
        return currentTheme;
    }

    /**
     * Set screen theme and apply it
     */
    function setScreenTheme(theme) {
        if (SCREEN_THEMES[theme]) {
            currentTheme = theme;
            localStorage.setItem('screenTheme', theme);
            applyScreenTheme(theme);
            updateThemeDisplay();
        }
    }

    /**
     * Apply screen theme to CSS variables
     */
    function applyScreenTheme(theme) {
        const colors = SCREEN_THEMES[theme];
        const root = document.documentElement;

        root.style.setProperty('--bg-color', colors.bg);
        root.style.setProperty('--text-color', colors.text);
        root.style.setProperty('--dim-color', colors.dim);
        root.style.setProperty('--bright-color', colors.bright);
        root.style.setProperty('--border-color', colors.border);
        root.style.setProperty('--link-color', colors.link);
        root.style.setProperty('--highlight-bg', colors.highlight);

        // Apply monochrome overrides for phosphor themes
        if (colors.warning) {
            root.style.setProperty('--warning-color', colors.warning);
        } else {
            root.style.setProperty('--warning-color', '#ffff00');
        }
        if (colors.error) {
            root.style.setProperty('--error-color', colors.error);
        } else {
            root.style.setProperty('--error-color', '#ff0000');
        }
    }

    /**
     * Update theme display in selector
     */
    function updateThemeDisplay() {
        const select = document.getElementById('screen-theme');
        if (select) {
            select.value = currentTheme;
        }
    }

    /**
     * Get current baud rate setting
     */
    function getBaudRate() {
        return currentBaudRate;
    }

    /**
     * Set baud rate and persist to localStorage
     */
    function setBaudRate(rate) {
        if (BAUD_RATES[rate]) {
            currentBaudRate = rate;
            localStorage.setItem('baudRate', rate);
            updateBaudRateDisplay();
        }
    }

    /**
     * Render text with baud rate simulation
     */
    function renderWithBaud(element, text, callback) {
        const rate = BAUD_RATES[currentBaudRate];

        if (rate.delay === 0 || !text) {
            element.textContent = text;
            if (callback) callback();
            return;
        }

        isRendering = true;
        element.textContent = '';
        let i = 0;

        function renderChar() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(renderChar, rate.delay);
            } else {
                isRendering = false;
                if (callback) callback();
            }
        }

        renderChar();
    }

    /**
     * Render entire page content with baud simulation
     * Renders text AND styling incrementally with authentic block cursor
     */
    function renderPageWithBaud() {
        const rate = BAUD_RATES[currentBaudRate];
        if (rate.delay === 0) return; // Skip if unlimited

        const terminal = document.querySelector('.terminal');
        if (!terminal) return;

        // Create the block cursor element (█ was standard on CRT terminals)
        const cursor = document.createElement('span');
        cursor.className = 'baud-cursor';
        cursor.textContent = '\u2588'; // █ Full block character
        cursor.style.cssText = 'animation: blink 0.5s step-end infinite;';

        // Collect all elements and text nodes in render order
        const renderQueue = [];
        const elementsToReveal = new Set();

        function collectNodes(parent) {
            for (const child of parent.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    if (child.textContent.trim() || child.textContent.includes('\n')) {
                        renderQueue.push({
                            type: 'text',
                            node: child,
                            fullText: child.textContent,
                            currentLength: 0
                        });
                        child.textContent = '';
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    // Hide element initially, will reveal when we reach its content
                    child.style.visibility = 'hidden';
                    elementsToReveal.add(child);
                    collectNodes(child);
                }
            }
        }

        collectNodes(terminal);
        if (renderQueue.length === 0) return;

        let currentIndex = 0;
        isRendering = true;

        // Reveal an element and all its ancestors
        function revealElement(node) {
            let el = node.parentElement;
            while (el && el !== terminal) {
                if (elementsToReveal.has(el)) {
                    el.style.visibility = 'visible';
                    elementsToReveal.delete(el);
                }
                el = el.parentElement;
            }
        }

        // Position cursor after the current text node
        function positionCursor(node) {
            // Insert cursor after the text node
            if (node.nextSibling !== cursor) {
                node.parentNode.insertBefore(cursor, node.nextSibling);
            }
        }

        function renderChar() {
            if (!isRendering) return;

            if (currentIndex < renderQueue.length) {
                const current = renderQueue[currentIndex];

                if (current.type === 'text') {
                    // Reveal containing elements on first char
                    if (current.currentLength === 0) {
                        revealElement(current.node);
                    }

                    if (current.currentLength < current.fullText.length) {
                        current.currentLength++;
                        current.node.textContent = current.fullText.substring(0, current.currentLength);
                        positionCursor(current.node);
                        setTimeout(renderChar, rate.delay);
                    } else {
                        currentIndex++;
                        renderChar(); // Move to next immediately
                    }
                }
            } else {
                // Done - ensure everything is visible and remove cursor
                isRendering = false;
                if (cursor.parentNode) cursor.remove();
                elementsToReveal.forEach(el => el.style.visibility = 'visible');
            }
        }

        renderChar();

        // Allow skip on any key press or click
        function skipRender(e) {
            if (isRendering) {
                isRendering = false;
                // Remove cursor and restore all text and visibility immediately
                if (cursor.parentNode) cursor.remove();
                renderQueue.forEach(item => {
                    if (item.type === 'text') {
                        item.node.textContent = item.fullText;
                    }
                });
                elementsToReveal.forEach(el => el.style.visibility = 'visible');
                document.removeEventListener('keydown', skipRender);
                document.removeEventListener('click', skipRender);
            }
        }
        document.addEventListener('keydown', skipRender);
        document.addEventListener('click', skipRender);
    }

    /**
     * Create settings selector UI (baud rate + screen theme)
     */
    function createSettingsSelector() {
        const selector = document.createElement('div');
        selector.className = 'terminal-settings';
        selector.innerHTML = `
            <label for="screen-theme" style="color: var(--dim-color); font-size: 11px;">SCREEN:</label>
            <select id="screen-theme" style="
                background: var(--bg-color, #000);
                color: var(--text-color, #0f0);
                border: 1px solid var(--border-color, #0a0);
                font-family: inherit;
                font-size: 11px;
                padding: 2px;
            ">
                ${Object.entries(SCREEN_THEMES).map(([key, val]) =>
                    `<option value="${key}" ${key === currentTheme ? 'selected' : ''}>${val.name}</option>`
                ).join('')}
            </select>
            <label for="baud-rate" style="color: var(--dim-color); font-size: 11px; margin-left: 10px;">BAUD:</label>
            <select id="baud-rate" style="
                background: var(--bg-color, #000);
                color: var(--text-color, #0f0);
                border: 1px solid var(--border-color, #0a0);
                font-family: inherit;
                font-size: 11px;
                padding: 2px;
            ">
                ${Object.entries(BAUD_RATES).map(([key, val]) =>
                    `<option value="${key}" ${key === currentBaudRate ? 'selected' : ''}>${val.name}</option>`
                ).join('')}
            </select>
        `;
        selector.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 5px;
        `;

        selector.querySelector('#screen-theme').addEventListener('change', function(e) {
            setScreenTheme(e.target.value);
        });

        selector.querySelector('#baud-rate').addEventListener('change', function(e) {
            setBaudRate(e.target.value);
        });

        return selector;
    }

    /**
     * Update baud rate display in selector
     */
    function updateBaudRateDisplay() {
        const select = document.getElementById('baud-rate');
        if (select) {
            select.value = currentBaudRate;
        }
    }

    // Keyboard shortcuts for menu navigation
    document.addEventListener('keypress', function(e) {
        // Skip if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        const key = e.key.toUpperCase();

        // Find menu items with matching keys
        const menuItems = document.querySelectorAll('.menu-item');
        for (const item of menuItems) {
            const keySpan = item.querySelector('.menu-key');
            if (keySpan) {
                const menuKey = keySpan.textContent.replace(/[()]/g, '').toUpperCase();
                if (menuKey === key || menuKey === key + ')') {
                    const link = item.querySelector('a');
                    const button = item.querySelector('button');
                    const form = item.querySelector('form');

                    if (link) {
                        e.preventDefault();
                        link.click();
                        return;
                    } else if (button) {
                        e.preventDefault();
                        button.click();
                        return;
                    } else if (form) {
                        e.preventDefault();
                        form.submit();
                        return;
                    }
                }
            }
        }

        // Handle < for back navigation
        if (key === '<' || key === ',') {
            const backLinks = document.querySelectorAll('a[href*="Return"], a[href="/main"], a[href="/"]');
            for (const link of backLinks) {
                if (link.closest('.menu-item')) {
                    e.preventDefault();
                    link.click();
                    return;
                }
            }
        }
    });

    // Auto-focus first input on page load
    window.addEventListener('load', function() {
        const firstInput = document.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
        if (firstInput && !firstInput.hasAttribute('autofocus')) {
            // Only focus if no other element already has focus
            if (document.activeElement === document.body) {
                firstInput.focus();
            }
        }
    });

    // Add typing effect to ASCII art (optional, disabled by default)
    function typeWriter(element, speed) {
        const text = element.textContent;
        element.textContent = '';
        element.style.visibility = 'visible';

        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    // Blinking cursor effect
    function addBlinkingCursor() {
        const prompts = document.querySelectorAll('.prompt');
        prompts.forEach(function(prompt) {
            if (!prompt.querySelector('.cursor')) {
                const cursor = document.createElement('span');
                cursor.className = 'cursor loading';
                cursor.textContent = '_';
                const input = prompt.querySelector('input');
                if (input) {
                    input.addEventListener('focus', function() {
                        cursor.style.display = 'none';
                    });
                    input.addEventListener('blur', function() {
                        cursor.style.display = 'inline';
                    });
                }
            }
        });
    }

    // Sound effects (optional)
    const sounds = {
        keypress: null,
        error: null,
        success: null
    };

    function playSound(name) {
        if (sounds[name]) {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(function() {});
        }
    }

    // Flash messages auto-hide
    function setupMessageAutoHide() {
        const messages = document.querySelectorAll('.message-success');
        messages.forEach(function(msg) {
            setTimeout(function() {
                msg.style.transition = 'opacity 1s';
                msg.style.opacity = '0';
                setTimeout(function() {
                    msg.style.display = 'none';
                }, 1000);
            }, 5000);
        });
    }

    // Confirm dangerous actions
    function setupConfirmations() {
        const dangerousForms = document.querySelectorAll('form[action*="russian"], form[action*="delete"]');
        dangerousForms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                if (!confirm('Are you sure? This action cannot be undone!')) {
                    e.preventDefault();
                }
            });
        });
    }

    // Table row highlighting
    function setupTableHighlighting() {
        const tables = document.querySelectorAll('table');
        tables.forEach(function(table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(function(row) {
                row.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = 'var(--highlight-bg)';
                });
                row.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('highlight')) {
                        this.style.backgroundColor = '';
                    }
                });
            });
        });
    }

    // Socket.IO for real-time features (if available)
    function setupSocket() {
        if (typeof io !== 'undefined') {
            const socket = io();

            socket.on('connect', function() {
                console.log('Connected to server');
            });

            socket.on('user_online', function(data) {
                console.log('User came online:', data.name);
            });

            socket.on('user_offline', function(data) {
                console.log('User went offline:', data.name);
            });

            socket.on('chat_message', function(data) {
                // Handle real-time chat messages if on chat page
                const chatLog = document.getElementById('chat-log');
                if (chatLog) {
                    const msg = document.createElement('p');
                    msg.innerHTML = '<strong>' + data.from + ':</strong> ' + data.message;
                    chatLog.appendChild(msg);
                    chatLog.scrollTop = chatLog.scrollHeight;
                }
            });

            socket.on('announcement', function(data) {
                // Show system announcements
                const terminal = document.querySelector('.terminal');
                if (terminal) {
                    const announcement = document.createElement('div');
                    announcement.className = 'message message-warning';
                    announcement.innerHTML = '<strong>ANNOUNCEMENT:</strong> ' + data.message;
                    terminal.insertBefore(announcement, terminal.firstChild.nextSibling);

                    setTimeout(function() {
                        announcement.remove();
                    }, 10000);
                }
            });

            // Store socket for global access
            window.gameSocket = socket;
        }
    }

    // Initialize everything
    document.addEventListener('DOMContentLoaded', function() {
        // Apply saved screen theme immediately
        applyScreenTheme(currentTheme);

        // Add settings selector (baud + theme)
        document.body.appendChild(createSettingsSelector());

        // Render page with baud simulation (if not unlimited)
        renderPageWithBaud();

        addBlinkingCursor();
        setupMessageAutoHide();
        setupConfirmations();
        setupTableHighlighting();
        setupSocket();
    });

    // Expose utilities globally
    window.ProvingGrounds = {
        typeWriter: typeWriter,
        playSound: playSound,
        getBaudRate: getBaudRate,
        setBaudRate: setBaudRate,
        renderWithBaud: renderWithBaud,
        getScreenTheme: getScreenTheme,
        setScreenTheme: setScreenTheme,
        BAUD_RATES: BAUD_RATES,
        SCREEN_THEMES: SCREEN_THEMES
    };

})();
