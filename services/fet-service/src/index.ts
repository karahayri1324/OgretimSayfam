import express from 'express';
import cors from 'cors';
import { generateFetXml } from './fet-xml-builder';
import { runFetCl } from './fet-runner';
import { parseFetOutput } from './fet-output-parser';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure tmp directory exists
const TMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// In-memory storage for generation jobs
interface GenerationJob {
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputData: any;
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const jobs: Record<string, GenerationJob> = {};

// Health check
app.get('/health', (_req, res) => {
  // Check if fet-cl is available
  const { execSync } = require('child_process');
  let fetAvailable = false;
  try {
    execSync('which fet-cl', { encoding: 'utf-8' });
    fetAvailable = true;
  } catch {}

  res.json({
    status: 'ok',
    service: 'fet-service',
    fetClAvailable: fetAvailable,
    activeJobs: Object.keys(jobs).length,
  });
});

// Generate FET XML preview (without running FET)
app.post('/api/fet/preview-xml', (req, res) => {
  try {
    const xml = generateFetXml(req.body);
    res.type('application/xml').send(xml);
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'XML oluşturma hatası: ' + error.message });
  }
});

// Start timetable generation
app.post('/api/fet/generate', async (req, res) => {
  const { schoolId, teachers, subjects, classes, rooms, activities, constraints } = req.body;

  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'schoolId gerekli' });
  }

  // Create a job
  const jobId = `${schoolId}_${Date.now()}`;
  jobs[jobId] = {
    status: 'pending',
    inputData: { schoolId, teachers, subjects, classes, rooms, activities, constraints },
  };

  // Return job ID immediately
  res.json({
    success: true,
    message: 'Ders programı oluşturma başlatıldı',
    jobId,
  });

  // Run generation in background
  runGeneration(jobId).catch((err) => {
    console.error(`Job ${jobId} failed:`, err);
  });
});

// Check generation status
app.get('/api/fet/status/:jobId', (req, res) => {
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

// Get generation result
app.get('/api/fet/result/:jobId', (req, res) => {
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

// Synchronous generation (waits for result)
app.post('/api/fet/generate-sync', async (req, res) => {
  const { schoolId, teachers, subjects, classes, rooms, activities, constraints } = req.body;

  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'schoolId gerekli' });
  }

  try {
    // Generate FET XML
    const xml = generateFetXml({ teachers, subjects, classes, rooms, activities, constraints });

    // Create temp directory for this job
    const jobDir = path.join(TMP_DIR, `${schoolId}_${Date.now()}`);
    fs.mkdirSync(jobDir, { recursive: true });

    // Write input file
    const inputFile = path.join(jobDir, 'input.fet');
    fs.writeFileSync(inputFile, xml, 'utf-8');

    // Run FET
    const outputDir = path.join(jobDir, 'output');
    const fetResult = await runFetCl(inputFile, outputDir);

    if (!fetResult.success) {
      return res.json({
        success: false,
        message: 'FET ders programı oluşturamadı: ' + fetResult.error,
        log: fetResult.log,
      });
    }

    // Parse output (pass activities so parser can map IDs to teacher/subject/class)
    const timetable = parseFetOutput(outputDir, activities);

    // Cleanup
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}

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
  }
});

// Delete a job
app.delete('/api/fet/job/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  if (jobs[jobId]) {
    delete jobs[jobId];
    res.json({ success: true, message: 'İş silindi' });
  } else {
    res.status(404).json({ success: false, message: 'İş bulunamadı' });
  }
});

// Background generation function
async function runGeneration(jobId: string) {
  const job = jobs[jobId];
  if (!job) return;

  job.status = 'running';
  job.startedAt = new Date().toISOString();

  try {
    const { schoolId, teachers, subjects, classes, rooms, activities, constraints } = job.inputData;

    // Generate FET XML
    const xml = generateFetXml({ teachers, subjects, classes, rooms, activities, constraints });

    // Create temp directory
    const jobDir = path.join(TMP_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Write input file
    const inputFile = path.join(jobDir, 'input.fet');
    fs.writeFileSync(inputFile, xml, 'utf-8');

    // Run FET
    const outputDir = path.join(jobDir, 'output');
    const fetResult = await runFetCl(inputFile, outputDir);

    if (!fetResult.success) {
      job.status = 'failed';
      job.error = fetResult.error || 'FET başarısız oldu';
      job.completedAt = new Date().toISOString();
      return;
    }

    // Parse output (pass activities so parser can map IDs to teacher/subject/class)
    const timetable = parseFetOutput(outputDir, activities);

    // Cleanup
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}

    job.status = 'completed';
    job.result = timetable;
    job.completedAt = new Date().toISOString();
  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date().toISOString();
  }
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🗓️ FET Servisi çalışıyor: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/api/fet/`);
});
