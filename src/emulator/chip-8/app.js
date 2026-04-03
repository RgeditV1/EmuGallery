/**
 * EmuGallery: Main App Logic
 */

const cpu = new CPU();
const canvas = document.getElementById('chip8');
const ctx = canvas.getContext('2d');
const scale = 10;

let loopId = null;
let audioCtx = null;
let oscillator = null;

// mada de teclas (PC Key -> CHIP-8 Key)
const KEY_MAP = {
    '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
    'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
    'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
    'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
};

// --- Manejo de Teclado ---
window.addEventListener('keydown', (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (key !== undefined) {
        cpu.key[key] = 1;
    }
});

window.addEventListener('keyup', (e) => {
    const key = KEY_MAP[e.key.toLowerCase()];
    if (key !== undefined) {
        cpu.key[key] = 0;
    }
});

// --- Manejo de Sonido ---
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBeep() {
    if (!audioCtx) return;
    if (oscillator) return;

    oscillator = audioCtx.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
}

function stopBeep() {
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
}

// --- Ciclo Principal ---
function mainLoop() {
    // Corremos unas cuantas instrucciones por cada frame para alcanzar ~600Hz
    for (let i = 0; i < 11; i++) {
        const opcode = cpu.fetch();
        cpu.execute(opcode);
    }

    cpu.updateTimers();

    // Sonido
    if (cpu.soundTimer > 0) {
        playBeep();
    } else {
        stopBeep();
    }

    cpu.render(ctx, scale);
    loopId = requestAnimationFrame(mainLoop);
}

// --- Carga de ROM ---
async function loadROM(url) {
    initAudio();
    if (loopId) cancelAnimationFrame(loopId);

    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const romData = new Uint8Array(buffer);

        cpu.load(romData);
        mainLoop();
    } catch (e) {
        console.error("Error cargando la ROM:", e);
        alert("No se pudo cargar la ROM. Asegúrate de que el archivo exista.");
    }
}

// --- Inicializar Galería ---
function initGallery() {
    const gallery = document.getElementById('rom-gallery');
    roms.forEach(rom => {
        const card = document.createElement('div');
        card.className = 'rom-card';
        card.innerHTML = `
            <h3>${rom.name}</h3>
            <p>${rom.desc}</p>
        `;
        card.onclick = () => loadROM(rom.file);
        gallery.appendChild(card);
    });
}

// Empezamos!
window.onload = () => {
    try {
        initGallery();
    } catch (e) {
        alert("Error en inicialización: " + e.message + "\nAsegúrate de haber refrescado la página sin caché (Ctrl+F5).");
    }
};
