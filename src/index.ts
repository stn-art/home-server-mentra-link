import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import { createCanvas } from "canvas";
import bmp from "bmp-js";

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();

function createTestBmp() {
  const width = 576;
  const height = 135;

  const rowSize = Math.ceil(width / 8);
  const paddedRowSize = Math.ceil(rowSize / 4) * 4;
  const pixelArraySize = paddedRowSize * height;

  const offset = 62;
  const fileSize = offset + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // BMP HEADER
  buffer.write("BM", 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(offset, 10);

  // DIB HEADER
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(1, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  // palette (важно!)
  buffer.writeUInt32LE(0x00ffffff, 54); // white
  buffer.writeUInt32LE(0x00000000, 58); // black

  let ptr = offset;

 for (let i = 0; i < paddedRowSize; i++) {
  buffer[ptr++] = 0x00; // ← это правильный "чёрный"
}

  return buffer;
}

export async function renderTextBitmap(
  session: AppSession,
  text: string
) {
  const bmp = createTestBmp();
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

