import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import { createCanvas, registerFont } from "canvas";
import bmp from "bmp-js";

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();



function canvasToMentraBmp(width: number, height: number, rgba: Uint8ClampedArray) {
  const rowSize = Math.ceil(width / 8);
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelArraySize = paddedRowSize * height;

  const offset = 62;
  const fileSize = offset + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // HEADER
  buffer.write("BM", 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(offset, 10);

  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(1, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  buffer.writeUInt32LE(0x00000000, 54); // black
  buffer.writeUInt32LE(0x00ffffff, 58); // white

  let ptr = offset;

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < rowSize; xByte++) {
      let byte = 0;

      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;

        if (x >= width) continue;

        const i = (y * width + x) * 4;

        // нормальный grayscale
        const gray =
          rgba[i] * 0.3 +
          rgba[i + 1] * 0.59 +
          rgba[i + 2] * 0.11;

        // 👇 ВАЖНО: инверсия под Mentra
        const v = gray > 128 ? 0 : 1;

        byte |= v << (7 - bit);
      }

      buffer[ptr++] = byte;
    }

    while ((ptr - offset) % paddedRowSize !== 0) {
      buffer[ptr++] = 0x00;
    }
  }

  return buffer;
}

function createSquareBmp() {
  const width = 576;
  const height = 135;

  const rowSize = Math.ceil(width / 8);
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelArraySize = paddedRowSize * height;

  const offset = 62;
  const fileSize = offset + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // header
  buffer.write("BM", 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(offset, 10);

  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(1, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  buffer.writeUInt32LE(0x00000000, 54);
  buffer.writeUInt32LE(0x00ffffff, 58);

  let ptr = offset;

  const squareStartX = 200;
  const squareEndX = 376;
  const squareStartY = 30;
  const squareEndY = 105;

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < rowSize; xByte++) {
      let byte = 0;

      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;

        const inside =
          x >= squareStartX &&
          x < squareEndX &&
          y >= squareStartY &&
          y < squareEndY;

        const v = inside ? 1 : 0;

        byte |= v << (7 - bit);
      }

      buffer[ptr++] = byte;
    }

    while ((ptr - offset) % paddedRowSize !== 0) {
      buffer[ptr++] = 0x00;
    }
  }

  return buffer.toString("base64");
}

function createStripesBmp() {
  const width = 576;
  const height = 135;

  const rowSize = Math.ceil(width / 8);
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelArraySize = paddedRowSize * height;

  const offset = 62;
  const fileSize = offset + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // HEADER
  buffer.write("BM", 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(offset, 10);

  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(1, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  buffer.writeUInt32LE(0x00000000, 54);
  buffer.writeUInt32LE(0x00ffffff, 58);

  let ptr = offset;

  const stripeWidth = 16; // ширина полосы

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < rowSize; xByte++) {
      let byte = 0;

      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;

        const stripeIndex = Math.floor(x / stripeWidth);
        const v = stripeIndex % 2 === 0 ? 1 : 0;

        byte |= v << (7 - bit);
      }

      buffer[ptr++] = byte;
    }

    while ((ptr - offset) % paddedRowSize !== 0) {
      buffer[ptr++] = 0x00;
    }
  }

  return buffer.toString("base64");
}

export async function renderTextBitmap(session: AppSession, text: string) {
  const width = 576;
  const height = 135;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // фон
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // текст
  ctx.fillStyle = "black";
  ctx.font = "28px DejaVu Sans";
  ctx.textBaseline = "top";

  ctx.fillText(text, 20, 40);

  const { data } = ctx.getImageData(0, 0, width, height);

  const bmp = canvasToMentraBmp(width, height, data);

  await session.layouts.showBitmapView(bmp.toString("base64"));
}

class Bridge extends AppServer {

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Example App is ready!");
    session.layouts.showDoubleTextWall(
      'Temperature: 72°F',
      'Humidity: 45%'
    );
    // Handle real-time transcription
    // requires microphone permission to be set in the developer console
    session.events.onTranscription(async (data) => {
      if (data.isFinal) {
        session.layouts.showTextWall("You said: " + data.text, {
          view: ViewType.MAIN,
          durationMs: 5000
        });
        await renderTextBitmap(session, "Масло масляное, маслом масляным маслено намазано");
      }
      else {
        session.layouts.showTextWall("Transcribing: " + data.text, {
          view: ViewType.MAIN
        });
      }
    })

    session.events.onButtonPress(data => {
      session.dashboard.content.write('✅ Task completed');
      if (data.pressType === 'long') {
        session.layouts.showTextWall('Что ты выбираешь, когда хочешь сладкого?\n|> ✅Да <|\n\|  ⚠️Нет  |');
      }
      else {
        session.layouts.showTextWall('Что ты выбираешь, когда хочешь сладкого?\n|  Да  |\n\|> Нет <|');
      }
    })
  }
}




const app = new Bridge();
app.start().catch(console.error);

