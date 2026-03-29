
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

interface FetResult {
  success: boolean;
  error?: string;
  log?: string;
  outputDir?: string;
  duration?: number;
}

export function runFetCl(
  inputFile: string,
  outputDir: string,
  timeoutMs: number = 300000
): Promise<FetResult> {
  return new Promise((resolve) => {
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const startTime = Date.now();

    const fetClPath = findFetCl();
    if (!fetClPath) {
      resolve({
        success: false,
        error: 'fet-cl bulunamadı. Lütfen "sudo apt install fet" ile kurun.',
      });
      return;
    }

    console.log(`[FET] Running: ${fetClPath} --inputfile="${inputFile}" --outputdir="${outputDir}"`);

    const child = execFile(
      fetClPath,
      [
        `--inputfile=${inputFile}`,
        `--outputdir=${outputDir}`,
      ],
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 10, 
      },
      (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const log = (stdout || '') + '\n' + (stderr || '');

        if (error) {
          console.error(`[FET] Error:`, error.message);
          console.error(`[FET] Stderr:`, stderr);

          if (error.killed) {
            resolve({
              success: false,
              error: `FET zaman aşımına uğradı (${timeoutMs / 1000}s)`,
              log,
              duration,
            });
            return;
          }

          const outputExists = checkOutputFiles(outputDir);
          if (outputExists) {
            console.log('[FET] Output files found despite error exit code');
            resolve({
              success: true,
              log,
              outputDir,
              duration,
            });
            return;
          }

          resolve({
            success: false,
            error: `FET hatası: ${error.message}`,
            log,
            duration,
          });
          return;
        }

        const outputExists = checkOutputFiles(outputDir);
        if (!outputExists) {
          resolve({
            success: false,
            error: 'FET çıktı dosyaları oluşturulamadı. Kısıtlamaları kontrol edin.',
            log,
            duration,
          });
          return;
        }

        console.log(`[FET] Completed in ${duration}ms`);
        resolve({
          success: true,
          log,
          outputDir,
          duration,
        });
      }
    );
  });
}

function findFetCl(): string | null {
  const possiblePaths = [
    '/usr/bin/fet-cl',
    '/usr/local/bin/fet-cl',
    '/snap/bin/fet-cl',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const { execSync } = require('child_process');
    const result = execSync('which fet-cl', { encoding: 'utf-8' }).trim();
    if (result && fs.existsSync(result)) return result;
  } catch {}

  return null;
}

function checkOutputFiles(outputDir: string): boolean {
  try {
    
    const files = findXmlFiles(outputDir);
    return files.length > 0;
  } catch {
    return false;
  }
}

function findXmlFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findXmlFiles(fullPath));
    } else if (entry.name.endsWith('.xml')) {
      results.push(fullPath);
    }
  }

  return results;
}
