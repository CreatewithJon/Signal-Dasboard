import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function compressWithCloudConvert(file: File, apiKey: string): Promise<Blob> {
  // Step 1: Create a job with import → convert → export tasks
  const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-audio": {
          operation: "convert",
          input: "import-file",
          output_format: "mp3",
          audio_codec: "mp3",
          audio_bitrate: 64,
        },
        "export-file": {
          operation: "export/url",
          input: "convert-audio",
        },
      },
    }),
  });

  if (!jobRes.ok) {
    const err = await jobRes.text();
    throw new Error(`CloudConvert job creation failed: ${err}`);
  }

  const jobData = await jobRes.json();
  const jobId: string = jobData.data.id;
  const importTask = jobData.data.tasks.find((t: { operation: string }) => t.operation === "import/upload");

  if (!importTask?.result?.form) {
    throw new Error("CloudConvert upload form not found in response");
  }

  // Step 2: Upload the file to CloudConvert
  const { url: uploadUrl, parameters } = importTask.result.form;
  const uploadForm = new FormData();
  for (const [key, value] of Object.entries(parameters as Record<string, string>)) {
    uploadForm.append(key, value);
  }
  uploadForm.append("file", file, file.name);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: uploadForm });
  if (!uploadRes.ok) {
    throw new Error(`CloudConvert upload failed: ${uploadRes.status}`);
  }

  // Step 3: Poll until the job is finished
  let outputUrl: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const statusData = await statusRes.json();
    const status: string = statusData.data.status;

    if (status === "finished") {
      const exportTask = statusData.data.tasks.find((t: { operation: string }) => t.operation === "export/url");
      outputUrl = exportTask?.result?.files?.[0]?.url ?? null;
      break;
    }
    if (status === "error") {
      throw new Error("CloudConvert conversion failed");
    }
  }

  if (!outputUrl) throw new Error("CloudConvert: no output URL after conversion");

  // Step 4: Download the compressed MP3
  const mp3Res = await fetch(outputUrl);
  if (!mp3Res.ok) throw new Error("Failed to download compressed audio");
  return await mp3Res.blob();
}

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const cloudconvertKey = process.env.CLOUDCONVERT_API_KEY;

  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  // Determine what to send to Whisper
  let audioBlob: Blob = file;
  let audioName = file.name;
  let compressed = false;

  if (file.size > 24 * 1024 * 1024) {
    if (!cloudconvertKey) {
      return NextResponse.json({
        error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — over the 25MB limit. Add a CLOUDCONVERT_API_KEY to .env.local to enable automatic compression.`,
      }, { status: 400 });
    }
    try {
      audioBlob = await compressWithCloudConvert(file, cloudconvertKey);
      audioName = file.name.replace(/\.[^.]+$/, ".mp3");
      compressed = true;
    } catch (err) {
      return NextResponse.json({
        error: `Auto-compression failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 502 });
    }
  }

  // Send to Whisper
  const whisperForm = new FormData();
  whisperForm.append("file", audioBlob, audioName);
  whisperForm.append("model", "whisper-1");
  whisperForm.append("response_format", "verbose_json");
  whisperForm.append("timestamp_granularities[]", "segment");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: whisperForm,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Whisper error: ${err}` }, { status: 502 });
    }

    const data = await response.json();
    const segments: TranscriptSegment[] = (data.segments ?? []).map(
      (s: { start: number; end: number; text: string }) => ({
        start: Math.round(s.start * 10) / 10,
        end: Math.round(s.end * 10) / 10,
        text: s.text.trim(),
      })
    );

    return NextResponse.json({ segments, fullText: data.text ?? "", compressed });
  } catch (err) {
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
