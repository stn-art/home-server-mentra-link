import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import { createCanvas } from "canvas";
import bmp from "bmp-js";

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();

function createRawMentraBitmap() {
  const width = 576;
  const height = 135;

  const size = width * height;
  const buffer = Buffer.alloc(size);

  // левая половина чёрная, правая белая
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      buffer[i] = x < width / 2 ? 0 : 255;
    }
  }

  return buffer.toString("base64");
}

export async function renderTextBitmap(
  session: AppSession,
  text: string
) {
await session.layouts.showBitmapView(createRawMentraBitmap());
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

