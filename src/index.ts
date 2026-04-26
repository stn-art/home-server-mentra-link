import { AppServer, AppSession, ViewType } from '@mentra/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as wav from 'wav';


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

function rawToWav(
  rawPcmPath: string,
  wavPath: string,
  sampleRate: number = 16000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): void {
  const pcmData = fs.readFileSync(rawPcmPath);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const totalSize = 36 + dataSize;

  const buffer = Buffer.alloc(44);
  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize, 4);
  buffer.write('WAVE', 8);
  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // размер fmt (16 байт)
  buffer.writeUInt16LE(1, 20);        // аудио формат (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Объединяем заголовок и PCM данные
  const wavBuffer = Buffer.concat([buffer, pcmData]);
  fs.writeFileSync(wavPath, wavBuffer);
  console.log(`✅ WAV файл создан: ${wavPath} (${dataSize} байт PCM, ${totalSize + 8} байт всего)`);
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
  rawToWav('./data/all_audio_chunks.raw', './data/output_all_chunks.wav', 16000);
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
