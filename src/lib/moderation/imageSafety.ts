// Blocks a listing photo before it's ever stored, using AWS Rekognition's
// moderation labels. Requires AWS_REKOGNITION_ACCESS_KEY_ID,
// AWS_REKOGNITION_SECRET_ACCESS_KEY, and AWS_REKOGNITION_REGION — if any is
// missing, or the API call itself fails, moderation is skipped rather than
// blocking listing creation over a missing key or a transient outage.

import {
  RekognitionClient,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";

// Rekognition's moderation labels are hierarchical (e.g. "Explicit Nudity" >
// "Nudity", "Violence" > "Weapons"). Blocking on the top-level parent
// categories catches their children too, without listing every leaf label.
const BLOCKED_TOP_LEVEL_CATEGORIES = [
  "Explicit Nudity",
  "Violence",
  "Weapons",
  "Drugs",
  "Tobacco",
  "Alcohol",
  "Gambling",
  "Hate Symbols",
];

// Below this score (0-100), a match is too uncertain to act on — kept fairly
// high to avoid false positives on ordinary product photos.
const MIN_CONFIDENCE = 75;

export type ImageSafetyResult = { blocked: false } | { blocked: true; reason: string };

function getClient(): RekognitionClient | null {
  const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REKOGNITION_REGION;
  if (!accessKeyId || !secretAccessKey || !region) {
    return null;
  }
  return new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function checkImageSafety(imageBytes: Buffer): Promise<ImageSafetyResult> {
  const client = getClient();
  if (!client) {
    return { blocked: false };
  }

  let labels;
  try {
    const result = await client.send(
      new DetectModerationLabelsCommand({
        Image: { Bytes: imageBytes },
        MinConfidence: MIN_CONFIDENCE,
      })
    );
    labels = result.ModerationLabels ?? [];
  } catch (err) {
    console.error("Rekognition request failed:", err);
    return { blocked: false };
  }

  for (const label of labels) {
    // ParentName is empty on a top-level label itself (e.g. "Violence" is
    // its own parent), so check both the label's own name and its parent.
    const topLevel = label.ParentName || label.Name;
    if (topLevel && BLOCKED_TOP_LEVEL_CATEGORIES.includes(topLevel)) {
      return {
        blocked: true,
        reason: `One of your photos was flagged as ${topLevel.toLowerCase()} and can't be uploaded.`,
      };
    }
  }

  return { blocked: false };
}
