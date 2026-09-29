// Blocks a listing photo before it's ever stored, using AWS Rekognition's
// moderation labels. Requires AWS_REKOGNITION_ACCESS_KEY_ID,
// AWS_REKOGNITION_SECRET_ACCESS_KEY, and AWS_REKOGNITION_REGION — if any is
// missing, or the API call itself fails, moderation is skipped rather than
// blocking listing creation over a missing key or a transient outage.

import {
  RekognitionClient,
  DetectModerationLabelsCommand,
} from "@aws-sdk/client-rekognition";

// Top-level categories to block, and how each is described to the seller.
// The names must match Rekognition's moderation taxonomy exactly — a name
// that doesn't match blocks nothing, silently. These are from model 7.0,
// which renamed several older ones (e.g. "Drugs" and "Tobacco" became
// "Drugs & Tobacco"): https://docs.aws.amazon.com/rekognition/latest/dg/moderation-api.html
// Blocking a top-level category covers everything under it, e.g. "Violence"
// includes "Weapons" and "Explicit" includes "Explicit Nudity".
const BLOCKED_CATEGORIES = new Map([
  ["Explicit", "explicit content"],
  ["Violence", "violence or weapons"],
  ["Drugs & Tobacco", "drugs or tobacco"],
  ["Alcohol", "alcohol"],
  ["Gambling", "gambling"],
  ["Hate Symbols", "hate symbols"],
]);

// A newer model may rename categories again, so a response from any other
// version is logged as a prompt to recheck the names above.
const EXPECTED_MODEL_VERSION = "7.0";

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
    if (result.ModerationModelVersion !== EXPECTED_MODEL_VERSION) {
      console.warn(
        `Rekognition moderation model is ${result.ModerationModelVersion}, expected ${EXPECTED_MODEL_VERSION} — check BLOCKED_CATEGORIES still matches its label names.`
      );
    }
  } catch (err) {
    console.error("Rekognition request failed:", err);
    return { blocked: false };
  }

  // A match comes back once per level of the taxonomy, e.g. "Smoking", its
  // parent "Drugs & Tobacco Paraphernalia & Use", and the top-level "Drugs &
  // Tobacco" itself (whose ParentName is ""). So the top-level category shows
  // up as some label's own name — its parent's name is checked too, in case
  // a response ever leaves the top-level entry out.
  for (const label of labels) {
    for (const name of [label.Name, label.ParentName]) {
      const description = name && BLOCKED_CATEGORIES.get(name);
      if (description) {
        return {
          blocked: true,
          reason: `One of your photos was flagged for ${description} and can't be uploaded.`,
        };
      }
    }
  }

  return { blocked: false };
}
