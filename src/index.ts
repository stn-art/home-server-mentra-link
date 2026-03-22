import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import { createCanvas } from "canvas";
import bmp from "bmp-js";

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();

function createGrayBmp(width: number, height: number, rgba: Uint8ClampedArray) {
  const rowSize = width; // 1 byte per pixel
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelArraySize = paddedRowSize * height;

  const pixelDataOffset = 54 + 256 * 4; // header + palette
  const fileSize = pixelDataOffset + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // BMP HEADER
  buffer.write("BM");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(pixelDataOffset, 10);

  // DIB HEADER
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(8, 28); // ✅ 8-bit
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  // 🎨 GRAYSCALE PALETTE (256 цветов)
  for (let i = 0; i < 256; i++) {
    const offset = 54 + i * 4;
    buffer[offset] = i;     // B
    buffer[offset + 1] = i; // G
    buffer[offset + 2] = i; // R
    buffer[offset + 3] = 0;
  }

  let offset = pixelDataOffset;

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const gray =
        (rgba[i] * 0.3 +
          rgba[i + 1] * 0.59 +
          rgba[i + 2] * 0.11) | 0;

      buffer[offset++] = gray;
    }

    while ((offset - pixelDataOffset) % paddedRowSize !== 0) {
      buffer[offset++] = 0;
    }
  }

  return buffer;
}

export async function renderTextBitmap(
  session: AppSession,
  text: string
) {
  const width = 576;
  const height = 135;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // фон
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  // текст
  ctx.fillStyle = "white";
  ctx.font = "28px sans-serif";
  ctx.textBaseline = "top";

  const maxWidth = 620;
  const lineHeight = 32;

  let x = 10;
  let y = 10;
  let line = "";

  for (const word of text.split(" ")) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }

  ctx.fillText(line, x, y);

  const { data } = ctx.getImageData(0, 0, width, height);
  const bmpBuffer = createGrayBmp(width, height, data);
  const base64 = bmpBuffer.toString("base64");

  await session.layouts.showBitmapView(base64);
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

