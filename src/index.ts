import { AppServer, AppSession, ViewType } from '@mentra/sdk';


const PACKAGE_NAME = '7902be469772748455424581cfd6cb717b7a1d9a1857172f8414c5474633803a';
const MENTRAOS_API_KEY = 'org.home-server.bridge';
const PORT = '13376';

class ExampleMentraOSApp extends AppServer {

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
          durationMs: 3000
        });
      }
    })

    session.events.onGlassesBattery((data) => {
      console.log('Glasses battery:', data);
    })
  }
}

// Start the server
// DEV CONSOLE URL: https://console.mentra.glass/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleMentraOSApp();

app.start().catch(console.error);