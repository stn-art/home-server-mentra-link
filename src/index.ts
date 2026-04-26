import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import * as fs from 'fs';
import * as path from 'path';
const wav = require('@dosy/wav');


const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set'); })();
const PORT = parseInt(process.env.PORT) ?? (() => { throw new Error('PORT is not set'); })();

const INDIVIDUAL_DIR = './data';
const COMMON_FILE = './data/all_audio_chunks.raw'; // общий файл

// Открываем поток для записи в общий файл (флаг 'a' — дозапись)
const commonWriteStream = fs.createWriteStream(COMMON_FILE, { flags: 'a' });


function getFileName(date: Date): string {
  // Пример: chunk_2025-02-20T14-35-22-123.raw
  const iso = date.toISOString().replace(/:/g, '-').replace(/\./g, '-');
  return `chunk_${iso}.raw`;
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
    session.layouts.showTextWall("ЗАПУСК");
    session.events.onAudioChunk((audioChunk: AudioChunk) => {
      const { arrayBuffer, timestamp } = audioChunk;
      const buffer = Buffer.from(arrayBuffer);
      commonWriteStream.write(buffer, (err) => {
        if (err) console.error('Ошибка записи в общий файл:', err);
      });
    });

    session.events.onTranscription(async (data) => {
      if (data.isFinal) {

      }
    })
  }
}


process.on('exit', () => {
  commonWriteStream.end();
  const writer = new wav.FileWriter('./data/output_all_chunks.wav', {
    channels: 1,
    sampleRate: 16000,
    bitDepth: 16
  });

  const pcmStream = fs.createReadStream('./data/all_audio_chunks.raw');
  pcmStream.pipe(writer); // Поток сам добавит заголовок и завершит файл
});
// Также обрабатываем SIGINT и другие сигналы
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => {
    commonWriteStream.end();
    process.exit();
  });
});


const app = new Bridge();
app.start().catch(console.error);

