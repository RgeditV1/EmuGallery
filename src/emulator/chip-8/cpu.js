/*
* CPU CHIP-8
*/


/*
 Que es un opcode?
 Un opcode es un codigo que representa una instruccion que debe ejecutar la CPU.

Que es un nibble?
 Un nibble es un grupo de 4 bits.

Que es un byte?
 Un byte es un grupo de 8 bits.

Que es un word?
 Un word es un grupo de 16 bits.


*/

const FONTSET = [
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xF0, 0x80, 0x90, 0x80, 0xF0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0x80, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

class CPU {
    constructor() {
        // Memoria: 4096 bytes (4KB)
        this.memory = new Uint8Array(4096);

        // Registros: 16 de 8 bits (V0 a VF)
        this.v = new Uint8Array(16);

        // Registro de índice (I) y Program Counter (PC)
        this.i = 0;
        this.pc = 0x200; // Los juegos empiezan en la dirección 0x200

        // Stack y Stack Pointer
        this.stack = new Uint16Array(16);
        this.sp = 0;

        // Temporizadores
        this.delayTimer = 0;
        this.soundTimer = 0;

        // Pantalla (64x32 píxeles)
        this.display = new Uint8Array(64 * 32);

        // Teclado (16 teclas)
        this.key = new Uint8Array(16);

        // Cargar fuente en memoria (direcciones 0x000 a 0x1FF)
        for (let i = 0; i < FONTSET.length; i++) {
            this.memory[i] = FONTSET[i];
        }
    }

    // Obtiene el opcode actual
    fetch() {
        // El opcode es un grupo de 16 bits, que se divide en 2 bytes.
        // El primer byte es el byte mas significativo.
        // El segundo byte es el byte menos significativo.
        const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
        // Se incrementa el program counter en 2 para apuntar al siguiente opcode.
        this.pc += 2;
        return opcode; // Retorna el opcode actual.
    }

    // Decodifica el opcode
    decode(opcode) {
        const nibbles = {
            op: (opcode >> 12) & 0xF,
            x: (opcode >> 8) & 0xF,
            y: (opcode >> 4) & 0xF,
            n: opcode & 0xF,
            nn: opcode & 0xFF,
            nnn: opcode & 0xFFF
        };
        return nibbles;
    }

    // Ejecuta un opcode
    execute(opcode) {
        const { op, x, y, n, nn, nnn } = this.decode(opcode);
        switch (op) {
            case 0x0:
                if (nnn === 0x0E0) {
                    this.display.fill(0);
                } else if (nnn === 0x0EE) { // RETORNO
                    this.sp--;
                    this.pc = this.stack[this.sp];
                }
                break;
            case 0x1:
                this.pc = nnn;
                break;
            case 0x2:
                this.stack[this.sp] = this.pc;
                this.sp++;
                this.pc = nnn;
                break;
            case 0x3:
                if (this.v[x] === nn) {
                    this.pc += 2;
                }
                break;
            case 0x4: // 4XNN: Skip if VX != NN
                if (this.v[x] !== nn) {
                    this.pc += 2;
                }
                break;
            case 0x5:
                if (this.v[x] === this.v[y]) {
                    this.pc += 2;
                }
                break;
            case 0x6:
                this.v[x] = nn;
                break;
            case 0x7:
                this.v[x] += nn;
                break;
            case 0x8:
                switch (n) {
                    case 0x0:
                        this.v[x] = this.v[y];
                        break;
                    case 0x1:
                        this.v[x] |= this.v[y];
                        break;
                    case 0x2:
                        this.v[x] &= this.v[y];
                        break;
                    case 0x3:
                        this.v[x] ^= this.v[y];
                        break;
                    case 0x4: // 8XY4: ADD VX, VY (Affects VF)
                        let sum = this.v[x] + this.v[y];
                        this.v[0xF] = (sum > 0xFF) ? 1 : 0;
                        this.v[x] = sum & 0xFF;
                        break;
                    case 0x5: // 8XY5: SUB VX, VY (Affects VF)
                        this.v[0xF] = (this.v[x] > this.v[y]) ? 1 : 0;
                        this.v[x] -= this.v[y];
                        break;
                    case 0x6: // 8XY6: Shift Right
                        this.v[0xF] = this.v[x] & 0x1;
                        this.v[x] >>= 1;
                        break;
                    case 0x7: // 8XY7: SUBN VX, VY (Affects VF)
                        this.v[0xF] = (this.v[y] > this.v[x]) ? 1 : 0;
                        this.v[x] = this.v[y] - this.v[x];
                        break;
                    case 0xE: // 8XYE: Shift Left
                        this.v[0xF] = (this.v[x] & 0x80) >> 7;
                        this.v[x] <<= 1;
                        break;
                }
                break;
            case 0x9:
                if (this.v[x] !== this.v[y]) {
                    this.pc += 2;
                }
                break;
            case 0xA:
                this.i = nnn;
                break;
            case 0xB:
                this.pc = nnn + this.v[0];
                break;
            case 0xC:
                this.v[x] = Math.floor(Math.random() * 256) & nn;
                break;
            case 0xD:
                this.draw(this.v[x], this.v[y], n);
                break;
            case 0xE:
                switch (nn) {
                    case 0x9E:
                        if (this.key[this.v[x]]) {
                            this.pc += 2;
                        }
                        break;
                    case 0xA1:
                        if (!this.key[this.v[x]]) {
                            this.pc += 2;
                        }
                        break;
                }
                break;
            case 0xF:
                switch (nn) {
                    case 0x07:
                        this.v[x] = this.delayTimer;
                        break;
                    case 0x0A:
                        let key = this.waitKey();
                        if (key !== null) {
                            this.v[x] = key;
                        }
                        break;
                    case 0x15:
                        this.delayTimer = this.v[x];
                        break;
                    case 0x18:
                        this.soundTimer = this.v[x];
                        break;
                    case 0x1E:
                        this.i += this.v[x];
                        break;
                    case 0x29:
                        this.i = this.v[x] * 5;
                        break;
                    case 0x33:
                        this.memory[this.i] = Math.floor(this.v[x] / 100);
                        this.memory[this.i + 1] = Math.floor((this.v[x] % 100) / 10);
                        this.memory[this.i + 2] = this.v[x] % 10;
                        break;
                    case 0x55:
                        for (let j = 0; j <= x; j++) {
                            this.memory[this.i + j] = this.v[j];
                        }
                        break;
                    case 0x65:
                        for (let j = 0; j <= x; j++) {
                            this.v[j] = this.memory[this.i + j];
                        }
                        break;
                }
                break;
        }
    }

    // Carga la ROM en la memoria
    load(romBuffer) {
        this.reset();
        for (let i = 0; i < romBuffer.length; i++) {
            this.memory[0x200 + i] = romBuffer[i];
        }
    }

    // Reinicia el estado de la CPU
    reset() {
        this.v.fill(0);
        this.i = 0;
        this.pc = 0x200;
        this.stack.fill(0);
        this.sp = 0;
        this.delayTimer = 0;
        this.soundTimer = 0;
        this.display.fill(0);
    }

    // Dibuja el estado de la pantalla en un canvas
    render(ctx, scale) {
        ctx.clearRect(0, 0, 64 * scale, 32 * scale);
        ctx.fillStyle = '#00FF41'; // Verde matriz clásica

        for (let i = 0; i < 64 * 32; i++) {
            if (this.display[i]) {
                let x = (i % 64) * scale;
                let y = Math.floor(i / 64) * scale;
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }

    draw(x, y, height) {
        let xPos = x % 64;
        let yPos = y % 32;
        this.v[0xF] = 0; // Reset colisión

        for (let row = 0; row < height; row++) {
            let spriteByte = this.memory[this.i + row];
            for (let col = 0; col < 8; col++) {
                let spritePixel = spriteByte & (0x80 >> col);
                if (spritePixel !== 0) {
                    let screenIndex = (xPos + col) + (yPos + row) * 64;

                    // Si el píxel en pantalla ya está encendido, hay colisión (XOR)
                    if (this.display[screenIndex] === 1) this.v[0xF] = 1;

                    this.display[screenIndex] ^= 1;
                }
            }
        }
    }

    updateTimers() {
        if (this.delayTimer > 0) this.delayTimer--;
        if (this.soundTimer > 0) {
            // Aquí dispararías el sonido
            this.soundTimer--;
        }
    }

    waitKey() {
        for (let i = 0; i < 16; i++) {
            if (this.key[i]) {
                return i; // Retorna el índice de la tecla presionada
            }
        }
        // Si ninguna tecla está presionada, "pausamos" la CPU
        // retrocediendo el PC para que vuelva a ejecutar esta instrucción
        this.pc -= 2;
        return null;
    }
}