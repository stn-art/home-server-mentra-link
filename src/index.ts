import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import { createCanvas } from "canvas";

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();

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
        await renderTextToBitmap("Масло масляное, маслом масляным маслено намазано", session);
      }
      else {
        session.layouts.showTextWall("Transcribing: " + data.text, {
          view: ViewType.MAIN
        });
      }
      session.layouts.showTextWall('Что ты выбираешь, когда хочешь сладкого?\n|> ✅Да <|\n\|  ⚠️Нет  |');
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


async function renderTextToBitmap(text, session) {
  const width = 640;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // фон
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

  // текст
  ctx.fillStyle = "white";
  ctx.font = "24px sans-serif";
  ctx.textBaseline = "top";

  const maxWidth = 380;
  const lineHeight = 28;
  let x = 10;
  let y = 10;

  const words = text.split(" ");
  let line = "";

  for (let word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth) {
      ctx.fillText(line, x, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);

  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data;

  const bitmap = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];

    bitmap[i] = (r + g + b) / 3 > 128 ? 255 : 0;
  }

  await session.layouts.showBitmapView({
    width,
    height,
    bitmap
  });
}

const app = new Bridge();
app.start().catch(console.error);

