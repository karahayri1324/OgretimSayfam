import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { generateFetXml } from './fet-xml-builder';
import { runFetCl } from './fet-runner';
import { parseFetOutput } from './fet-output-parser';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();

const ALLOWED_ORIGINS = (process.env.FET_ALLOWED_ORIGINS || 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Origin izinli değil'), false);
    },
  }),
);
app.use(express.json({ limit: '2mb' }));

const FET_SHARED_SECRET = process.env.FET_SHARED_SECRET;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!FET_SHARED_SECRET) {
    return next();
  }
  const header = req.headers['x-fet-secret'];
  if (typeof header !== 'string' || header.length !== FET_SHARED_SECRET.length) {
    return res.status(401).json({ success: false, message: 'Kimlik doğrulama başarısız' });
  }
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(FET_SHARED_SECRET);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ success: false, message: 'Kimlik doğrulama başarısız' });
    }
  } catch {
    return res.status(401).json({ success: false, message: 'Kimlik doğrulama başarısız' });
  }
  return next();
}

const TMP_DIR = path.resolve(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

interface GenerationJob {
  status: 'pending' | 'running' | 'completed' | 'failed';
  schoolId: string;
  inputData: any;
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const jobs: Record<string, GenerationJob> = {};
const activeSchoolJobs = new Set<string>();
const MAX_JOBS = 100;
const JOB_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs)) {
    if (job.completedAt && now - new Date(job.completedAt).getTime() > JOB_TTL_MS) {
      delete jobs[id];
    }
  }
  cleanupOrphanTmpDirs();
}, 5 * 60 * 1000);

function cleanupOrphanTmpDirs() {
  try {
    const entries = fs.readdirSync(TMP_DIR, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(TMP_DIR, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch {
        /* yoksay */
      }
    }
  } catch {
    /* yoksay */
  }
}

function sanitizeSchoolId(schoolId: unknown): string | null {
  if (typeof schoolId !== 'string') return null;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(schoolId)) return null;
  return schoolId;
}

function safeJobDir(jobId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) {
    throw new Error('Geçersiz jobId');
  }
  const resolved = path.resolve(TMP_DIR, jobId);
  if (!resolved.startsWith(TMP_DIR + path.sep)) {
    throw new Error('Güvensiz dosya yolu');
  }
  return resolved;
}

let fetClAvailable = false;
try {
  const { execFileSync } = require('child_process');
  execFileSync('which', ['fet-cl'], { encoding: 'utf-8' });
  fetClAvailable = true;
} catch {
  /* fet-cl yok */
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fet-service',
    fetClAvailable,
    activeJobs: Object.keys(jobs).length,
  });
});

app.post('/api/fet/preview-xml', requireAuth, (req, res) => {
  try {
    const xml = generateFetXml(req.body);
    res.type('application/xml').send(xml);
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'XML oluşturma hatası: ' + error.message });
  }
});

app.post('/api/fet/generate', requireAuth, async (req, res) => {
  const { teachers, subjects, classes, rooms, activities, constraints } = req.body;
  const schoolId = sanitizeSchoolId(req.body.schoolId);

  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'Geçersiz veya eksik schoolId' });
  }

  if (Object.keys(jobs).length >= MAX_JOBS) {
    return res
      .status(429)
      .json({ success: false, message: 'Maksimum iş sayısına ulaşıldı. Lütfen daha sonra tekrar deneyin.' });
  }

  if (activeSchoolJobs.has(schoolId)) {
    return res
      .status(409)
      .json({ success: false, message: 'Bu okul için zaten aktif bir oluşturma işi var' });
  }

  const jobId = `${schoolId}_${Date.now()}`;
  jobs[jobId] = {
    status: 'pending',
    schoolId,
    inputData: { schoolId, teachers, subjects, classes, rooms, activities, constraints },
  };
  activeSchoolJobs.add(schoolId);

  res.json({
    success: true,
    message: 'Ders programı oluşturma başlatıldı',
    jobId,
  });

  runGeneration(jobId).catch((err) => {
    console.error(`Job ${jobId} failed:`, err);
  });
});

app.get('/api/fet/status/:jobId', requireAuth, (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ success: false, message: 'İş bulunamadı' });
  }

  res.json({
    success: true,
    data: {
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.status === 'completed' ? job.result : undefined,
    },
  });
});

app.get('/api/fet/result/:jobId', requireAuth, (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ success: false, message: 'İş bulunamadı' });
  }

  if (job.status !== 'completed') {
    return res.json({
      success: false,
      message: `İş henüz tamamlanmadı. Durum: ${job.status}`,
      status: job.status,
    });
  }

  res.json({
    success: true,
    data: job.result,
  });
});

app.post('/api/fet/generate-sync', requireAuth, async (req, res) => {
  const { teachers, subjects, classes, rooms, activities, constraints } = req.body;
  const schoolId = sanitizeSchoolId(req.body.schoolId);

  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'Geçersiz veya eksik schoolId' });
  }

  if (activeSchoolJobs.has(schoolId)) {
    return res
      .status(409)
      .json({ success: false, message: 'Bu okul için zaten aktif bir oluşturma işi var' });
  }
  activeSchoolJobs.add(schoolId);

  let jobDir: string | null = null;
  try {
    const xml = generateFetXml({ teachers, subjects, classes, rooms, activities, constraints });

    jobDir = safeJobDir(`${schoolId}_${Date.now()}`);
    fs.mkdirSync(jobDir, { recursive: true });

    const inputFile = path.join(jobDir, 'input.fet');
    fs.writeFileSync(inputFile, xml, 'utf-8');

    const outputDir = path.join(jobDir, 'output');
    const fetResult = await runFetCl(inputFile, outputDir);

    if (!fetResult.success) {
      return res.json({
        success: false,
        message: 'FET ders programı oluşturamadı: ' + fetResult.error,
        log: fetResult.log,
      });
    }

    const timetable = parseFetOutput(outputDir, activities);

    res.json({
      success: true,
      message: 'Ders programı başarıyla oluşturuldu',
      data: timetable,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Ders programı oluşturma hatası: ' + error.message,
    });
  } finally {
    activeSchoolJobs.delete(schoolId);
    if (jobDir) {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('Geçici dosya temizleme hatası:', cleanupErr instanceof Error ? cleanupErr.message : cleanupErr);
      }
    }
  }
});

app.delete('/api/fet/job/:jobId', requireAuth, (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs[jobId];
  if (!job) {
    return res.status(404).json({ success: false, message: 'İş bulunamadı' });
  }
  activeSchoolJobs.delete(job.schoolId);
  delete jobs[jobId];
  res.json({ success: true, message: 'İş silindi' });
});

async function runGeneration(jobId: string) {
  const job = jobs[jobId];
  if (!job) return;

  job.status = 'running';
  job.startedAt = new Date().toISOString();

  let jobDir: string | null = null;
  try {
    const { teachers, subjects, classes, rooms, activities, constraints } = job.inputData;

    const xml = generateFetXml({ teachers, subjects, classes, rooms, activities, constraints });

    jobDir = safeJobDir(jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const inputFile = path.join(jobDir, 'input.fet');
    fs.writeFileSync(inputFile, xml, 'utf-8');

    const outputDir = path.join(jobDir, 'output');
    const fetResult = await runFetCl(inputFile, outputDir);

    if (!fetResult.success) {
      job.status = 'failed';
      job.error = fetResult.error || 'FET başarısız oldu';
      job.completedAt = new Date().toISOString();
      return;
    }

    const timetable = parseFetOutput(outputDir, activities);

    job.status = 'completed';
    job.result = timetable;
    job.completedAt = new Date().toISOString();
  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date().toISOString();
  } finally {
    activeSchoolJobs.delete(job.schoolId);
    if (jobDir) {
      try {
        fs.rmSync(jobDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('Geçici dosya temizleme hatası:', cleanupErr instanceof Error ? cleanupErr.message : cleanupErr);
      }
    }
  }
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`FET Servisi çalışıyor: http://localhost:${PORT}`);
  if (!FET_SHARED_SECRET) {
    console.warn('FET_SHARED_SECRET tanımlı değil — servis auth-sız çalışıyor (yalnızca dev için).');
  }
});
