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
          durationMs: 3000
        });
      }
    })

    session.events.onButtonPress(data => {
      session.layouts.showTextWall(`Button ${data.buttonId} was ${data.pressType} pressed`)
      if (data.pressType === 'long') {
        session.layouts.showReferenceCard(
          'Chocolate Chip Cookies',
          '2 cups flour\n1 cup sugar\n1/2 cup butter\n2 eggs\n1 tsp vanilla\n2 cups chocolate chips\n\nMix ingredients. Bake at 350°F for 10-12 minutes.'
        );
      }
      else {
        // Show current temperature in the dashboard
        session.layouts.showDashboardCard('Temperature', '72°F');

        // Show stock price in the main view
        session.layouts.showDashboardCard('AAPL', '$178.72', {
          view: ViewType.MAIN
        });
      }
    })
  }
}

const app = new Bridge();
app.start().catch(console.error);