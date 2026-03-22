import { AppServer, AppSession, ViewType } from '@mentra/sdk';

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

    // Handle real-time transcription
    // requires microphone permission to be set in the developer console
    session.events.onTranscription((data) => {
      if (data.isFinal) {
        session.layouts.showTextWall("You said: " + data.text, {
          view: ViewType.MAIN,
          durationMs: 5000
        });
      }
      else {
        session.layouts.showTextWall("Transcribing: " + data.text, {
          view: ViewType.MAIN
        });
      }

      if (session.capabilities.hasButton && session.capabilities.button) {
        const buttons = session.capabilities.button

        console.log(`Physical buttons: ${buttons.count || 0}`)

        buttons.buttons?.forEach((button, index) => {
          console.log(`Button ${index}:`)
          console.log(`  Type: ${button.type}`)
          console.log(`  Events: ${button.events.join(", ")}`)
          console.log(`  Capacitive: ${button.isCapacitive || false}`)
        })

        // Subscribe to button events
        session.events.onButtonPress(data => {
          console.log(`Button pressed: ${data.buttonId} (${data.pressType})`)
          // data.buttonId and data.pressType are not yet fully implimented
        })
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